-- Dominó Suporte: base inicial para salas e participantes.
-- Execute no SQL Editor do Supabase.
-- As políticas permitem leitura de salas abertas; operações de jogo serão feitas
-- por funções RPC validadas na próxima etapa (não liberar escrita direta no estado).

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  status text not null default 'waiting' check (status in ('waiting','playing','finished')),
  team_a_score integer not null default 0 check (team_a_score >= 0),
  team_b_score integer not null default 0 check (team_b_score >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 18),
  seat smallint not null check (seat between 0 and 3),
  team smallint generated always as (seat % 2) stored,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, seat)
);

create index if not exists room_players_room_id_idx on public.room_players(room_id);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- Salas em espera podem ser consultadas pelo código para permitir entrada.
drop policy if exists "Anyone can view waiting rooms" on public.rooms;
create policy "Anyone can view waiting rooms"
on public.rooms for select
to anon, authenticated
using (status = 'waiting');

-- Participantes são visíveis para montar a lista de lugares da sala.
drop policy if exists "Anyone can view room players" on public.room_players;
create policy "Anyone can view room players"
on public.room_players for select
to anon, authenticated
using (exists (
  select 1 from public.rooms r
  where r.id = room_players.room_id and r.status = 'waiting'
));

-- Não há políticas de INSERT/UPDATE/DELETE intencionalmente.
-- A criação/entrada/saída e as jogadas devem usar RPCs com validação
-- para impedir ocupação de assentos, trapaças e exposição das mãos dos jogadores.

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;