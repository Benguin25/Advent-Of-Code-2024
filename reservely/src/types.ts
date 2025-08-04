export const ReservationStatusEnum = {
  planned: 'planned',
  cancelled: 'cancelled',
  arrived: 'arrived',
};

export interface Restaurant {
  id: string;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
  owner_id?: string | null;
  monday_open?: string | null;
  monday_close?: string | null;
  tuesday_open?: string | null;
  tuesday_close?: string | null;
  wednesday_open?: string | null;
  wednesday_close?: string | null;
  thursday_open?: string | null;
  thursday_close?: string | null;
  friday_open?: string | null;
  friday_close?: string | null;
  saturday_open?: string | null;
  saturday_close?: string | null;
  sunday_open?: string | null;
  sunday_close?: string | null;
  reservation_duration?: any | null; // Or a more specific type if the JSON structure is known
  slug: string;
  description?: string | null;
  cuisine?: string | null;
  address?: string | null;
  phone_number?: string | null;
  max_party_size?: number | null;
  min_party_size?: number | null;
  advance_booking_days?: number | null;
  min_advance_hours?: number | null;
}

export type TableStatusEnum = 'available' | 'reserved' | 'occupied';
export type TableShapeEnum = 'rectangle' | 'circle' | 'square';

export interface Table {
  id: string;
  restaurant_id: string;
  pos_x: number;
  pos_y: number;
  size: number;
  status: TableStatusEnum;
  shape: TableShapeEnum;
  last_updated_at: string;
}

export interface Booking {
  id: string;
  restaurant_id: string;
  user_id: string;
  booking_date: string;
  booking_time: string;
  number_of_people: number;
  created_at: string;
  table_id?: string | null;
  expected_end_time?: string | null;
}
