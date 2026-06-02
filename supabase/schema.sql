-- =============================================
-- サンワテック 勤怠管理システム — Supabase SQL
-- =============================================

-- 従業員テーブル
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pin text not null,        -- 4桁PINをそのまま保存（小規模運用のため）
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

-- 打刻ログテーブル
create table if not exists attendance_logs (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  work_date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  created_at timestamptz default now()
);

-- インデックス
create index if not exists idx_attendance_staff_date on attendance_logs(staff_id, work_date);
create index if not exists idx_attendance_work_date on attendance_logs(work_date);

-- =============================================
-- RLS（Row Level Security）設定
-- =============================================
alter table staff enable row level security;
alter table attendance_logs enable row level security;

-- anon（未認証ユーザー）がstaffテーブルを読めるように
-- ※PINで認証するシンプル運用のため
create policy "allow_anon_read_staff" on staff
  for select using (true);

-- anon が自分のattendance_logsを操作できるように
create policy "allow_anon_all_attendance" on attendance_logs
  for all using (true) with check (true);

-- =============================================
-- 初期データ（従業員 + PIN）
-- =============================================
-- ⚠️ 本番運用前にPINを変更してください
insert into staff (name, pin, is_admin) values
  ('田中 太郎', '1234', false),
  ('佐藤 花子', '2345', false),
  ('鈴木 一郎', '3456', false),
  ('山田 次郎', '4567', false),
  ('伊藤 三郎', '5678', false),
  ('管理者', '0000', true)
on conflict (name) do nothing;
