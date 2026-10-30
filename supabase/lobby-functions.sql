-- Dominó Suporte: operações seguras de lobby.
-- Execute depois de schema.sql no SQL Editor do Supabase.

alter table public.room_players
  add column if not exists player_token_hash text;

create unique index if not exists room_players_token_room_idx
  on public.room_players(room_id, player_token_hash)
  where player_token_hash is not null;

create or replace function public.create_domino_room(
  p_display_name text,
  p_player_token uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room_id uuid;
  v_code text;
  v_player_id uuid;
begin
  if p_display_name is null or length(trim(p_display_name)) < 1 or length(trim(p_display_name)) > 18 then
    raise exception 'Nome inválido. Use de 1 a 18 caracteres.';
  end if;
  if p_player_token is null then raise exception 'Token do jogador ausente.'; end if;

  loop
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    exit when not exists (select 1 from rooms where code = v_code);
  end loop;

  insert into rooms(code) values (v_code) returning id into v_room_id;

  insert into room_players(room_id, display_name, seat, is_host, player_token_hash)
  values (v_room_id, trim(p_display_name), 0, true, encode(digest(p_player_token::text, 'sha256'), 'hex'))
  returning id into v_player_id;

  return jsonb_build_object('room_id', v_room_id, 'code', v_code, 'player_id', v_player_id, 'seat', 0);
end;
$$;

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
  v_room rooms%rowtype;
  v_seat integer;
  v_player_id uuid;
begin
  if p_display_name is null or length(trim(p_display_name)) < 1 or length(trim(p_display_name)) > 18 then
    raise exception 'Nome inválido. Use de 1 a 18 caracteres.';
  end if;
  if p_player_token is null then raise exception 'Token do jogador ausente.'; end if;

  select * into v_room from rooms where code = upper(trim(p_code)) and status = 'waiting' for update;
  if not found then raise exception 'Sala não encontrada ou já iniciada.'; end if;

  if exists (
    select 1 from room_players
    where room_id = v_room.id
      and player_token_hash = encode(digest(p_player_token::text, 'sha256'), 'hex')
  ) then
    raise exception 'Este jogador já está nesta sala.';
  end if;

  select s into v_seat
  from generate_series(0,3) s
  where not exists (select 1 from room_players rp where rp.room_id = v_room.id and rp.seat = s)
  order by s
  limit 1;

  if v_seat is null then raise exception 'A sala já está completa.'; end if;

  insert into room_players(room_id, display_name, seat, player_token_hash)
  values (v_room.id, trim(p_display_name), v_seat, encode(digest(p_player_token::text, 'sha256'), 'hex'))
  returning id into v_player_id;

  return jsonb_build_object('room_id', v_room.id, 'code', v_room.code, 'player_id', v_player_id, 'seat', v_seat);
end;
$$;

revoke all on function public.create_domino_room(text, uuid) from public;
revoke all on function public.join_domino_room(text, text, uuid) from public;
grant execute on function public.create_domino_room(text, uuid) to anon, authenticated;
grant execute on function public.join_domino_room(text, text, uuid) to anon, authenticated;
