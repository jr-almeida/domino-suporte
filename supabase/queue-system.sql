-- Dominó Suporte: fila de espera e entrada automática na fila.
-- Execute este arquivo no SQL Editor do Supabase depois dos scripts anteriores.

create table if not exists public.room_queue (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 18),
  player_token_hash text not null,
  queue_order bigint generated always as identity,
  joined_at timestamptz not null default now(),
  unique (room_id, player_token_hash)
);

create index if not exists room_queue_order_idx
  on public.room_queue(room_id, queue_order);

alter table public.room_queue enable row level security;

drop policy if exists "Anyone can view room queue" on public.room_queue;
create policy "Anyone can view room queue"
on public.room_queue for select
to anon, authenticated
using (exists (
  select 1 from public.rooms r
  where r.id = room_queue.room_id and r.status in ('waiting', 'playing')
));

drop policy if exists "Anyone can view room players" on public.room_players;
create policy "Anyone can view room players"
on public.room_players for select
to anon, authenticated
using (exists (
  select 1 from public.rooms r
  where r.id = room_players.room_id and r.status in ('waiting', 'playing')
));

drop policy if exists "Anyone can view waiting rooms" on public.rooms;
create policy "Anyone can view waiting rooms"
on public.rooms for select
to anon, authenticated
using (status in ('waiting', 'playing'));

create or replace function public.join_domino_room(
  p_code text,
  p_display_name text,
  p_player_token uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room public.rooms%rowtype;
  v_seat integer;
  v_player_id uuid;
  v_token_hash text;
  v_queue_position bigint;
begin
  if p_display_name is null or length(trim(p_display_name)) < 1 or length(trim(p_display_name)) > 18 then
    raise exception 'Nome inválido. Use de 1 a 18 caracteres.';
  end if;
  if p_player_token is null then raise exception 'Token do jogador ausente.'; end if;

  select * into v_room
  from public.rooms
  where code = upper(trim(p_code)) and status = 'waiting'
  for update;

  if not found then raise exception 'Sala não encontrada ou já iniciada.'; end if;

  v_token_hash := encode(digest(p_player_token::text, 'sha256'), 'hex');

  if exists (
    select 1 from public.room_players
    where room_id = v_room.id and player_token_hash = v_token_hash
  ) or exists (
    select 1 from public.room_queue
    where room_id = v_room.id and player_token_hash = v_token_hash
  ) then
    raise exception 'Este jogador já está nesta sala.';
  end if;

  select s into v_seat
  from generate_series(0,3) s
  where not exists (
    select 1 from public.room_players rp
    where rp.room_id = v_room.id and rp.seat = s
  )
  order by s
  limit 1;

  if v_seat is not null then
    insert into public.room_players(room_id, display_name, seat, player_token_hash)
    values (v_room.id, trim(p_display_name), v_seat, v_token_hash)
    returning id into v_player_id;

    return jsonb_build_object(
      'room_id', v_room.id, 'code', v_room.code,
      'player_id', v_player_id, 'seat', v_seat, 'queued', false
    );
  end if;

  insert into public.room_queue(room_id, display_name, player_token_hash)
  values (v_room.id, trim(p_display_name), v_token_hash)
  returning queue_order into v_queue_position;

  return jsonb_build_object(
    'room_id', v_room.id, 'code', v_room.code,
    'queued', true, 'queue_position', v_queue_position
  );
end;
$$;

revoke all on function public.join_domino_room(text, text, uuid) from public;
grant execute on function public.join_domino_room(text, text, uuid) to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_queue'
  ) then
    alter publication supabase_realtime add table public.room_queue;
  end if;
end $$;
