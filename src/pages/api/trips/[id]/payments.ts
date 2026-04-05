import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, supabaseServer } from '@/lib/supabase';
import { Payment } from '@/types';

type ResponseData = {
  data?: Payment[];
  error?: string;
};

const RECEIPT_BUCKET = 'payment-receipts';
const MAX_RECEIPT_SIZE_BYTES = 3 * 1024 * 1024;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid trip ID' });
  }

  if (req.method === 'GET') {
    return handleGetPayments(id, res);
  }

  if (req.method === 'POST') {
    return handleCreatePayment(id, req, res);
  }

  if (req.method === 'PATCH') {
    return handleUpdatePayment(id, req, res);
  }

  if (req.method === 'DELETE') {
    return handleDeletePayment(id, req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}

async function attachAllocations(payments: Payment[]) {
  if (!payments.length) return payments;

  const paymentIds = payments.map((payment) => payment.id);
  const { data: allocations, error } = await supabase
    .from('payment_allocations')
    .select('payment_id, member_id')
    .in('payment_id', paymentIds);

  if (error) {
    throw new Error(error.message);
  }

  const allocationMap = new Map<string, string[]>();
  (allocations || []).forEach((allocation) => {
    const current = allocationMap.get(allocation.payment_id) || [];
    current.push(allocation.member_id);
    allocationMap.set(allocation.payment_id, current);
  });

  return payments.map((payment) => ({
    ...payment,
    allocated_member_ids: allocationMap.get(payment.id) || [],
  }));
}

async function enrichPaymentsWithReceiptUrl(payments: Payment[]) {
  if (!payments.length) return payments;

  return Promise.all(
    payments.map(async (payment) => {
      if (!payment.receipt_path) {
        return payment;
      }

      const { data } = supabase.storage
        .from(RECEIPT_BUCKET)
        .getPublicUrl(payment.receipt_path);

      return {
        ...payment,
        receipt_url: data.publicUrl,
      };
    })
  );
}

async function fetchAndEnrichPaymentsByIds(paymentIds: string[]) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .in('id', paymentIds);

  if (error) {
    throw new Error(error.message);
  }

  const withAllocations = await attachAllocations((data || []) as Payment[]);
  return enrichPaymentsWithReceiptUrl(withAllocations);
}

async function handleGetPayments(
  tripId: string,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('trip_id', tripId)
      .order('payment_date', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const withAllocations = await attachAllocations((data || []) as Payment[]);
    const enriched = await enrichPaymentsWithReceiptUrl(withAllocations);
    res.status(200).json({ data: enriched });
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
}

async function uploadReceiptIfNeeded(
  tripId: string,
  receiptBase64?: string,
  receiptName?: string,
  receiptMimeType?: string
) {
  if (!receiptBase64) {
    return null;
  }

  if (!supabaseServer) {
    throw new Error('Supabase server client is not configured');
  }

  if (receiptMimeType !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }

  const buffer = Buffer.from(receiptBase64, 'base64');

  if (buffer.byteLength > MAX_RECEIPT_SIZE_BYTES) {
    throw new Error('PDF must be 3MB or smaller');
  }

  const safeFileName = (receiptName || 'receipt.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${tripId}/${Date.now()}-${safeFileName}`;

  const { error } = await supabaseServer.storage
    .from(RECEIPT_BUCKET)
    .upload(filePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    receipt_path: filePath,
    receipt_name: receiptName || 'receipt.pdf',
    receipt_size: buffer.byteLength,
    receipt_mime_type: 'application/pdf',
  };
}

function normalizeAllocatedMemberIds(allocated_member_ids: unknown) {
  return Array.isArray(allocated_member_ids)
    ? [...new Set(allocated_member_ids.filter((memberId) => typeof memberId === 'string' && memberId))]
    : [];
}

async function handleCreatePayment(
  tripId: string,
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const {
    payer_id,
    amount,
    description,
    payment_date,
    receiptBase64,
    receiptName,
    receiptMimeType,
    allocated_member_ids,
  } = req.body;

  if (!payer_id || !amount || !payment_date) {
    return res.status(400).json({
      error: 'Missing required fields: payer_id, amount, payment_date',
    });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  const normalizedAllocatedMemberIds = normalizeAllocatedMemberIds(allocated_member_ids);

  if (normalizedAllocatedMemberIds.length === 0) {
    return res.status(400).json({ error: 'At least one billed member must be selected' });
  }

  try {
    const receiptMeta = await uploadReceiptIfNeeded(
      tripId,
      receiptBase64,
      receiptName,
      receiptMimeType
    );

    const { data, error } = await supabase
      .from('payments')
      .insert({
        trip_id: tripId,
        payer_id,
        amount: parseFloat(amount),
        amount_jpy: parseFloat(amount),
        currency: 'JPY',
        description,
        payment_date,
        ...(receiptMeta || {}),
      })
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to create payment' });
    }

    const allocationRows = normalizedAllocatedMemberIds.map((memberId) => ({
      payment_id: data.id,
      member_id: memberId,
    }));

    const { error: allocationError } = await supabase
      .from('payment_allocations')
      .insert(allocationRows);

    if (allocationError) {
      return res.status(500).json({ error: allocationError.message });
    }

    const enriched = await fetchAndEnrichPaymentsByIds([data.id]);
    res.status(201).json({ data: enriched });
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to create payment',
    });
  }
}

async function handleUpdatePayment(
  tripId: string,
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { paymentId, payer_id, amount, description, payment_date, allocated_member_ids } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'Missing required field: paymentId' });
  }

  const normalizedAllocatedMemberIds = normalizeAllocatedMemberIds(allocated_member_ids);

  if (normalizedAllocatedMemberIds.length === 0) {
    return res.status(400).json({ error: 'At least one billed member must be selected' });
  }

  try {
    const updatePayload: Record<string, unknown> = {};

    if (payer_id) updatePayload.payer_id = payer_id;
    if (amount) {
      updatePayload.amount = parseFloat(amount);
      updatePayload.amount_jpy = parseFloat(amount);
    }
    if (typeof description === 'string') updatePayload.description = description;
    if (payment_date) updatePayload.payment_date = payment_date;

    const { error: paymentError } = await supabase
      .from('payments')
      .update(updatePayload)
      .eq('id', paymentId)
      .eq('trip_id', tripId);

    if (paymentError) {
      return res.status(500).json({ error: paymentError.message });
    }

    const { error: deleteAllocationsError } = await supabase
      .from('payment_allocations')
      .delete()
      .eq('payment_id', paymentId);

    if (deleteAllocationsError) {
      return res.status(500).json({ error: deleteAllocationsError.message });
    }

    const allocationRows = normalizedAllocatedMemberIds.map((memberId) => ({
      payment_id: paymentId,
      member_id: memberId,
    }));

    const { error: insertAllocationsError } = await supabase
      .from('payment_allocations')
      .insert(allocationRows);

    if (insertAllocationsError) {
      return res.status(500).json({ error: insertAllocationsError.message });
    }

    const enriched = await fetchAndEnrichPaymentsByIds([paymentId]);
    res.status(200).json({ data: enriched });
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
}

async function handleDeletePayment(
  tripId: string,
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'Missing required field: paymentId' });
  }

  try {
    const { data: paymentToDelete, error: fetchError } = await supabase
      .from('payments')
      .select('receipt_path')
      .eq('id', paymentId)
      .eq('trip_id', tripId)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    const { error: allocationDeleteError } = await supabase
      .from('payment_allocations')
      .delete()
      .eq('payment_id', paymentId);

    if (allocationDeleteError) {
      return res.status(500).json({ error: allocationDeleteError.message });
    }

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)
      .eq('trip_id', tripId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (paymentToDelete?.receipt_path && supabaseServer) {
      const { error: storageError } = await supabaseServer.storage
        .from(RECEIPT_BUCKET)
        .remove([paymentToDelete.receipt_path]);

      if (storageError) {
        console.error('Delete receipt from storage error:', storageError);
      }
    }

    res.status(200).json({ data: [] });
  } catch (err) {
    console.error('Delete payment error:', err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
}
