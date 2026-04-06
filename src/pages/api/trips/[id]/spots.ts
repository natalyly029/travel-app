import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { TripSpot } from '@/types';

type ResponseData = {
  data?: TripSpot[];
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
    return handleGetSpots(id, res);
  }

  if (req.method === 'POST') {
    return handleCreateSpot(id, req, res);
  }

  if (req.method === 'PATCH') {
    return handleUpdateSpot(id, req, res);
  }

  if (req.method === 'DELETE') {
    return handleDeleteSpot(id, req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetSpots(tripId: string, res: NextApiResponse<ResponseData>) {
  try {
    const { data, error } = await supabase
      .from('trip_spots')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data: (data || []) as TripSpot[] });
  } catch (err) {
    console.error('Get spots error:', err);
    return res.status(500).json({ error: 'Failed to fetch spots' });
  }
}

async function handleCreateSpot(tripId: string, req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { name, area, notes, url, priority, status } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing required field: name' });
  }

  try {
    const { data, error } = await supabase
      .from('trip_spots')
      .insert({
        trip_id: tripId,
        name,
        area: area || null,
        notes: notes || null,
        url: url || null,
        priority: priority || 'medium',
        status: status || 'interested',
      })
      .select();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ data: (data || []) as TripSpot[] });
  } catch (err) {
    console.error('Create spot error:', err);
    return res.status(500).json({ error: 'Failed to create spot' });
  }
}

async function handleUpdateSpot(tripId: string, req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { spotId, name, area, notes, url, priority, status } = req.body;

  if (!spotId) {
    return res.status(400).json({ error: 'Missing required field: spotId' });
  }

  try {
    const { data, error } = await supabase
      .from('trip_spots')
      .update({ name, area, notes, url, priority, status, updated_at: new Date().toISOString() })
      .eq('id', spotId)
      .eq('trip_id', tripId)
      .select();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data: (data || []) as TripSpot[] });
  } catch (err) {
    console.error('Update spot error:', err);
    return res.status(500).json({ error: 'Failed to update spot' });
  }
}

async function handleDeleteSpot(tripId: string, req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { spotId } = req.body;

  if (!spotId) {
    return res.status(400).json({ error: 'Missing required field: spotId' });
  }

  try {
    const { error } = await supabase
      .from('trip_spots')
      .delete()
      .eq('id', spotId)
      .eq('trip_id', tripId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data: [] });
  } catch (err) {
    console.error('Delete spot error:', err);
    return res.status(500).json({ error: 'Failed to delete spot' });
  }
}
