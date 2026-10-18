-- Fix Auth and Members Setup

-- 1. Ensure members table exists
create table if not exists public.members (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email text unique not null,
  name text,
  role text default 'student',
  status text default 'Active',
  joining_date timestamp with time zone,
  photo_url text
);

-- 2. Enable RLS on members
alter table public.members enable row level security;

-- 3. Policies for members
drop policy if exists "Members can view their own profile" on public.members;
create policy "Members can view their own profile"
  on public.members for select
  using (email = auth.jwt() ->> 'email');

drop policy if exists "Members can update their own profile" on public.members;
create policy "Members can update their own profile"
  on public.members for update
  using (email = auth.jwt() ->> 'email');

-- 4. Trigger to automatically create member on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.members (email, name, role, status, joining_date)
  values (
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    'Active',
    now()
  )
  on conflict (email) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Backfill existing users into members table
insert into public.members (email, name, role, status, joining_date)
select 
  email,
  coalesce(raw_user_meta_data->>'full_name', email),
  coalesce(raw_user_meta_data->>'role', 'student'),
  'Active',
  created_at
from auth.users
on conflict (email) do nothing;

-- 6. Storage Buckets (Idempotent)
insert into storage.buckets (id, name, public)
values ('user-photos', 'user-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chapter-content', 'chapter-content', true)
on conflict (id) do nothing;

-- 7. Storage Policies (Drop existing to avoid conflicts if needed, or use IF NOT EXISTS logic which is hard for policies)
-- We'll just try to create them. If they exist, it might error, but that's okay.
-- Better to drop first to be safe.

drop policy if exists "Public Access to Photos" on storage.objects;
create policy "Public Access to Photos"
  on storage.objects for select
  using ( bucket_id = 'user-photos' );

drop policy if exists "Authenticated users can upload photos" on storage.objects;
create policy "Authenticated users can upload photos"
  on storage.objects for insert
  with check ( bucket_id = 'user-photos' and auth.role() = 'authenticated' );

drop policy if exists "Users can update their own photos" on storage.objects;
create policy "Users can update their own photos"
  on storage.objects for update
  using ( bucket_id = 'user-photos' and auth.uid() = owner );
