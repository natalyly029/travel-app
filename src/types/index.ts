export interface Trip {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  template: 'postcard' | 'brutalist' | 'soft' | 'minimalist' | 'maximalist';
  created_by: string;
  share_token?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Day {
  id: string;
  trip_id: string;
  date: string;
  day_number: number;
  label?: string;
  created_at: string;
}

export interface Event {
  id: string;
  day_id: string;
  trip_id: string;
  type: 'sightseeing' | 'food' | 'accommodation' | 'packing' | 'note' | 'payment' | 'transport' | 'activity';
  title: string;
  start_time?: string;
  location?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  trip_id: string;
  user_id?: string;
  name: string;
  email?: string;
  role: 'organizer' | 'editor' | 'viewer';
  joined_at: string;
  created_at: string;
}

export interface Payment {
  id: string;
  trip_id: string;
  payer_id: string;
  amount: number;
  currency: string;
  amount_jpy?: number;
  description?: string;
  payment_date: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  member_id: string;
  created_at: string;
}

export interface Settlement {
  from_member_id: string;
  from_name: string;
  to_member_id: string;
  to_name: string;
  amount: number;
  currency: string;
}
