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

  res.status(405).json({ error: 'Method not allowed' });
}

async function handleCalculateSettlement(
  tripId: string,
  res: NextApiResponse<ResponseData>
) {
  try {
    // Fetch members
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .eq('trip_id', tripId);

    if (membersError || !members) {
      return res.status(500).json({ error: 'Failed to fetch members' });
    }

    // Fetch payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('trip_id', tripId);

    if (paymentsError || !payments) {
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }

    // Calculate settlement
    const settlement = calculateSettlement(members, payments);

    res.status(200).json({ data: settlement });
  } catch (err) {
    console.error('Settlement calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate settlement' });
  }
}

function calculateSettlement(members: Member[], payments: Payment[]) {
  // Calculate total amount paid by each member
  const paidByMember: Record<string, number> = {};
  let totalAmount = 0;

  members.forEach((member) => {
    paidByMember[member.id] = 0;
  });

  payments.forEach((payment) => {
    const amount = typeof payment.amount === 'number' ? payment.amount : 0;
    paidByMember[payment.payer_id] =
      (paidByMember[payment.payer_id] || 0) + amount;
    totalAmount += amount;
  });

  // Calculate fair share per member
  const fairShare = members.length > 0 ? totalAmount / members.length : 0;

  // Calculate balance (paid - fair share)
  const balances: Record<string, number> = {};
  members.forEach((member) => {
    balances[member.id] = (paidByMember[member.id] || 0) - fairShare;
  });

  // Convert balances to settlement (who owes whom)
  const settlements: Settlement[] = [];
  const owers = members
    .filter((m) => balances[m.id] < -0.01) // Owes money
    .map((m) => ({
      id: m.id,
      name: m.name,
      amount: Math.abs(balances[m.id]),
    }));

  const owedbys = members
    .filter((m) => balances[m.id] > 0.01) // Is owed money
    .map((m) => ({
      id: m.id,
      name: m.name,
      amount: balances[m.id],
    }));

  // Greedy matching: pair owers with owedbys
  for (let i = 0; i < owers.length && owedbys.length > 0; i++) {
    const ower = owers[i];
    let remaining = ower.amount;

    while (remaining > 0.01 && owedbys.length > 0) {
      const owedby = owedbys[0];
      const settleAmount = Math.min(remaining, owedby.amount);

      settlements.push({
        from_member_id: ower.id,
        from_name: ower.name,
        to_member_id: owedby.id,
        to_name: owedby.name,
        amount: settleAmount,
        currency: 'JPY',
      });

      remaining -= settleAmount;
      owedby.amount -= settleAmount;

      if (owedby.amount < 0.01) {
        owedbys.shift();
      }
    }
  }

  // Create member balances display (paid vs fair share)
  const memberBalances: Record<string, { paid: number; fairShare: number; balance: number }> = {};
  members.forEach((member) => {
    memberBalances[member.id] = {
      paid: paidByMember[member.id] || 0,
      fairShare,
      balance: balances[member.id],
    };
  });

  return {
    settlements,
    memberBalances,
    totalAmount,
  };
}
