-- 채팅 이모티콘: 내가 만든 이모티콘 삭제 (2026-11-17, 오너 요청)
-- 먼저 supabase-emotes-2026-11-17.sql 과 supabase-emote-packs-2026-11-17.sql 을 실행한 뒤에 이 파일을 실행해요.
-- 하는 일: 만든 사람이 자기 이모티콘을 지우는 함수(ffc_emote_delete)를 만들어요.
--   * 이미 보낸 메시지의 그림은 메시지 안에 저장돼 있어서 지워도 그대로 보여요.
--   * mode 'all' (지금 앱이 쓰는 방식): 산 사람 목록에서도 같이 지워져요.
--   * mode 'keep': 산 사람이 있으면 상점·팩에서만 내리고 산 사람은 계속 써요.   mode 'block': 산 사람이 있으면 지우지 못하게 막아요.
--   * 지운 이모티콘이 든 팩은 개수가 다시 계산되고, 비게 되면 팩도 같이 지워져요.
-- 여러 번 실행해도 안전해요. 쓰는 법: Supabase 왼쪽 SQL Editor → New query → 이 파일 전체를 붙여 넣고 Run.

alter table public.ffc_emote_own add column if not exists hidden boolean not null default false;
alter table public.ffc_emotes add column if not exists deleted boolean not null default false;

create or replace function public.ffc_emote_delete(p_id uuid, p_mode text default 'all')
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); e public.ffc_emotes; others boolean; affected uuid[]; res text; md text := coalesce(p_mode, 'all');
begin
  if uid is null then raise exception 'login required'; end if;
  select * into e from public.ffc_emotes x where x.id = p_id and x.owner = uid for update;
  if not found then raise exception 'not yours'; end if;
  others := exists (select 1 from public.ffc_emote_own o where o.emote_id = p_id and o.user_id <> uid);
  select array_agg(distinct i.pack_id) into affected from public.ffc_pack_items i where i.emote_id = p_id;
  if others and md = 'block' then raise exception 'has buyers'; end if;
  if others and md = 'keep' then
    update public.ffc_emotes set listed = false, deleted = true where id = p_id;
    delete from public.ffc_pack_items where emote_id = p_id;
    update public.ffc_emote_own set hidden = true where emote_id = p_id and user_id = uid;
    res := 'kept';
  else
    delete from public.ffc_emotes where id = p_id;
    res := 'deleted';
  end if;
  if affected is not null then
    update public.ffc_emote_packs k set n = (select count(*) from public.ffc_pack_items i where i.pack_id = k.id) where k.id = any(affected);
    delete from public.ffc_emote_packs where id = any(affected) and n = 0;
  end if;
  return res;
end $$;
revoke all on function public.ffc_emote_delete(uuid, text) from public, anon;
grant execute on function public.ffc_emote_delete(uuid, text) to authenticated;
