-- Table: public.restaurants


create table public.restaurants (
  id uuid not null default gen_random_uuid (),
  name text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  owner_id uuid null,
  monday_open time without time zone null,
  monday_close time without time zone null,
  tuesday_open time without time zone null,
  tuesday_close time without time zone null,
  wednesday_open time without time zone null,
  wednesday_close time without time zone null,
  thursday_open time without time zone null,
  thursday_close time without time zone null,
  friday_open time without time zone null,
  friday_close time without time zone null,
  saturday_open time without time zone null,
  saturday_close time without time zone null,
  sunday_open time without time zone null,
  sunday_close time without time zone null,
  reservation_duration jsonb null,
  slug text not null,
  description text null,
  cuisine text null,
  address text null,
  owner_email text null,
  phone_number text null,
  max_party_size integer null default 8,
  advance_booking_days integer null default 30,
  min_advance_hours integer null default 2,
  min_party_size integer null default 1,
  logo_url text null,
  confirmed boolean not null default false,
  restaurant_map jsonb null,
  constraint restaurants_pkey primary key (id),
  constraint restaurants_slug_key unique (slug),
  constraint restaurants_owner_id_fkey foreign KEY (owner_id) references auth.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_restaurants_owner_email on public.restaurants using btree (owner_email) TABLESPACE pg_default;
create index IF not exists idx_restaurants_max_party_size on public.restaurants using btree (max_party_size) TABLESPACE pg_default;
create index IF not exists idx_restaurants_advance_booking on public.restaurants using btree (advance_booking_days) TABLESPACE pg_default;
create index IF not exists idx_restaurants_min_party_size on public.restaurants using btree (min_party_size) TABLESPACE pg_default;

create trigger on_restaurants_update BEFORE
update on restaurants for EACH row
execute FUNCTION handle_updated_at ();


-- Table: public.tables

CREATE TABLE public.tables (
  id uuid NOT NULL,
  name text NOT NULL,
  restaurant_id uuid NOT NULL,
  capacity integer NOT NULL,
  status public.table_status_enum NOT NULL,
  last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  current_status text DEFAULT 'available',
  map_position jsonb NULL,
  assigned_table_id uuid NULL,
  CONSTRAINT tables_pkey PRIMARY KEY (id),
  CONSTRAINT tables_id_restaurant_id_unique UNIQUE (id, restaurant_id),
  CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON public.tables USING btree (restaurant_id) TABLESPACE pg_default;


-- Table: public.bookings

CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  booking_date date NOT NULL,
  booking_time time without time zone NOT NULL,
  number_of_people integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  table_id uuid NULL,
  expected_end_time timestamp with time zone NULL,
  status text default 'pending',
  name text,
  email text,
  phone text,
  notes text,
  user_id uuid NULL,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT fk_bookings_table_id FOREIGN KEY (table_id) REFERENCES tables (id) ON DELETE CASCADE,
  CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT positive_number_of_people CHECK ((number_of_people > 0))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_id ON public.bookings USING btree (restaurant_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON public.bookings USING btree (booking_date, booking_time) TABLESPACE pg_default;
