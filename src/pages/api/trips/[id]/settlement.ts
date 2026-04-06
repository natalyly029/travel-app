import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { Member, Payment, Settlement } from '@/types';

type ResponseData = {
  data?: {
    settlements: Settlement[];
    memberBalances: Record<string, { paid: number; fairShare: number; balance: number }>;
    totalAmount: number;
  };
  error?: string;
};

type PaymentAllocationRow = {
  payment_id: string;
  member_id: string;
};

type SettlementTransferRow = {
  from_member_id: string;
  to_member_id: string;
  amount: number;
  is_completed?: boolean;
  completed_at?: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid trip ID' });
  }

  if (req.method === 'GET') {
    return handleCalculateSettlement(id, res);
  }

  if (req.method === 'PUT') {
    return handleCompleteSettlement(id, req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}

async function handleCalculateSettlement(
  tripId: string,
  res: NextApiResponse<ResponseData>
) {
  try {
    const [membersResult, paymentsResult] = await Promise.all([
      supabase.from('members').select('*').eq('trip_id', tripId),
      supabase.from('payments').select('*').eq('trip_id', tripId),
    ]);

    const { data: members, error: membersError } = membersResult;
    const { data: payments, error: paymentsError } = paymentsResult;

    if (membersError || !members) {
      return res.status(500).json({ error: 'Failed to fetch members' });
    }

    if (paymentsError || !payments) {
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }

    const paymentIds = payments.map((payment) => payment.id);
    let allocations: PaymentAllocationRow[] = [];

    if (paymentIds.length > 0) {
      const { data: allocationData, error: allocationError } = await supabase
        .from('payment_allocations')
        .select('payment_id, member_id')
        .in('payment_id', paymentIds);

      if (allocationError) {
        return res.status(500).json({ error: 'Failed to fetch payment allocations' });
      }

      allocations = (allocationData || []) as PaymentAllocationRow[];
    }

    const { data: transferData, error: transferError } = await supabase
      .from('settlement_transfers')
      .select('from_member_id, to_member_id, amount, is_completed, completed_at')
      .eq('trip_id', tripId);

    if (transferError) {
      return res.status(500).json({ error: 'Failed to fetch settlement transfers' });
    }

    const settlement = calculateSettlement(
      members as Member[],
      payments as Payment[],
      allocations,
      (transferData || []) as SettlementTransferRow[]
    );

    res.status(200).json({ data: settlement });
  } catch (err) {
    console.error('Settlement calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate settlement' });
  }
}

function calculateSettlement(
  members: Member[],
  payments: Payment[],
  allocations: PaymentAllocationRow[],
  transfers: SettlementTransferRow[]
) {
  const paidByMember: Record<string, number> = {};
  const fairShareByMember: Record<string, number> = {};
  let totalAmount = 0;

  members.forEach((member) => {
    paidByMember[member.id] = 0;
    fairShareByMember[member.id] = 0;
  });

  const allocationMap = new Map<string, PaymentAllocationRow[]>();
  allocations.forEach((allocation) => {
    const current = allocationMap.get(allocation.payment_id) || [];
    current.push(allocation);
    allocationMap.set(allocation.payment_id, current);
  });

  payments.forEach((payment) => {
    const amount = typeof payment.amount === 'number' ? payment.amount : 0;
    paidByMember[payment.payer_id] = (paidByMember[payment.payer_id] || 0) + amount;
    totalAmount += amount;

    const billedMembers = allocationMap.get(payment.id) || [];
    const shareTargets = billedMembers.length > 0 ? billedMembers.map((allocation) => allocation.member_id) : members.map((member) => member.id);
    const sharePerMember = shareTargets.length > 0 ? amount / shareTargets.length : 0;

    shareTargets.forEach((memberId) => {
      fairShareByMember[memberId] = (fairShareByMember[memberId] || 0) + sharePerMember;
    });
  });

  const balances: Record<string, number> = {};
  members.forEach((member) => {
    balances[member.id] = (paidByMember[member.id] || 0) - (fairShareByMember[member.id] || 0);
  });

  const completedTransferMap = new Map(
    transfers
      .filter((transfer) => transfer.is_completed)
      .map((transfer) => [`${transfer.from_member_id}:${transfer.to_member_id}`, transfer])
  );

  const settlements: Settlement[] = [];
  const owers = members
    .filter((m) => balances[m.id] < -0.01)
    .map((m) => ({
      id: m.id,
      name: m.name,
      amount: Math.abs(balances[m.id]),
    }));

  const owedbys = members
    .filter((m) => balances[m.id] > 0.01)
    .map((m) => ({
      id: m.id,
      name: m.name,
      amount: balances[m.id],
    }));

  for (let i = 0; i < owers.length && owedbys.length > 0; i++) {
    const ower = owers[i];
    let remaining = ower.amount;

    while (remaining > 0.01 && owedbys.length > 0) {
      const owedby = owedbys[0];
      const settleAmount = Math.min(remaining, owedby.amount);

      const transferKey = `${ower.id}:${owedby.id}`;
      const completedTransfer = completedTransferMap.get(transferKey);

      if (!completedTransfer || completedTransfer.amount !== settleAmount) {
        settlements.push({
          from_member_id: ower.id,
          from_name: ower.name,
          to_member_id: owedby.id,
          to_name: owedby.name,
          amount: settleAmount,
          currency: 'JPY',
        });
      }

      remaining -= settleAmount;
      owedby.amount -= settleAmount;

      if (owedby.amount < 0.01) {
        owedbys.shift();
      }
    }
  }

  const memberBalances: Record<string, { paid: number; fairShare: number; balance: number }> = {};
  members.forEach((member) => {
    memberBalances[member.id] = {
      paid: paidByMember[member.id] || 0,
      fairShare: fairShareByMember[member.id] || 0,
      balance: balances[member.id],
    };
  });

  return {
    settlements,
    memberBalances,
    totalAmount,
  };
}

async function handleCompleteSettlement(
  tripId: string,
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { fromMemberId, toMemberId, amount } = req.body;

  if (!fromMemberId || !toMemberId || typeof amount !== 'number') {
    return res.status(400).json({ error: 'Missing required fields: fromMemberId, toMemberId, amount' });
  }

  try {
    const { error } = await supabase
      .from('settlement_transfers')
      .upsert({
        trip_id: tripId,
        from_member_id: fromMemberId,
        to_member_id: toMemberId,
        amount,
        is_completed: true,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'trip_id,from_member_id,to_member_id'
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return handleCalculateSettlement(tripId, res);
  } catch (err) {
    console.error('Settlement completion error:', err);
    return res.status(500).json({ error: 'Failed to complete settlement' });
  }
}
