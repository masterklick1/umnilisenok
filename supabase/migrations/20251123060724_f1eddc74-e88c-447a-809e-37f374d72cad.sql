-- Create profiles table for user information
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- Profiles RLS policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Create user_progress table for tracking stars, level, and experience
create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  stars integer default 0 not null,
  level integer default 1 not null,
  experience integer default 0 not null,
  daily_streak integer default 0 not null,
  last_activity_date date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.user_progress enable row level security;

-- User progress RLS policies
create policy "Users can view own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.user_progress for update
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

-- Create achievements table
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null, -- 'math', 'alphabet', 'world', 'creativity'
  icon text not null, -- emoji or icon name
  reward_stars integer default 0 not null,
  requirement_type text not null, -- 'count', 'streak', 'level', 'custom'
  requirement_value integer not null,
  created_at timestamp with time zone default now()
);

alter table public.achievements enable row level security;

-- Achievements are public (everyone can see available achievements)
create policy "Anyone can view achievements"
  on public.achievements for select
  to authenticated
  using (true);

-- Create user_achievements junction table
create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  achievement_id uuid references public.achievements(id) on delete cascade not null,
  unlocked_at timestamp with time zone default now(),
  unique(user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

-- User achievements RLS policies
create policy "Users can view own achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

create policy "Users can insert own achievements"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert into profiles
  insert into public.profiles (id, email, first_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1))
  );
  
  -- Insert initial progress
  insert into public.user_progress (user_id)
  values (new.id);
  
  return new;
end;
$$;

-- Create trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add triggers for updated_at
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_user_progress_updated_at
  before update on public.user_progress
  for each row execute function public.update_updated_at_column();

-- Insert some initial achievements
insert into public.achievements (title, description, category, icon, reward_stars, requirement_type, requirement_value) values
('Первые шаги', 'Получи первую звезду', 'math', '⭐', 5, 'count', 1),
('Счетовод', 'Реши 10 задач по математике', 'math', '🔢', 10, 'count', 10),
('Математик', 'Реши 50 задач по математике', 'math', '🧮', 25, 'count', 50),
('Знаток букв', 'Изучи весь алфавит', 'alphabet', '📚', 15, 'count', 33),
('Художник', 'Создай 5 рисунков', 'creativity', '🎨', 10, 'count', 5),
('Творец', 'Создай 20 рисунков', 'creativity', '🖼️', 20, 'count', 20),
('Исследователь', 'Пройди 10 уроков про окружающий мир', 'world', '🌍', 15, 'count', 10),
('Ударник', 'Занимайся 7 дней подряд', 'streak', '🔥', 20, 'streak', 7),
('Марафонец', 'Занимайся 30 дней подряд', 'streak', '🏆', 50, 'streak', 30);