-- Somden DB 스키마 (Kakao OAuth + RLS 버전)
-- Supabase 대시보드 > SQL Editor 에서 그대로 실행하세요.
-- 기존 킥오프 문서(섹션 7) 스키마에 auth.users 연동 + RLS 정책을 추가한 버전입니다.

-- ============ profiles ============
-- Kakao 로그인 시 auth.users에 자동 생성되는 계정과 1:1로 연결됩니다.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '이름 없음',
  role text check (role in ('viewer','gardener')),
  relation_label text,
  avatar jsonb not null default '{}',   -- {bodyColor, footColor, brows, hat, cheek}
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles are readable by any signed-in user"
  on profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============ pairings ============
create table pairings (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,            -- 6자리
  viewer_id uuid references profiles(id),
  gardener_id uuid references profiles(id),
  status text default 'pending' check (status in ('pending','linked')),
  created_at timestamptz default now()
);

alter table pairings enable row level security;

-- 코드를 아는 사람만 pending 상태의 페어링을 조회/입장할 수 있음 (6자리 코드 = 초대장 역할)
create policy "pending pairings are discoverable by code, linked ones only by members"
  on pairings for select
  to authenticated
  using (status = 'pending' or auth.uid() in (viewer_id, gardener_id));

create policy "signed-in users can create a pairing as one side"
  on pairings for insert
  to authenticated
  with check (auth.uid() in (viewer_id, gardener_id));

create policy "the empty side of a pending pairing can be filled in to link it"
  on pairings for update
  to authenticated
  using (status = 'pending')
  with check (status in ('pending', 'linked') and auth.uid() in (viewer_id, gardener_id));

-- ============ 페어링 멤버십 체크 헬퍼 ============
create or replace function public.is_pairing_member(target_pairing_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from pairings
    where id = target_pairing_id
      and auth.uid() in (viewer_id, gardener_id)
  );
$$;

-- ============ 활동 로그 ============
create table activity_logs (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id),
  ts timestamptz not null,
  kind text not null check (kind in ('wake','light','walk','still','sleep')),
  intensity int default 1,
  created_at timestamptz default now()
);

alter table activity_logs enable row level security;
create policy "pairing members can read activity_logs" on activity_logs for select using (is_pairing_member(pairing_id));
create policy "pairing members can write activity_logs" on activity_logs for insert with check (is_pairing_member(pairing_id));

-- ============ 육성 자원 ============
create table resources (
  pairing_id uuid primary key references pairings(id),
  seeds int default 0,
  updated_at timestamptz default now()
);

alter table resources enable row level security;
create policy "pairing members can read resources" on resources for select using (is_pairing_member(pairing_id));
create policy "pairing members can upsert resources" on resources for insert with check (is_pairing_member(pairing_id));
create policy "pairing members can update resources" on resources for update using (is_pairing_member(pairing_id));

-- ============ 드롭 아이템 ============
create table drops (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id),
  kind text not null,                   -- acorn, flower, shell...
  x real, y real,                       -- 등장 좌표(0~1)
  harvested boolean default false,
  created_at timestamptz default now()
);

alter table drops enable row level security;
create policy "pairing members can read drops" on drops for select using (is_pairing_member(pairing_id));
create policy "pairing members can write drops" on drops for insert with check (is_pairing_member(pairing_id));
create policy "pairing members can update drops" on drops for update using (is_pairing_member(pairing_id));

-- ============ 심은 것들 ============
create table plantings (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id),
  kind text not null,                   -- flower kind
  x real, y real,
  planted_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table plantings enable row level security;
create policy "pairing members can read plantings" on plantings for select using (is_pairing_member(pairing_id));
create policy "pairing members can write plantings" on plantings for insert with check (is_pairing_member(pairing_id));

-- ============ 함께 키우는 나무 ============
create table coop_tree (
  pairing_id uuid primary key references pairings(id),
  parent_progress int default 0,        -- 0~100 (활동 기여)
  child_progress int default 0,         -- 0~100 (돌봄 기여)
  stage int default 0,                  -- 성장 단계
  updated_at timestamptz default now()
);

alter table coop_tree enable row level security;
create policy "pairing members can read coop_tree" on coop_tree for select using (is_pairing_member(pairing_id));
create policy "pairing members can upsert coop_tree" on coop_tree for insert with check (is_pairing_member(pairing_id));
create policy "pairing members can update coop_tree" on coop_tree for update using (is_pairing_member(pairing_id));

-- ============ 퀘스트 ============
create table quests (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id),
  profile_id uuid references profiles(id),
  kind text not null,                   -- sticker, note, harvest...
  reward_seeds int default 2,
  done boolean default false,
  quest_date date default current_date
);

alter table quests enable row level security;
create policy "pairing members can read quests" on quests for select using (is_pairing_member(pairing_id));
create policy "pairing members can write quests" on quests for insert with check (is_pairing_member(pairing_id));
create policy "pairing members can update quests" on quests for update using (is_pairing_member(pairing_id));

-- ============ 스티커 & 쪽지 ============
create table stickers (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id),
  from_id uuid references profiles(id),
  emoji text not null, x real, y real,
  created_at timestamptz default now()
);

alter table stickers enable row level security;
create policy "pairing members can read stickers" on stickers for select using (is_pairing_member(pairing_id));
create policy "pairing members can write stickers" on stickers for insert with check (is_pairing_member(pairing_id));

create table notes (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id),
  from_id uuid references profiles(id),
  paths jsonb not null,                 -- [{d,color,width}]
  read boolean default false,
  created_at timestamptz default now()
);

alter table notes enable row level security;
create policy "pairing members can read notes" on notes for select using (is_pairing_member(pairing_id));
create policy "pairing members can write notes" on notes for insert with check (is_pairing_member(pairing_id));
create policy "pairing members can update notes" on notes for update using (is_pairing_member(pairing_id));
