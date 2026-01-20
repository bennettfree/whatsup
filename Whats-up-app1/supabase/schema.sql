-- Supabase schema for auth-linked user data and map-related storage.

-- Profiles table: extends auth.users with display data used in the app.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  username text,
  avatar_url text,
  bio text,
  followers_count integer default 0,
  following_count integer default 0,
  saved_count integer default 0,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create unique index if not exists profiles_user_id_key on public.profiles(user_id);

-- Saved places: per-user saved venues from Google Places, Ticketmaster, or internal DB.
create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  source text not null check (source in ('google', 'ticketmaster', 'internal')),
  name text not null,
  category text,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz default timezone('utc', now())
);

create index if not exists saved_places_user_id_idx on public.saved_places(user_id);
create index if not exists saved_places_place_id_idx on public.saved_places(place_id);

-- Saved events: per-user saved Ticketmaster or other events.
create table if not exists public.saved_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  source text not null default 'ticketmaster',
  name text not null,
  start_datetime timestamptz,
  venue_name text,
  address text,
  city text,
  price numeric,
  is_free boolean default false,
  created_at timestamptz default timezone('utc', now())
);

create index if not exists saved_events_user_id_idx on public.saved_events(user_id);
create index if not exists saved_events_event_id_idx on public.saved_events(event_id);

-- Plans: simple representation of a planned outing, optionally linking a place and/or event.
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  place_id text,
  event_id text,
  scheduled_for timestamptz,
  created_at timestamptz default timezone('utc', now())
);

create index if not exists plans_user_id_idx on public.plans(user_id);

-- Reviews: user-written reviews for places (may later be shown on profile screen).
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  rating numeric check (rating >= 0 and rating <= 5),
  title text,
  body text,
  visited_at timestamptz,
  created_at timestamptz default timezone('utc', now())
);

create index if not exists reviews_user_id_idx on public.reviews(user_id);
create index if not exists reviews_place_id_idx on public.reviews(place_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.saved_places enable row level security;
alter table public.saved_events enable row level security;
alter table public.plans enable row level security;
alter table public.reviews enable row level security;

-- RLS policies to ensure users can only see and modify their own rows.
do $$
begin
  -- Profiles
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles select own row'
  ) then
    create policy "Profiles select own row"
      on public.profiles
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Profiles manage own row'
  ) then
    create policy "Profiles manage own row"
      on public.profiles
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  -- Saved places
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_places'
      and policyname = 'Saved places access own'
  ) then
    create policy "Saved places access own"
      on public.saved_places
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  -- Saved events
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_events'
      and policyname = 'Saved events access own'
  ) then
    create policy "Saved events access own"
      on public.saved_events
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  -- Plans
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'plans'
      and policyname = 'Plans access own'
  ) then
    create policy "Plans access own"
      on public.plans
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  -- Reviews
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'Reviews access own'
  ) then
    create policy "Reviews access own"
      on public.reviews
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;


