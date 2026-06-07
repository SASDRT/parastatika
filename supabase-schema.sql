-- Εκτέλεσε αυτό στο Supabase SQL Editor

create table if not exists invoices (
  id bigserial primary key,
  created_at timestamptz default now(),
  type text not null check (type in ('income', 'expense')),
  number text,
  date date,
  counterparty text,
  afm text,
  subtotal numeric(12,2) default 0,
  vat_rate numeric(5,2) default 24,
  vat numeric(12,2) default 0,
  total numeric(12,2) default 0,
  payment_method text,
  notes text,
  items jsonb default '[]'::jsonb
);

-- Ενεργοποίηση RLS
alter table invoices enable row level security;

-- Πολιτική: όλοι μπορούν να διαβάζουν/γράφουν (αφού δεν έχουμε auth)
create policy "Allow all" on invoices for all using (true) with check (true);
