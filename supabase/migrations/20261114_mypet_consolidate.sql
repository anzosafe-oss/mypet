create schema mypet_private;
revoke all on schema mypet_private from public,anon;
grant usage on schema mypet_private to authenticated,service_role;
create table public."mypet_app_access" (
"email" text not null,
"user_id" uuid,
"status" text not null,
"created_at" timestamptz default now() not null,
"updated_at" timestamptz default now() not null,
"sent_at" timestamptz,
"send_count" int4 default 0 not null,
"error" text,
"delivery_key" uuid,
"delivery_started_at" timestamptz,
"last_seen_at" timestamptz);
create table public."pets" (
"id" uuid default gen_random_uuid() not null,
"user_id" uuid not null,
"name" text not null,
"breed" text default ''::text not null,
"birth" date not null,
"sex" text default 'Mascul'::text not null,
"breeder" text default ''::text not null,
"chip" text default ''::text not null,
"created_at" timestamptz default now() not null);
create table public."health_records" (
"id" uuid default gen_random_uuid() not null,
"user_id" uuid default auth.uid() not null,
"category" text not null,
"date" date not null,
"product" text default ''::text not null,
"next_date" date,
"weight" numeric,
"vet" text default ''::text not null,
"notes" text default ''::text not null,
"created_at" timestamptz default now() not null,
"pet_id" uuid not null);
create table public."mypet_push_config" (
"id" bool default true not null,
"keys" jsonb not null);
create table public."mypet_push_subscriptions" (
"id" uuid default gen_random_uuid() not null,
"user_id" uuid not null,
"endpoint" text not null,
"subscription" jsonb not null,
"created_at" timestamptz default now() not null);
create table public."mypet_push_deliveries" (
"id" uuid default gen_random_uuid() not null,
"subscription_id" uuid not null,
"record_id" uuid not null,
"next_date" date not null,
"created_at" timestamptz default now() not null,
"sent_at" timestamptz,
"stage" int4 default 7 not null);
alter table public."mypet_app_access" add constraint "mypet_app_access_email_check" CHECK (((email = lower(TRIM(BOTH FROM email))) AND (length(email) <= 254)));
alter table public."mypet_app_access" add constraint "mypet_app_access_pkey" PRIMARY KEY (email);
alter table public."mypet_app_access" add constraint "mypet_app_access_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'pending'::text, 'revoked'::text, 'failed'::text])));
alter table public."mypet_app_access" add constraint "mypet_app_access_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."pets" add constraint "pets_breed_check" CHECK ((length(breed) <= 100));
alter table public."pets" add constraint "pets_breeder_check" CHECK ((length(breeder) <= 100));
alter table public."pets" add constraint "pets_chip_check" CHECK ((length(chip) <= 30));
alter table public."pets" add constraint "pets_id_user_id_key" UNIQUE (id, user_id);
alter table public."pets" add constraint "pets_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 80)));
alter table public."pets" add constraint "pets_pkey" PRIMARY KEY (id);
alter table public."pets" add constraint "pets_sex_check" CHECK ((sex = ANY (ARRAY['Mascul'::text, 'Femelă'::text])));
alter table public."pets" add constraint "pets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."health_records" add constraint "health_records_category_check" CHECK ((category = ANY (ARRAY['Vaccinuri'::text, 'Vaccin Antirabic'::text, 'Deparazitari Interne'::text, 'Deparazitari Externe'::text, 'Greutate'::text])));
alter table public."health_records" add constraint "health_records_pet_owner_fkey" FOREIGN KEY (pet_id, user_id) REFERENCES pets(id, user_id) ON DELETE CASCADE;
alter table public."health_records" add constraint "health_records_pkey" PRIMARY KEY (id);
alter table public."health_records" add constraint "health_records_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."health_records" add constraint "valid_next_date" CHECK (((next_date IS NULL) OR (next_date >= date)));
alter table public."health_records" add constraint "valid_record" CHECK ((((category = 'Greutate'::text) AND (weight > (0)::numeric) AND (weight <= (150)::numeric) AND (weight IS NOT NULL) AND (next_date IS NULL)) OR ((category <> 'Greutate'::text) AND (length(TRIM(BOTH FROM product)) > 0) AND (weight IS NULL))));
alter table public."mypet_push_config" add constraint "mypet_push_config_id_check" CHECK (id);
alter table public."mypet_push_config" add constraint "mypet_push_config_pkey" PRIMARY KEY (id);
alter table public."mypet_push_subscriptions" add constraint "mypet_push_subscriptions_endpoint_key" UNIQUE (endpoint);
alter table public."mypet_push_subscriptions" add constraint "mypet_push_subscriptions_pkey" PRIMARY KEY (id);
alter table public."mypet_push_subscriptions" add constraint "mypet_push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."mypet_push_deliveries" add constraint "mypet_push_deliveries_pkey" PRIMARY KEY (id);
alter table public."mypet_push_deliveries" add constraint "mypet_push_deliveries_record_id_fkey" FOREIGN KEY (record_id) REFERENCES health_records(id) ON DELETE CASCADE;
alter table public."mypet_push_deliveries" add constraint "mypet_push_deliveries_stage_check" CHECK ((stage = ANY (ARRAY[1, 7])));
alter table public."mypet_push_deliveries" add constraint "mypet_push_deliveries_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES mypet_push_subscriptions(id) ON DELETE CASCADE;
alter table public."mypet_push_deliveries" add constraint "mypet_push_delivery_stage_unique" UNIQUE (subscription_id, record_id, next_date, stage);
CREATE OR REPLACE FUNCTION mypet_private.allowed_for(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select uid is not null and exists (
 select 1 from public.mypet_app_access a join auth.users u on u.id=uid
 where a.status in ('active','pending') and (a.user_id=uid or (a.user_id is null and a.email=lower(u.email)))
 and u.email_confirmed_at is not null)
$function$
;
CREATE OR REPLACE FUNCTION mypet_private.allowed()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select mypet_private.allowed_for((select auth.uid()))
$function$
;
CREATE OR REPLACE FUNCTION mypet_private.protect_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if new.status='revoked' and (new.email='anzo.safe@gmail.com') then
 raise exception 'Contul administratorului este protejat';end if;
 return new;
end$function$
;
CREATE OR REPLACE FUNCTION mypet_private.user_for_email(recipient text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$select id from auth.users where lower(email)=lower(trim(recipient))$function$
;
CREATE OR REPLACE FUNCTION mypet_private.visit()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not mypet_private.allowed() then raise exception 'Accesul la MyPet nu este activ';end if;
 update public.mypet_app_access set status='active',updated_at=now(),last_seen_at=now() where user_id=auth.uid() and status in ('pending','active');
end$function$
;
CREATE OR REPLACE FUNCTION public.enzo_recent_password()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) as entry
    where entry->>'method' = 'password'
      and (entry->>'timestamp')::numeric >= extract(epoch from now()) - 3600
      and (entry->>'timestamp')::numeric <= extract(epoch from now()) + 30
  );
$function$
;
CREATE OR REPLACE FUNCTION public.mypet_access_allowed_for(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$select mypet_private.allowed_for(uid)$function$
;
CREATE OR REPLACE FUNCTION public.mypet_access_status()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$select mypet_private.allowed()$function$
;
CREATE OR REPLACE FUNCTION public.mypet_finish_access_invite(recipient text, delivery uuid, recipient_id uuid, delivered boolean)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$begin
 if delivered and (recipient_id is null or mypet_private.user_for_email(recipient) is distinct from recipient_id) then raise exception 'Destinatarul nu a putut fi verificat';end if;
 update public.mypet_app_access set
 user_id=case when delivered then recipient_id else user_id end,
 status=case when delivered then 'pending' else status end,
 sent_at=case when delivered then now() else sent_at end,
 send_count=send_count+case when delivered then 1 else 0 end,
 updated_at=now(),delivery_key=null,error=case when delivered then null else 'E-mailul nu a fost trimis. Reîncearcă.' end
 where email=lower(trim(recipient)) and delivery_key=delivery;
 if not found then raise exception 'Trimiterea nu a putut fi confirmată';end if;
end$function$
;
CREATE OR REPLACE FUNCTION public.mypet_reserve_access_invite(recipient text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare em text:=lower(trim(recipient)); r public.mypet_app_access; k uuid:=gen_random_uuid(); target uuid; begin
 if em is null or length(em)>254 or em !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Adresa de e-mail nu este validă';end if;
 target:=mypet_private.user_for_email(em);
 if em='anzo.safe@gmail.com' then raise exception 'Contul administratorului este protejat';end if;
 insert into public.mypet_app_access(email,user_id,status) values(em,target,'failed') on conflict do nothing;
 select * into r from public.mypet_app_access where email=em for update;
 if r.status='active' then raise exception 'Contul are deja acces activ la MyPet';end if;
 if r.delivery_key is not null and r.delivery_started_at>now()-interval '2 minutes' then raise exception 'Invitația este deja în curs de trimitere';end if;
 if r.sent_at>now()-interval '60 seconds' then raise exception 'Așteaptă un minut înainte de retrimitere';end if;
 update public.mypet_app_access set delivery_key=k,delivery_started_at=now(),user_id=coalesce(user_id,target) where email=em;
 return jsonb_build_object('delivery_key',k,'user_id',coalesce(r.user_id,target));
end$function$
;
CREATE OR REPLACE FUNCTION public.mypet_revoke_access(recipient text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$declare r public.mypet_app_access;begin
 select * into r from public.mypet_app_access where email=lower(trim(recipient)) for update;
 if not found then raise exception 'Contul nu aparține MyPet';end if;
 if r.delivery_key is not null and r.delivery_started_at>now()-interval '2 minutes' then raise exception 'Așteaptă finalizarea trimiterii invitației';end if;
 update public.mypet_app_access set status='revoked',updated_at=now(),delivery_key=null where email=r.email;
 -- Global Auth sessions, other apps and all vehicle records are preserved.
end$function$
;
CREATE OR REPLACE FUNCTION public.mypet_visit()
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$select mypet_private.visit()$function$
;
revoke all on function mypet_private.allowed_for(uuid) from public,anon,authenticated,service_role;
grant execute on function mypet_private.allowed_for(uuid) to service_role;
revoke all on function mypet_private.allowed() from public,anon,authenticated,service_role;
grant execute on function mypet_private.allowed() to authenticated;
revoke all on function mypet_private.protect_admin() from public,anon,authenticated,service_role;
revoke all on function mypet_private.user_for_email(text) from public,anon,authenticated,service_role;
grant execute on function mypet_private.user_for_email(text) to service_role;
revoke all on function mypet_private.visit() from public,anon,authenticated,service_role;
grant execute on function mypet_private.visit() to authenticated;
revoke all on function enzo_recent_password() from public,anon,authenticated,service_role;
grant execute on function enzo_recent_password() to authenticated;
revoke all on function mypet_access_allowed_for(uuid) from public,anon,authenticated,service_role;
grant execute on function mypet_access_allowed_for(uuid) to service_role;
revoke all on function mypet_access_status() from public,anon,authenticated,service_role;
grant execute on function mypet_access_status() to authenticated;
revoke all on function mypet_finish_access_invite(text,uuid,uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function mypet_finish_access_invite(text,uuid,uuid,boolean) to service_role;
revoke all on function mypet_reserve_access_invite(text) from public,anon,authenticated,service_role;
grant execute on function mypet_reserve_access_invite(text) to service_role;
revoke all on function mypet_revoke_access(text) from public,anon,authenticated,service_role;
grant execute on function mypet_revoke_access(text) to service_role;
revoke all on function mypet_visit() from public,anon,authenticated,service_role;
grant execute on function mypet_visit() to authenticated;
alter table public."mypet_app_access" enable row level security;
revoke all on public."mypet_app_access" from public,anon,authenticated,service_role;
alter table public."pets" enable row level security;
revoke all on public."pets" from public,anon,authenticated,service_role;
alter table public."health_records" enable row level security;
revoke all on public."health_records" from public,anon,authenticated,service_role;
alter table public."mypet_push_config" enable row level security;
revoke all on public."mypet_push_config" from public,anon,authenticated,service_role;
alter table public."mypet_push_subscriptions" enable row level security;
revoke all on public."mypet_push_subscriptions" from public,anon,authenticated,service_role;
alter table public."mypet_push_deliveries" enable row level security;
revoke all on public."mypet_push_deliveries" from public,anon,authenticated,service_role;
grant SELECT on public."health_records" to service_role;
grant TRUNCATE on public."health_records" to service_role;
grant REFERENCES on public."health_records" to service_role;
grant TRIGGER on public."health_records" to service_role;
grant INSERT on public."health_records" to authenticated;
grant SELECT on public."health_records" to authenticated;
grant UPDATE on public."health_records" to authenticated;
grant DELETE on public."health_records" to authenticated;
grant INSERT on public."mypet_app_access" to service_role;
grant SELECT on public."mypet_app_access" to service_role;
grant UPDATE on public."mypet_app_access" to service_role;
grant DELETE on public."mypet_app_access" to service_role;
grant TRUNCATE on public."mypet_app_access" to service_role;
grant REFERENCES on public."mypet_app_access" to service_role;
grant TRIGGER on public."mypet_app_access" to service_role;
grant INSERT on public."pets" to authenticated;
grant SELECT on public."pets" to authenticated;
grant UPDATE on public."pets" to authenticated;
grant DELETE on public."pets" to authenticated;
grant TRUNCATE on public."pets" to service_role;
grant REFERENCES on public."pets" to service_role;
grant TRIGGER on public."pets" to service_role;
grant INSERT on public."mypet_push_config" to service_role;
grant SELECT on public."mypet_push_config" to service_role;
grant UPDATE on public."mypet_push_config" to service_role;
grant DELETE on public."mypet_push_config" to service_role;
grant TRUNCATE on public."mypet_push_config" to service_role;
grant REFERENCES on public."mypet_push_config" to service_role;
grant TRIGGER on public."mypet_push_config" to service_role;
grant INSERT on public."mypet_push_subscriptions" to service_role;
grant SELECT on public."mypet_push_subscriptions" to service_role;
grant UPDATE on public."mypet_push_subscriptions" to service_role;
grant DELETE on public."mypet_push_subscriptions" to service_role;
grant TRUNCATE on public."mypet_push_subscriptions" to service_role;
grant REFERENCES on public."mypet_push_subscriptions" to service_role;
grant TRIGGER on public."mypet_push_subscriptions" to service_role;
grant INSERT on public."mypet_push_deliveries" to service_role;
grant SELECT on public."mypet_push_deliveries" to service_role;
grant UPDATE on public."mypet_push_deliveries" to service_role;
grant DELETE on public."mypet_push_deliveries" to service_role;
grant TRUNCATE on public."mypet_push_deliveries" to service_role;
grant REFERENCES on public."mypet_push_deliveries" to service_role;
grant TRIGGER on public."mypet_push_deliveries" to service_role;
create policy "Read own records" on public."health_records" as PERMISSIVE for SELECT to authenticated using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Insert own records" on public."health_records" as PERMISSIVE for INSERT to authenticated with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Update own records" on public."health_records" as PERMISSIVE for UPDATE to authenticated using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Delete own records" on public."health_records" as PERMISSIVE for DELETE to authenticated using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Recent password for insert" on public."health_records" as RESTRICTIVE for INSERT to authenticated with check (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT enzo_recent_password() AS enzo_recent_password)));
create policy "Recent password for update" on public."health_records" as RESTRICTIVE for UPDATE to authenticated using (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT enzo_recent_password() AS enzo_recent_password))) with check (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT enzo_recent_password() AS enzo_recent_password)));
create policy "Recent password for delete" on public."health_records" as RESTRICTIVE for DELETE to authenticated using (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT enzo_recent_password() AS enzo_recent_password)));
create policy "pets_read" on public."pets" as PERMISSIVE for SELECT to authenticated using ((( SELECT auth.uid() AS uid) = user_id));
create policy "pets_insert" on public."pets" as PERMISSIVE for INSERT to authenticated with check (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT enzo_recent_password() AS enzo_recent_password)));
create policy "pets_update" on public."pets" as PERMISSIVE for UPDATE to authenticated using (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT enzo_recent_password() AS enzo_recent_password))) with check (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT enzo_recent_password() AS enzo_recent_password)));
create policy "pets_delete" on public."pets" as PERMISSIVE for DELETE to authenticated using (((( SELECT auth.uid() AS uid) = user_id) AND ( SELECT enzo_recent_password() AS enzo_recent_password)));
create policy "records_insert_recent_required" on public."health_records" as RESTRICTIVE for INSERT to authenticated with check (( SELECT enzo_recent_password() AS enzo_recent_password));
create policy "records_update_recent_required" on public."health_records" as RESTRICTIVE for UPDATE to authenticated using (( SELECT enzo_recent_password() AS enzo_recent_password)) with check (( SELECT enzo_recent_password() AS enzo_recent_password));
create policy "records_delete_recent_required" on public."health_records" as RESTRICTIVE for DELETE to authenticated using (( SELECT enzo_recent_password() AS enzo_recent_password));
create policy "mypet_membership_required" on public."pets" as RESTRICTIVE for ALL to authenticated using (( SELECT mypet_private.allowed() AS allowed)) with check (( SELECT mypet_private.allowed() AS allowed));
create policy "mypet_membership_required" on public."health_records" as RESTRICTIVE for ALL to authenticated using (( SELECT mypet_private.allowed() AS allowed)) with check (( SELECT mypet_private.allowed() AS allowed));
CREATE TRIGGER protect_mypet_admin BEFORE INSERT OR UPDATE ON public.mypet_app_access FOR EACH ROW EXECUTE FUNCTION mypet_private.protect_admin();
CREATE INDEX health_records_user_date_idx ON public.health_records USING btree (user_id, date DESC);
CREATE INDEX health_records_pet_id_user_id_idx ON public.health_records USING btree (pet_id, user_id);
CREATE INDEX pets_user_id_idx ON public.pets USING btree (user_id);
CREATE INDEX mypet_push_subscriptions_user_idx ON public.mypet_push_subscriptions USING btree (user_id);
CREATE INDEX mypet_push_deliveries_record_idx ON public.mypet_push_deliveries USING btree (record_id);
