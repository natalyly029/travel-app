import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { Member } from '@/types';

type ResponseData = {
  data?: Member[];
  error?: string;
  message?: string;
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
    return handleGetMembers(id, res);
  }

  if (req.method === 'POST') {
    return handleAddMember(id, req, res);
  }

  if (req.method === 'DELETE') {
    return handleRemoveMember(id, req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetMembers(
  tripId: string,
  res: NextApiResponse<ResponseData>
) {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('trip_id', tripId)
      .order('joined_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ data: data || [] });
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
}

async function handleAddMember(
  tripId: string,
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { name, email, role = 'editor' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing required field: name' });
  }

  try {
    // Check if email already exists for this trip
    if (email) {
      const { data: existing } = await supabase
        .from('members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('email', email)
        .single();

      if (existing) {
        return res.status(400).json({
          error: 'Member with this email already exists in this trip',
        });
      }
    }

    const { data, error } = await supabase
      .from('members')
      .insert({
        trip_id: tripId,
        name,
        email,
        role,
      })
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ data: data || [] });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
}

async function handleRemoveMember(
  tripId: string,
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { memberId } = req.body;

  if (!memberId) {
    return res.status(400).json({ error: 'Missing required field: memberId' });
  }

  try {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId)
      .eq('trip_id', tripId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
}
