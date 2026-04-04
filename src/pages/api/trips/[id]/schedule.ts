import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { Event } from '@/types';

type ResponseData = {
  data?: Event[];
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
    return handleGetEvents(id, res);
  }

  if (req.method === 'POST') {
    return handleCreateEvent(id, req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetEvents(
  tripId: string,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('trip_id', tripId)
      .order('start_time', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ data: data || [] });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}

async function handleCreateEvent(
  tripId: string,
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { day_id, type, title, start_time, location, notes } = req.body;

  if (!day_id || !type || !title) {
    return res.status(400).json({
      error: 'Missing required fields: day_id, type, title',
    });
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .insert({
        trip_id: tripId,
        day_id,
        type,
        title,
        start_time,
        location,
        notes,
      })
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ data: data || [] });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
}
