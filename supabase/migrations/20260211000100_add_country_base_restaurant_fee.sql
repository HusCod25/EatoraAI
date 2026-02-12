-- Add a per-country base restaurant fee (in USD) to better model
-- fixed restaurant costs like labor, rent, and utilities.

alter table if exists public.country_price_config
  add column if not exists base_restaurant_fee_usd numeric not null default 0;

-- Seed base restaurant fee values (USD-equivalent) per country.
-- These numbers are provided by the business logic owner.

update public.country_price_config set base_restaurant_fee_usd = 12.50 where country = 'Luxembourg';
update public.country_price_config set base_restaurant_fee_usd = 17.00 where country = 'Switzerland';
update public.country_price_config set base_restaurant_fee_usd = 15.00 where country = 'Iceland';
update public.country_price_config set base_restaurant_fee_usd = 12.00 where country = 'Norway';
update public.country_price_config set base_restaurant_fee_usd = 10.00 where country = 'United States';
update public.country_price_config set base_restaurant_fee_usd = 11.00 where country = 'Denmark';
update public.country_price_config set base_restaurant_fee_usd = 9.50 where country = 'Australia';
update public.country_price_config set base_restaurant_fee_usd = 9.50 where country = 'Finland';
update public.country_price_config set base_restaurant_fee_usd = 9.50 where country = 'Sweden';
update public.country_price_config set base_restaurant_fee_usd = 9.50 where country = 'Belgium';
update public.country_price_config set base_restaurant_fee_usd = 9.50 where country = 'Israel';
update public.country_price_config set base_restaurant_fee_usd = 9.50 where country = 'France';
update public.country_price_config set base_restaurant_fee_usd = 9.00 where country = 'Austria';
update public.country_price_config set base_restaurant_fee_usd = 9.00 where country = 'Netherlands';
update public.country_price_config set base_restaurant_fee_usd = 9.00 where country = 'United Kingdom';
update public.country_price_config set base_restaurant_fee_usd = 9.00 where country = 'Ireland';
update public.country_price_config set base_restaurant_fee_usd = 9.00 where country = 'New Zealand';
update public.country_price_config set base_restaurant_fee_usd = 9.00 where country = 'Canada';
update public.country_price_config set base_restaurant_fee_usd = 9.00 where country = 'Barbados';
update public.country_price_config set base_restaurant_fee_usd = 8.70 where country = 'Germany';
update public.country_price_config set base_restaurant_fee_usd = 8.50 where country = 'United Arab Emirates';
update public.country_price_config set base_restaurant_fee_usd = 8.00 where country = 'Singapore';
update public.country_price_config set base_restaurant_fee_usd = 7.60 where country = 'Italy';
update public.country_price_config set base_restaurant_fee_usd = 7.00 where country = 'Hong Kong';
update public.country_price_config set base_restaurant_fee_usd = 7.00 where country = 'Saudi Arabia';
update public.country_price_config set base_restaurant_fee_usd = 6.50 where country = 'Spain';
update public.country_price_config set base_restaurant_fee_usd = 5.50 where country = 'South Korea';
update public.country_price_config set base_restaurant_fee_usd = 5.50 where country = 'Greece';
update public.country_price_config set base_restaurant_fee_usd = 5.50 where country = 'Portugal';
update public.country_price_config set base_restaurant_fee_usd = 5.00 where country = 'Japan';
update public.country_price_config set base_restaurant_fee_usd = 5.00 where country = 'Czech Republic';
update public.country_price_config set base_restaurant_fee_usd = 4.50 where country = 'Poland';
update public.country_price_config set base_restaurant_fee_usd = 4.50 where country = 'Hungary';
update public.country_price_config set base_restaurant_fee_usd = 4.50 where country = 'Chile';
update public.country_price_config set base_restaurant_fee_usd = 4.30 where country = 'Romania';
update public.country_price_config set base_restaurant_fee_usd = 4.00 where country = 'Taiwan';
update public.country_price_config set base_restaurant_fee_usd = 4.00 where country = 'Brazil';
update public.country_price_config set base_restaurant_fee_usd = 3.50 where country = 'South Africa';
update public.country_price_config set base_restaurant_fee_usd = 3.50 where country = 'Russia';
update public.country_price_config set base_restaurant_fee_usd = 3.50 where country = 'Mexico';
update public.country_price_config set base_restaurant_fee_usd = 3.50 where country = 'Argentina';
update public.country_price_config set base_restaurant_fee_usd = 3.50 where country = 'Peru';
update public.country_price_config set base_restaurant_fee_usd = 3.50 where country = 'Turkey';
update public.country_price_config set base_restaurant_fee_usd = 3.00 where country = 'China';
update public.country_price_config set base_restaurant_fee_usd = 3.00 where country = 'Colombia';
update public.country_price_config set base_restaurant_fee_usd = 2.50 where country = 'Thailand';
update public.country_price_config set base_restaurant_fee_usd = 2.50 where country = 'Malaysia';
update public.country_price_config set base_restaurant_fee_usd = 2.50 where country = 'Ukraine';
update public.country_price_config set base_restaurant_fee_usd = 2.50 where country = 'Kenya';
update public.country_price_config set base_restaurant_fee_usd = 2.00 where country = 'Vietnam';
update public.country_price_config set base_restaurant_fee_usd = 2.00 where country = 'Indonesia';
update public.country_price_config set base_restaurant_fee_usd = 2.00 where country = 'Philippines';
update public.country_price_config set base_restaurant_fee_usd = 2.00 where country = 'Egypt';
update public.country_price_config set base_restaurant_fee_usd = 1.80 where country = 'India';
update public.country_price_config set base_restaurant_fee_usd = 1.50 where country = 'Nigeria';
