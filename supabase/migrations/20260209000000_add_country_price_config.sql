-- Country price index configuration for budgeting and meal price estimation
-- This table stores a price index per country (relative to United States = 100)
-- and a generic restaurant multiplier that can be tuned later per country.

create table if not exists public.country_price_config (
  country text primary key,
  price_index numeric not null,
  restaurant_multiplier numeric not null default 3.0,
  created_at timestamptz default timezone('utc', now())
);

-- Seed base country price index data.
-- Values are relative indices where United States = 100.0

insert into public.country_price_config (country, price_index)
values
  ('United States', 100.0),
  ('Switzerland', 158.4),
  ('Iceland', 121.3),
  ('Norway', 105.1),
  ('Barbados', 106.5),
  ('Singapore', 101.8),
  ('South Korea', 112.7),
  ('Hong Kong', 107.9),
  ('Australia', 99.6),
  ('New Zealand', 96.6),
  ('Canada', 95.3),
  ('France', 92.5),
  ('Austria', 87.3),
  ('Israel', 85.8),
  ('Denmark', 87.5),
  ('Finland', 83.0),
  ('Ireland', 79.4),
  ('Belgium', 77.6),
  ('United Kingdom', 75.3),
  ('Germany', 77.9),
  ('Netherlands', 77.4),
  ('Japan', 74.6),
  ('Sweden', 74.3),
  ('Italy', 76.5),
  ('Taiwan', 83.2),
  ('Greece', 64.5),
  ('Portugal', 57.8),
  ('Spain', 60.8),
  ('Czech Republic', 59.4),
  ('United Arab Emirates', 60.6),
  ('Saudi Arabia', 54.9),
  ('Chile', 54.7),
  ('China', 50.7),
  ('Mexico', 61.4),
  ('Hungary', 53.2),
  ('Poland', 48.4),
  ('Romania', 49.1),
  ('Thailand', 55.2),
  ('Brazil', 43.6),
  ('Vietnam', 46.6),
  ('Malaysia', 47.7),
  ('South Africa', 37.2),
  ('Russia', 34.9),
  ('Indonesia', 45.2),
  ('Philippines', 47.4),
  ('Turkey', 40.8),
  ('Colombia', 41.2),
  ('Argentina', 34.5),
  ('Ukraine', 35.8),
  ('India', 31.6),
  ('Egypt', 27.2),
  ('Nigeria', 28.8),
  ('Kenya', 32.1),
  ('Peru', 41.3),
  ('Luxembourg', 95.0)
on conflict (country) do update
set price_index = excluded.price_index;

-- Notes for future expansion (not actual countries in dropdown):
-- Rest of Eastern Europe (e.g., Bulgaria, Slovakia): price_index ≈ 50.0
-- Rest of South America: price_index ≈ 42.0
-- Rest of Southeast Asia: price_index ≈ 46.0
