import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { Trip, Day, Event, Member } from '@/types';

type ResponseData = {
  data?: {
    trip: Trip;
    days: Day[];
    memberCount?: number;
    paymentCount?: number;
    settlementCount?: number;
    events?: Event[];
    nextEvent?: Event | null;
    members?: Member[];
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
    return handleGetTrip(id, res);
  }

  if (req.method === 'PATCH') {
    return handleUpdateTrip(id, req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetTrip(
  tripId: string,
  res: NextApiResponse<ResponseData>
) {
  try {
    // Fetch trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Fetch days (or create them if missing)
    let { data: days, error: daysError } = await supabase
      .from('days')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true });

    if (daysError) {
      console.error('Error fetching days:', daysError);
      days = [];
    }

    // If no days exist, create them
    if (!days || days.length === 0) {
      days = await createDaysForTrip(tripId, trip.start_date, trip.end_date);
    }

    const [membersResult, paymentsCountResult, eventsResult] = await Promise.all([
      supabase.from('members').select('*').eq('trip_id', tripId).order('joined_at', { ascending: true }),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
      supabase.from('events').select('*').eq('trip_id', tripId).order('start_time', { ascending: true }),
    ]);

    const memberCount = (membersResult.data || []).length;
    const paymentCount = paymentsCountResult.count || 0;
    const events = ((eventsResult.data || []) as Event[]).sort((a, b) => {
      const aKey = `${a.day_id}-${a.start_time || '99:99'}`;
      const bKey = `${b.day_id}-${b.start_time || '99:99'}`;
      return aKey.localeCompare(bKey);
    });
    const nextEvent = events.find((event) => event.start_time) || events[0] || null;

    res.status(200).json({
      data: {
        trip,
        days,
        memberCount,
        paymentCount,
        settlementCount: 0,
        events,
        nextEvent,
        members: (membersResult.data || []) as Member[],
      },
    });
  } catch (err) {
    console.error('Get trip error:', err);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
}

async function createDaysForTrip(
  tripId: string,
  startDate: string,
  endDate: string
): Promise<Day[]> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: Day[] = [];

  let current = new Date(start);
  let dayNumber = 1;

  const rows = [];

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    rows.push({
      trip_id: tripId,
      date: dateStr,
      day_number: dayNumber,
    });
    current.setDate(current.getDate() + 1);
    dayNumber++;
  }

  const { data, error } = await supabase
    .from('days')
    .insert(rows)
    .select()
    .order('day_number', { ascending: true });

  if (error || !data) {
    console.error('Error creating days:', error);
    return days;
  }

  return data as Day[];
}

async function handleUpdateTrip(
  tripId: string,
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { title, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('trips')
      .update({ title, description })
      .eq('id', tripId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ data: { trip: data, days: [] } });
  } catch (err) {
    console.error('Update trip error:', err);
    res.status(500).json({ error: 'Failed to update trip' });
  }
}
