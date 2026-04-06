import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { Trip } from '@/types';

type ResponseData = {
  data?: Trip;
  error?: string;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method === 'POST') {
    return handleCreateTrip(req, res);
  }

  if (req.method === 'GET') {
    return handleGetTrips(req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}

async function handleCreateTrip(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { title, description, start_date, end_date } = req.body;

  // Validation
  if (!title || !start_date || !end_date) {
    return res.status(400).json({
      error: 'Missing required fields: title, start_date, end_date',
    });
  }

  // Generate share token
  const shareToken = Math.random().toString(36).substring(2, 15);

  try {
    // Generate unique ID for creator (since auth not implemented)
    const creatorId = `user-${Math.random().toString(36).substring(2, 15)}`;

    const { data, error } = await supabase
      .from('trips')
      .insert({
        title,
        description,
        start_date,
        end_date,
        share_token: shareToken,
        created_by: creatorId,
        is_public: true, // Allow public access by default
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ data });
  } catch (err) {
    console.error('Create trip error:', err);
    res.status(500).json({ error: 'Failed to create trip' });
  }
}

async function handleGetTrips(
  _req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    // For now, return empty (auth not implemented yet)
    res.status(200).json({ message: 'Auth required for getting trips' });
  } catch (err) {
    console.error('Get trips error:', err);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
}
