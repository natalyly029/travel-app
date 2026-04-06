export interface Trip {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
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

export interface PaymentAllocationStatus {
  member_id: string;
  is_settled: boolean;
  settled_at?: string | null;
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
  receipt_path?: string | null;
  receipt_name?: string | null;
  receipt_size?: number | null;
  receipt_mime_type?: string | null;
  receipt_url?: string | null;
  allocated_member_ids?: string[];
  allocation_statuses?: PaymentAllocationStatus[];
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  member_id: string;
  is_settled?: boolean;
  settled_at?: string | null;
  created_at: string;
}

export interface SettlementHistoryItem {
  amount: number;
  completed_at?: string | null;
}

export interface Settlement {
  from_member_id: string;
  from_name: string;
  to_member_id: string;
  to_name: string;
  amount: number;
  currency: string;
  is_completed?: boolean;
  completed_at?: string | null;
  history?: SettlementHistoryItem[];
}

export interface CompletedSettlementTransfer {
  from_member_id: string;
  from_name: string;
  to_member_id: string;
  to_name: string;
  amount: number;
  completed_at?: string | null;
}

export interface TripDocument {
  id: string;
  trip_id: string;
  title: string;
  category?: 'flight' | 'hotel' | 'booking' | 'insurance' | 'other' | null;
  is_pinned?: boolean;
  file_path: string;
  file_name: string;
  file_size?: number | null;
  file_mime_type?: string | null;
  file_url?: string | null;
  created_at: string;
}
