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

  if (req.method === 'DELETE') {
    return handleDeletePayment(id, req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
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

    const enriched = await enrichPaymentsWithReceiptUrl((data || []) as Payment[]);
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
  } = req.body;

  if (!payer_id || !amount || !payment_date) {
    return res.status(400).json({
      error: 'Missing required fields: payer_id, amount, payment_date',
    });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
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
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const enriched = await enrichPaymentsWithReceiptUrl((data || []) as Payment[]);
    res.status(201).json({ data: enriched });
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to create payment',
    });
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
