create table public.card_activities (
  id uuid default gen_random_uuid() primary key,
  card_id uuid references public.cards(id) on delete cascade not null,
  from_column_id uuid references public.columns(id) on delete set null,
  to_column_id uuid references public.columns(id) on delete set null,
  from_column_title text,
  to_column_title text,
  moved_at timestamptz default now()
);

create index idx_card_activities_card on public.card_activities(card_id, moved_at desc);

alter table public.card_activities enable row level security;

create policy "users can view activities of own cards"
  on public.card_activities for select
  using (
    exists (
      select 1 from public.cards
      join public.columns on columns.id = cards.column_id
      join public.boards on boards.id = columns.board_id
      where cards.id = card_activities.card_id
      and boards.user_id = auth.uid()
    )
  );

create policy "users can insert activities for own cards"
  on public.card_activities for insert
  with check (
    exists (
      select 1 from public.cards
      join public.columns on columns.id = cards.column_id
      join public.boards on boards.id = columns.board_id
      where cards.id = card_activities.card_id
      and boards.user_id = auth.uid()
    )
  );
