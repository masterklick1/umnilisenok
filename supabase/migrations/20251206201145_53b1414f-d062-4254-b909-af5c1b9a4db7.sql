-- User roles enum
create type public.user_role as enum ('parent', 'child');

-- Add role to profiles
alter table public.profiles add column role user_role default 'parent';
alter table public.profiles add column avatar_url text;

-- Parent-child relationships
create table public.parent_child_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.profiles(id) on delete cascade not null,
  child_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(parent_id, child_id)
);

alter table public.parent_child_links enable row level security;

create policy "Parents can view their children"
  on public.parent_child_links for select
  using (auth.uid() = parent_id);

create policy "Parents can add children"
  on public.parent_child_links for insert
  with check (auth.uid() = parent_id);

create policy "Parents can remove children"
  on public.parent_child_links for delete
  using (auth.uid() = parent_id);

-- Child activity log for mirroring
create table public.child_activity (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.profiles(id) on delete cascade not null,
  activity_type text not null, -- 'page_view', 'answer_correct', 'answer_wrong', 'click'
  page_path text,
  details jsonb,
  created_at timestamp with time zone default now()
);

alter table public.child_activity enable row level security;

-- Children can insert their own activity
create policy "Children can log activity"
  on public.child_activity for insert
  with check (auth.uid() = child_id);

-- Parents can view their children's activity
create policy "Parents can view children activity"
  on public.child_activity for select
  using (
    exists (
      select 1 from public.parent_child_links
      where parent_id = auth.uid() and child_id = child_activity.child_id
    )
  );

-- AI analysis storage
create table public.child_analysis (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.profiles(id) on delete cascade not null unique,
  strengths jsonb default '[]',
  weaknesses jsonb default '[]',
  recommendations text,
  last_analyzed_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.child_analysis enable row level security;

create policy "Parents can view children analysis"
  on public.child_analysis for select
  using (
    exists (
      select 1 from public.parent_child_links
      where parent_id = auth.uid() and child_id = child_analysis.child_id
    )
  );

create policy "System can insert analysis"
  on public.child_analysis for insert
  with check (true);

create policy "System can update analysis"
  on public.child_analysis for update
  using (true);

-- Multiplayer game sessions
create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_type text not null, -- 'tic_tac_toe', 'checkers', 'chess'
  parent_id uuid references public.profiles(id) on delete cascade not null,
  child_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'waiting', -- 'waiting', 'active', 'finished'
  current_turn uuid,
  game_state jsonb not null,
  winner_id uuid references public.profiles(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.game_sessions enable row level security;

create policy "Players can view their games"
  on public.game_sessions for select
  using (auth.uid() = parent_id or auth.uid() = child_id);

create policy "Parents can create games"
  on public.game_sessions for insert
  with check (auth.uid() = parent_id);

create policy "Players can update their games"
  on public.game_sessions for update
  using (auth.uid() = parent_id or auth.uid() = child_id);

-- Enable realtime for activity and games
alter publication supabase_realtime add table public.child_activity;
alter publication supabase_realtime add table public.game_sessions;

-- Function to get parent's children with their progress
create or replace function public.get_children_with_progress(p_parent_id uuid)
returns table (
  child_id uuid,
  first_name text,
  avatar_url text,
  stars integer,
  level integer,
  experience integer,
  daily_streak integer
)
language sql
stable
security definer
set search_path = public
as $$
  select 
    p.id as child_id,
    p.first_name,
    p.avatar_url,
    coalesce(up.stars, 0) as stars,
    coalesce(up.level, 1) as level,
    coalesce(up.experience, 0) as experience,
    coalesce(up.daily_streak, 0) as daily_streak
  from parent_child_links pcl
  join profiles p on p.id = pcl.child_id
  left join user_progress up on up.user_id = p.id
  where pcl.parent_id = p_parent_id;
$$;