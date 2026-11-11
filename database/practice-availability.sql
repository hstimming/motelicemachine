-- Final schema installed by add_practice_availability and scope_practice_availability_to_two_weeks.
-- New feature only; no existing tables or policies are modified.
create table public.practice_availability (
  user_id uuid not null references public.band_members(user_id) on delete cascade,
  week_start date not null default date_trunc('week',timezone('America/Chicago',now()))::date,
  slots integer[] not null default '{}',
  display_name text not null default 'Band member' check(char_length(display_name) between 1 and 80),
  primary key(user_id,week_start),
  constraint practice_week_is_monday check(extract(isodow from week_start)=1),
  constraint valid_practice_slots check(cardinality(slots)<=336 and 0<=all(slots) and 335>=all(slots) and array_position(slots,null) is null)
);
alter table public.practice_availability enable row level security;
revoke all on public.practice_availability from anon;
grant select,insert,update,delete on public.practice_availability to authenticated;
create policy "Members read practice availability" on public.practice_availability for select to authenticated using ((select public.is_band_member()));
create policy "Members insert own practice availability" on public.practice_availability for insert to authenticated with check ((select public.is_band_member()) and user_id=(select auth.uid()) and week_start in (date_trunc('week',timezone('America/Chicago',now()))::date,date_trunc('week',timezone('America/Chicago',now()))::date+7));
create policy "Members update own practice availability" on public.practice_availability for update to authenticated using ((select public.is_band_member()) and user_id=(select auth.uid())) with check ((select public.is_band_member()) and user_id=(select auth.uid()) and week_start in (date_trunc('week',timezone('America/Chicago',now()))::date,date_trunc('week',timezone('America/Chicago',now()))::date+7));
create policy "Members delete own practice availability" on public.practice_availability for delete to authenticated using ((select public.is_band_member()) and user_id=(select auth.uid()));
