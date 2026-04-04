import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { Payment } from '@/types';

type ResponseData = {
  data?: Payment[];
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

    res.status(200).json({ data: data || [] });
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
}

async function handleCreatePayment(
  tripId: string,
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { payer_id, amount, description, payment_date } = req.body;

  if (!payer_id || !amount || !payment_date) {
    return res.status(400).json({
      error: 'Missing required fields: payer_id, amount, payment_date',
    });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        trip_id: tripId,
        payer_id,
        amount: parseFloat(amount),
        amount_jpy: parseFloat(amount), // JPY固定
        currency: 'JPY',
        description,
        payment_date,
      })
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ data: data || [] });
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
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
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)
      .eq('trip_id', tripId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ data: [] });
  } catch (err) {
    console.error('Delete payment error:', err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
}
