-- Create question_bookmarks table
create table if not exists public.question_bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  question_id uuid references public.exam_questions(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, question_id)
);

-- Create question_reports table
create table if not exists public.question_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  question_id uuid references public.exam_questions(id) not null,
  report_type text check (report_type in ('flag', 'feedback', 'error')) not null,
  comment text,
  status text check (status in ('open', 'resolved', 'rejected')) default 'open' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.question_bookmarks enable row level security;
alter table public.question_reports enable row level security;

-- Policies for question_bookmarks
create policy "Users can view their own bookmarks"
  on public.question_bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can create their own bookmarks"
  on public.question_bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own bookmarks"
  on public.question_bookmarks for delete
  using (auth.uid() = user_id);

-- Policies for question_reports
create policy "Users can view their own reports"
  on public.question_reports for select
  using (auth.uid() = user_id);

create policy "Users can create reports"
  on public.question_reports for insert
  with check (auth.uid() = user_id);

-- Admins can view all reports (assuming an admin role check exists, or just allow read for now)
-- For simplicity, we'll stick to user-centric policies first. 
