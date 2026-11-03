alter table users enable row level security;
alter table sessions enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table reviews enable row level security;
alter table customers enable row level security;
alter table coupons enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table audit_logs enable row level security;
alter table settings enable row level security;
alter table images enable row level security;
alter table rate_limits enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from authenticated;
  end if;
end $$;
