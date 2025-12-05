-- Available room items (furniture, decorations)
create table public.room_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null, -- 'furniture', 'decoration', 'wallpaper', 'floor'
  icon text not null,
  price_stars integer default 0 not null,
  unlock_achievement_id uuid references public.achievements(id),
  width integer default 1 not null,
  height integer default 1 not null,
  created_at timestamp with time zone default now()
);

alter table public.room_items enable row level security;

create policy "Anyone can view room items"
  on public.room_items for select
  using (true);

-- User's owned room items
create table public.user_room_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_id uuid references public.room_items(id) on delete cascade not null,
  position_x integer default 0,
  position_y integer default 0,
  is_placed boolean default false,
  purchased_at timestamp with time zone default now()
);

alter table public.user_room_items enable row level security;

create policy "Users can view own room items"
  on public.user_room_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own room items"
  on public.user_room_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own room items"
  on public.user_room_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own room items"
  on public.user_room_items for delete
  using (auth.uid() = user_id);

-- Available pets
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  species text not null, -- 'cat', 'dog', 'hamster', 'rabbit', 'bird'
  icon text not null,
  price_stars integer default 0 not null,
  created_at timestamp with time zone default now()
);

alter table public.pets enable row level security;

create policy "Anyone can view pets"
  on public.pets for select
  using (true);

-- User's pet
create table public.user_pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  pet_id uuid references public.pets(id) on delete cascade not null,
  pet_name text not null,
  happiness integer default 100 not null check (happiness >= 0 and happiness <= 100),
  hunger integer default 100 not null check (hunger >= 0 and hunger <= 100),
  energy integer default 100 not null check (energy >= 0 and energy <= 100),
  last_fed_at timestamp with time zone default now(),
  last_played_at timestamp with time zone default now(),
  adopted_at timestamp with time zone default now()
);

alter table public.user_pets enable row level security;

create policy "Users can view own pets"
  on public.user_pets for select
  using (auth.uid() = user_id);

create policy "Users can insert own pets"
  on public.user_pets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pets"
  on public.user_pets for update
  using (auth.uid() = user_id);

-- Gallery items (user's creative works)
create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  image_data text not null, -- base64 encoded image
  category text not null, -- 'drawing', 'coloring'
  created_at timestamp with time zone default now()
);

alter table public.gallery_items enable row level security;

create policy "Users can view own gallery"
  on public.gallery_items for select
  using (auth.uid() = user_id);

create policy "Users can insert to gallery"
  on public.gallery_items for insert
  with check (auth.uid() = user_id);

create policy "Users can delete from gallery"
  on public.gallery_items for delete
  using (auth.uid() = user_id);

-- Insert initial room items
insert into public.room_items (name, description, category, icon, price_stars, width, height) values
-- Мебель
('Кроватка', 'Уютная кроватка для отдыха', 'furniture', '🛏️', 50, 2, 1),
('Столик', 'Маленький столик для игр', 'furniture', '🪑', 30, 1, 1),
('Книжная полка', 'Полка для любимых книг', 'furniture', '📚', 40, 1, 2),
('Игровой коврик', 'Мягкий коврик для игр', 'furniture', '🎪', 25, 2, 2),
('Кресло-мешок', 'Удобное кресло для чтения', 'furniture', '🛋️', 35, 1, 1),
('Шкафчик', 'Шкаф для хранения сокровищ', 'furniture', '🗄️', 45, 1, 2),
-- Украшения
('Звёздочки', 'Светящиеся звёзды на стену', 'decoration', '⭐', 15, 1, 1),
('Радуга', 'Красивая радуга', 'decoration', '🌈', 20, 2, 1),
('Цветы', 'Горшок с цветами', 'decoration', '🌸', 10, 1, 1),
('Воздушные шары', 'Яркие шарики', 'decoration', '🎈', 12, 1, 1),
('Плюшевый мишка', 'Мягкая игрушка', 'decoration', '🧸', 18, 1, 1),
('Ночник-луна', 'Светящаяся луна', 'decoration', '🌙', 25, 1, 1),
('Картина', 'Красивая картина', 'decoration', '🖼️', 30, 1, 1),
('Гирлянда', 'Праздничная гирлянда', 'decoration', '🎊', 22, 2, 1),
-- Обои
('Голубые обои', 'Небесно-голубые обои', 'wallpaper', '🔵', 40, 0, 0),
('Розовые обои', 'Нежно-розовые обои', 'wallpaper', '🩷', 40, 0, 0),
('Зелёные обои', 'Травянисто-зелёные обои', 'wallpaper', '🟢', 40, 0, 0),
('Звёздное небо', 'Обои со звёздами', 'wallpaper', '🌌', 60, 0, 0),
-- Полы
('Деревянный пол', 'Тёплый деревянный пол', 'floor', '🟫', 35, 0, 0),
('Ковёр', 'Мягкий пушистый ковёр', 'floor', '🟪', 45, 0, 0),
('Травка', 'Зелёный газон', 'floor', '🟩', 50, 0, 0);

-- Insert available pets
insert into public.pets (name, species, icon, price_stars) values
('Котёнок', 'cat', '🐱', 100),
('Щенок', 'dog', '🐶', 100),
('Хомячок', 'hamster', '🐹', 80),
('Кролик', 'rabbit', '🐰', 90),
('Попугай', 'bird', '🦜', 85),
('Черепашка', 'turtle', '🐢', 75),
('Рыбка', 'fish', '🐠', 60),
('Ёжик', 'hedgehog', '🦔', 95);