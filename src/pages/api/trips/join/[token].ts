import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { Trip, Member } from '@/types';

type ResponseData = {
  data?: {
    trip?: Trip;
    trip_id?: string;
    member?: Member;
  };
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing token' });
  }

  if (req.method === 'GET') {
    return handleGetTripByToken(token, res);
  }

  if (req.method === 'POST') {
    return handleJoinTrip(token, req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetTripByToken(
  token: string,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('share_token', token)
      .eq('is_public', true)
      .single();

    if (error || !data) {
      return res
        .status(404)
        .json({ error: 'Trip not found or link is invalid' });
    }

    res.status(200).json({ data: { trip: data } });
  } catch (err) {
    console.error('Get trip by token error:', err);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
}

async function handleJoinTrip(
  token: string,
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { name, email } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing required field: name' });
  }

  try {
    // Verify token exists and get trip
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('share_token', token)
      .eq('is_public', true)
      .single();

    if (tripError || !tripData) {
      return res
        .status(404)
        .json({ error: 'Trip not found or link is invalid' });
    }

    const tripId = tripData.id;

    // Check if member already exists (by email)
    if (email) {
      const { data: existing } = await supabase
        .from('members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('email', email)
        .single();

      if (existing) {
        return res.status(400).json({
          error: 'You are already a member of this trip',
        });
      }
    }

    // Add member to trip
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .insert({
        trip_id: tripId,
        name,
        email,
        role: 'editor', // Default role for joined members
      })
      .select();

    if (memberError || !memberData) {
      return res.status(500).json({ error: 'Failed to join trip' });
    }

    res.status(201).json({
      data: {
        trip_id: tripId,
        member: memberData[0],
      },
    });
  } catch (err) {
    console.error('Join trip error:', err);
    res.status(500).json({ error: 'Failed to join trip' });
  }
}
