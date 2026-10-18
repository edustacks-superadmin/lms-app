-- Create member_content_history table to track recently viewed content
create table if not exists public.member_content_history (
  id serial primary key,
  member_id integer not null,
  chapter_content_id integer not null,
  last_accessed_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  
  constraint member_content_history_member_id_fkey 
    foreign key (member_id) references members(id) on delete cascade,
  constraint member_content_history_chapter_content_id_fkey 
    foreign key (chapter_content_id) references chapter_contents(id) on delete cascade,
  constraint member_content_history_unique 
    unique(member_id, chapter_content_id)
);

-- Create index for faster lookups
create index if not exists idx_member_content_history_member_id 
  on public.member_content_history using btree (member_id);

create index if not exists idx_member_content_history_last_accessed 
  on public.member_content_history using btree (last_accessed_at desc);

-- Enable RLS
alter table public.member_content_history enable row level security;

-- RLS Policy: Users can only view their own history
create policy "Users can view own content history"
  on public.member_content_history
  for select
  using (
    member_id in (
      select id from members where auth_user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert/update their own history
create policy "Users can manage own content history"
  on public.member_content_history
  for all
  using (
    member_id in (
      select id from members where auth_user_id = auth.uid()
    )
  );
