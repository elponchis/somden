# Somden — 개발 착수 패키지 (v2 최종)

> **한 줄 정의:** 떨어져 사는 가족의 실제 하루(폰 활동 신호)가 자동으로 정원이 되고, 부모와 자녀가 *함께* 그 정원을 키우는 육성형 안부 서비스.
> **태그라인:** "당신의 하루가, 누군가의 정원이 됩니다."
> **주제 연결:** "기술이 앗아간 온기를, 기술로 되돌립니다." — 혼자 키우는 정원이 아니라, 부모의 하루와 자녀의 마음이 만나야 자라는 정원.
> **차별점:** 안부 앱은 전부 '경보'다. Somden은 '평범한 잘 지냄'을 매일 정원으로 선물하고, 그걸 함께 키운다.

---

## 0. 해커톤 제약 (반드시 기억)

- 개발 시간: 18:10 시작 → 익일 09:00 제출 (약 14시간, 밤샘)
- 발표: **온라인 화면공유**, 팀당 10분, 실제 시연 필수 (시연 못하면 완성도 0점)
- 배포: GitHub + Vercel
- 데모 원칙: **실시간 센서 대기 금지.** 하루치 활동 로그를 "압축 재생"으로 시연. 네트워크·센서 권한 리스크 제거.

---

## 1. 비주얼 방향 (수많은 반복 끝에 확정된 최종)

### 핵심 결론
- **마스코트 = 코드 SVG** (커스터마이징·애니메이션 필요). 몸 색은 사용자가 바꾸므로 특정 색값에 의존하지 말 것 — 색과 무관하게 배경에 녹이는 4가지(아래)로 처리.
- **배경 = AI 생성 이미지** (고양이와 스프 톤: 부드러운 음영, 따뜻한 파스텔). `public/`에 시간대별 4장.
- **접지**: 마스코트 발밑 진한 그림자 + 잔디 무대 타원. 이걸로 "붕뜸" 최소화. (움직이면 거의 인지 안 됨)
- 스티커 = 시스템 이모지 (에셋 0). 손글씨·꽃·아이템 = 코드.

### 마스코트를 배경에 녹이는 법 (색 무관 — 커스터마이징 고려)
마스코트 몸 색은 사용자가 커스터마이징하므로, "배경에 맞는 완벽한 초록 하나"를 찾는 건 무의미. 대신 **어떤 색을 골라도** 배경에 어울리게 만드는 색-독립적 장치 4가지로 처리한다:
1. **채도 억제** — 사용자가 고른 색에 전역 뮤트 필터(saturation −10~15%)를 걸어 배경의 차분한 톤과 항상 어울리게. 사용자는 원하는 색을 고르되 시스템이 살짝 눌러줌.
2. **진한 접지 그림자 + 잔디 무대** — 색과 완전 무관. 발밑 따뜻한 갈색 그림자(opacity ~0.34) + 잔디 무대 타원. 무슨 색이든 땅에 붙어 보임.
3. **연필 질감 필터**(feTurbulence) — 색 무관. 어떤 색이든 손그림 질감이 입혀져 배경 결과 매치.
4. **팔레트 제한** — 커스터마이징 선택지를 배경 친화적인 뮤트 파스텔(세이지·살구·라벤더·크림·더스티블루 등)로만 제공. 쨍한 원색 배제 → 뭘 골라도 안 튐.
- gradient 3톤 음영은 유지하되, hi/mid/lo를 "고른 색 기준 상대 밝기"로 생성(예: base에서 밝기 ±15%)하면 어떤 색이든 입체감이 나옴.

### 색 토큰
| 이름 | HEX | 용도 |
|---|---|---|
| cream | `#FBF3E6` | UI 카드 바탕(순백 금지) |
| cream-deep | `#EDE4CF` | 구분면 |
| garden-green | `#7B9E6E` | 마스코트/포인트 |
| green-foot | `#5E7D52` | 발·새싹 |
| green-hi | `#A8C594` | 마스코트 하이라이트 |
| green-shadow | `#6E9160` | 마스코트 음영 |
| soft-purple | `#C9A9E8` | 자녀 기여/보조 |
| purple-ink | `#534AB7` | 버튼 텍스트 |
| cheek-pink | `#EE9A94` | 볼터치·하트 |
| ink | `#2E3A28` | 눈·텍스트(순검정 금지) |

> **마스코트 몸 색은 위 토큰이 기본값일 뿐, 사용자가 커스터마이징함.** 커스터마이징 팔레트는 배경 친화적 뮤트 파스텔로 제한: 세이지 `#8FAE74` / 살구 `#E0A77E` / 라벤더 `#B9A6D8` / 크림옐로 `#E8C98A` / 더스티블루 `#89A6BE` / 로즈 `#D89AA0`. 눈·볼터치·새싹은 고정, 몸·발 색만 교체.

- 그림자: 크고 흐리고 연하게 `0 6px 20px rgba(120,110,180,0.10)`.
- 모서리: 카드 16~20px, 버튼 12px. 넉넉한 여백.
- 폰트: 한글 둥근 폰트(Pretendard/Gmarket Sans) CDN. 손글씨 영역만 손글씨체.
- 모션: **Framer Motion** spring 필수. 말랑함이 완성도의 절반.

### 브랜드
- 서비스명 **Somden** (다솜 + garden). 파비콘: 새싹 젤리 마스코트(`somden-mascot-icon.svg` 동봉).
- 캐릭터 이름 추후. 라이선스 0 (전부 자체 제작) → 상업화 어필 포인트.

---

## 2. 화면 레이아웃 (3분할 원칙)

배경 그림이 항상 주인공이 되도록, UI는 배경 위 반투명 레이어로 분리.

- **상단 = 정보만** — 누구 정원인지, 활동 상태·시각, 알림. 조작 버튼 없음. 반투명 크림 pill.
- **중앙 = 정원 무대** — 배경 이미지 + 마스코트 + 스티커 + 아이템. 스티커는 중앙 잔디에만 유도(양옆 꽃밭과 안 겹치게).
- **하단 = 컨트롤** — 탭 바 + (꾸미기 시)스티커 트레이.

### 탭 (MVP는 3개만)
`정원(홈)` / `꾸미기` / `손글씨`. 캐릭터 커스터마이징은 꾸미기 안에, 타임라인(하루)은 정원 홈 상단 스크러버로. (5탭은 밤샘에 과함)

---

## 3. 핵심 기능 = 육성 게임 루프

관찰형이 아니라 육성형. **부모의 실제 활동이 게임 자원이 된다.**

### 메인 루프
```
부모 활동 신호(기상/산책/움직임)
  → 마스코트가 총총 이동(hop)하며 발자국 남김
  → 도착 지점에 아이템 등장(도토리/꽃/조개 등, 반짝임)
  → 탭하면 수확 → 씨앗/자원 +1
  → 씨앗으로 정원에 꽃 심기·나무 키우기
  → 정원이 자랄수록 마스코트 성장·파츠 해금 (← 유료화)
```
*서사 연결: "부모가 잘 지낼수록 자녀의 정원이 풍성해진다." 매일 앱을 여는 행위가 곧 안부 확인.*

### 이동/수확 표현 (구현 디테일)
- 마스코트는 **화면을 가로지르지 않음.** 중앙 무대 안에서 짧게 2~4번 hop 후 정지.
- hop = y튀기기 + squash&stretch. 지나온 자리에 점선 발자국(1.5초 후 페이드).
- 도착 지점에 아이템 pulse(scale 1↔1.15). 탭 시 "🌰 +1" 토스트 + 카운트 증가.
- 넛지 카드로 이유 설명("엄마가 산책을 시작했어요 🌿").

### 창문 불빛 = 동적 상태 신호 (중요, 배경에 그리지 말 것)
- 창문 불빛은 "부모가 깨어 활동 중"이라는 실시간 신호. **배경 이미지에 붙박이로 그려두면 안 됨** (낮인데 불 켜져 있으면 논리 오류).
- 배경은 **꺼진 창문**으로 뽑고(프롬프트에 `unlit window` 명시), 불빛은 창문 좌표 위에 **코드 레이어**(노란 radial-gradient 원)로 얹어 활동 상태에 따라 opacity 0↔1 페이드.
- 상태 매핑: 아침 기상 신호 → 불 켜짐(가장 극적, 발표 포인트) / 밤 활동 → 켜짐 / 낮 무활동 → 꺼짐(자연광) / 낮 활동 → 불빛 대신 산책·마스코트 이동으로 표현.
- 발표 시연: "아침에 엄마가 일어나면 창문에 불이 켜집니다" — 이 순간을 라이브로 보여주면 임팩트 큼. 붙박이 불빛이면 이게 불가능.

---

## 4. 퀘스트

### 일일 퀘스트 (안부 행동을 게임화)
- "엄마 정원에 스티커 붙이기" / "손글씨 쪽지 보내기" / "오늘 자란 꽃 수확하기"
- 완료 시 씨앗 보상. 퀘스트=안부행동이라 게임하며 자연스럽게 부모를 챙김.

### 스토리 퀘스트 (성장 여정 안내)
- "첫 나무 키우기" → "연못 만들기" → "계절 꽃밭 완성"
- 마스코트가 다음 할 일 안내(이탈 방지·온보딩). *MVP는 일일 퀘스트 3개만, 스토리는 로드맵.*

---

## 5. 협동 목표 = 주제('사랑')의 심장

혼자선 못 하고 **둘이 함께여야** 완성. "기술이 두 사람을 하나의 목표로 잇는다."

### 함께 키우는 나무 (MVP 핵심, 발표 하이라이트)
- 나무 아래 **두 게이지**: 초록(부모의 활동 기여) + 보라(자녀의 돌봄 기여).
- **둘 다 차야 나무가 자람.** 한쪽만으론 안 자람.
- 발표 대사: "이건 엄마 혼자도, 저 혼자도 아닌 우리가 함께 키운 나무입니다."

### 확장 (로드맵)
- 공동 정원(함께 뜰), 기념일 목표("엄마 생신까지 벚꽃"), 마음 게이지(주고받을수록 차오름 → 무지개/반딧불이).

---

## 6. MVP 우선순위 (순서 엄수 — 다 만들면 죽음)

1. **육성 루프** (활동→마스코트 이동→아이템→수확→씨앗→꽃 심기) — 반드시
2. **함께 키우는 나무** (양쪽 게이지, 둘 다 차야 성장) — 주제 때문에 반드시, 발표 하이라이트
3. **페어링** (6자리 코드로 1:1 연결) — 친구 추가의 정체
4. **손글씨 쪽지** (획 리플레이, 인식 X)
5. **일일 퀘스트 3개**
6. 스티커 자유 배치 / 시간대 배경 전환

### 접을 것 (발표에서 "다음 단계")
상시 백그라운드 센서 · 실제 결제 · 1:N · 손글씨 인식 · 스토리 퀘스트 · 마음 게이지 · 도감 · 계정/로그인

---

## 7. Supabase 스키마 (Seoul 리전)

```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  role text not null check (role in ('viewer','gardener')),
  relation_label text,
  avatar jsonb not null default '{}',   -- {bodyColor, footColor, brows, hat, cheek}
  created_at timestamptz default now()
);

create table pairings (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,            -- 6자리
  viewer_id uuid references profiles(id),
  gardener_id uuid references profiles(id),
  status text default 'pending' check (status in ('pending','linked')),
  created_at timestamptz default now()
);

create table activity_logs (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id),
  ts timestamptz not null,
  kind text not null check (kind in ('wake','light','walk','still','sleep')),
  intensity int default 1,
  created_at timestamptz default now()
);

-- 육성: 자원 잔고 & 수확 가능 아이템
create table resources (
  pairing_id uuid primary key references pairings(id),
  seeds int default 0,
  updated_at timestamptz default now()
);

create table drops (                    -- 마스코트가 물어온 아이템
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id),
  kind text not null,                   -- acorn, flower, shell...
  x real, y real,                       -- 등장 좌표(0~1)
  harvested boolean default false,
  created_at timestamptz default now()
);

-- 정원에 심은 것들
create table plantings (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id),
  kind text not null,                   -- flower kind
  x real, y real,
  planted_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 협동 나무 (양쪽 기여)
create table coop_tree (
  pairing_id uuid primary key references pairings(id),
  parent_progress int default 0,        -- 0~100 (활동 기여)
  child_progress int default 0,         -- 0~100 (돌봄 기여)
  stage int default 0,                  -- 성장 단계
  updated_at timestamptz default now()
);

-- 퀘스트
create table quests (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id),
  profile_id uuid references profiles(id),
  kind text not null,                   -- sticker, note, harvest...
  reward_seeds int default 2,
  done boolean default false,
  quest_date date default current_date
);

-- 스티커 & 쪽지
create table stickers (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id),
  from_id uuid references profiles(id),
  emoji text not null, x real, y real,
  created_at timestamptz default now()
);

create table notes (
  id bigint generated always as identity primary key,
  pairing_id uuid references pairings(id),
  from_id uuid references profiles(id),
  paths jsonb not null,                 -- [{d,color,width}]
  read boolean default false,
  created_at timestamptz default now()
);
```

- Realtime 구독: drops(아이템 등장), coop_tree(나무 성장), stickers/notes.
- 데모: activity_logs에 하루치 seed → 스크러버로 재생 → drops 생성 트리거.

---

## 8. 마스코트 컴포넌트 (음영 + 연필 질감 + hop)

```tsx
// Mascot.tsx — React + framer-motion + inline SVG
import { motion } from "framer-motion";

export type MascotConfig = {
  bodyHi?: string; bodyMid?: string; bodyLo?: string;  // gradient 3톤
  footColor?: string; brows?: boolean; hat?: boolean; cheek?: boolean;
};

export function Mascot({
  config = {}, hopping = false, size = 130,
}: { config?: MascotConfig; hopping?: boolean; size?: number }) {
  const {
    bodyHi = "#A8C594", bodyMid = "#8FB27A", bodyLo = "#6E9160",
    footColor = "#5E7D52", brows = false, hat = false, cheek = true,
  } = config;

  return (
    <motion.svg width={size} height={size * 1.15} viewBox="0 0 130 150"
      animate={hopping
        ? { y: [0, -34, 0], scaleX: [1, 0.88, 1.12, 1], scaleY: [1, 1.14, 0.9, 1] }
        : { y: [0, -3, 0] }}
      transition={hopping
        ? { duration: 0.6, ease: "easeOut" }
        : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "65px 130px" }}>
      <defs>
        <radialGradient id="body" cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor={bodyHi} />
          <stop offset="55%" stopColor={bodyMid} />
          <stop offset="100%" stopColor={bodyLo} />
        </radialGradient>
        <filter id="pencil" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
      {/* 진한 그림자 = 접지 */}
      <ellipse cx="65" cy="140" rx="35" ry="8" fill="#4A3A28" opacity="0.28" />
      <g filter="url(#pencil)">
        <ellipse cx="52" cy="132" rx="9.5" ry="6.5" fill={footColor} />
        <ellipse cx="78" cy="132" rx="9.5" ry="6.5" fill={footColor} />
        <path d="M65 40 C100 40 108 78 105 100 C102 125 88 134 65 134 C42 134 28 125 25 100 C22 78 30 40 65 40 Z" fill="url(#body)" />
        <ellipse cx="50" cy="60" rx="20" ry="14" fill={bodyHi} opacity="0.4" />
        {cheek && <>
          <ellipse cx="43" cy="99" rx="8" ry="5" fill="#EE9A94" opacity="0.55" />
          <ellipse cx="87" cy="99" rx="8" ry="5" fill="#EE9A94" opacity="0.55" />
        </>}
        {brows && <>
          <path d="M40 68 Q47 63 54 67" stroke="#3A4A32" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M76 67 Q83 63 90 68" stroke="#3A4A32" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>}
        <ellipse cx="50" cy="84" rx="7.5" ry="8.5" fill="#3A3228" />
        <ellipse cx="80" cy="84" rx="7.5" ry="8.5" fill="#3A3228" />
        <circle cx="52.8" cy="80.5" r="2.8" fill="#fff" />
        <circle cx="82.8" cy="80.5" r="2.8" fill="#fff" />
        <path d="M59 100 Q65 105 71 100" stroke="#3A3228" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M65 40 C65 30 65 24 65 19" stroke="#5E8050" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M65 26 C56 22 51 14 53 7 C62 8 68 16 65 26 Z" fill="#A6CC86" />
        {hat && <path d="M40 44 Q65 10 90 44 Z" fill="#D97B6C" />}
      </g>
    </motion.svg>
  );
}
```

**이동 팁:** 화면 가로지르기 금지. 짧은 hop 2~4번 + 발자국 점선(1.5s 페이드) + 도착점 아이템 pulse.

---

## 9. 배경 AI 프롬프트 (고양이와 스프 톤)

낮 마스터를 먼저 확정 후, 그 이미지 첨부해 시간대 변주. `no cats`, 중앙 비우기 필수.

**중요 — 창문은 꺼진 채로 뽑을 것.** 불빛은 배경이 아니라 코드로 제어하는 상태 신호(섹션 3 참고). 프롬프트에 `unlit window, dark window, no window glow` 필수. 낮 배경에 불빛이 그려지면 논리 오류(낮인데 불 켜짐)이자, 실시간 상태 반영이 불가능해짐.

**낮 마스터:**
```
A cozy mobile game background in the style of Cats and Soup, soft cute kawaii art,
gentle soft shading and smooth subtle gradients, warm muted pastel palette,
sage green meadow with soft light and shadow, a small cozy cottage on the left with
an UNLIT dark window (no glow) and a lavender door, soft rounded fluffy trees,
layered rolling hills (darker front lighter back),
small bushes/flowers/mushrooms ONLY at left and right edges,
wide open soft grassy meadow in the CENTER foreground with nothing on it,
cozy storybook aesthetic, soft daylight, no people, no cats, no text, no UI
--ar 16:9
```
아침/밤/비: "same scene, keep positions and style, keep the window UNLIT (dark, no glow), change to [morning golden / night indigo+stars / rainy grey-lavender], no cats, no people, no text, empty center meadow".

`public/bg-day.jpg` 등으로 저장 → 정원 홈 배경 레이어. 시간대 전환 시 이미지 교체 + 하늘색 CSS 오버레이 보정.
**창문 위치를 기록해둘 것** — 4장 모두 집·창문이 같은 좌표여야 코드 불빛 레이어가 모든 시간대에서 정확히 창문에 얹힘.

---

## 10. Claude Code 첫 작업 지시서 (복사용)

```
Somden 웹앱. React + Vite + TypeScript + Tailwind + framer-motion + Supabase. Vercel 배포, 모바일 우선.

컨셉: 떨어져 사는 가족의 폰 활동 신호가 정원으로 시각화되고, 부모와 자녀가 함께 키우는 육성형 안부 서비스. 감시 아닌 안부, 혼자 아닌 함께.

디자인 토큰(필수):
- 배경 cream #FBF3E6(순백 금지), garden-green #7B9E6E, soft-purple #C9A9E8, ink #2E3A28(순검정 금지)
- 카드 radius 16~20px, 버튼 12px, 그림자 크고 흐리게, 넉넉한 여백
- 한글 둥근 폰트(Pretendard) CDN, 모든 인터랙션 framer-motion spring

이번 세션(순서대로):
1. 스캐폴딩 + Tailwind 토큰 등록 + 폰트 로드
2. Mascot.tsx (제공 코드: gradient 3톤 음영 + pencil 필터 + hop/idle, props: config/hopping/size)
3. 정원 홈: public/bg-day.jpg 배경 레이어 + Mascot(중앙 무대, 발밑 그림자+잔디타원 접지) + 상단 정보 pill + 하단 3탭바
   - 창문 불빛은 배경에 없음(꺼진 창). 창문 좌표 위에 노란 radial-gradient 원을 코드 레이어로 얹고, 활동 상태(prop)에 따라 opacity 0↔1 페이드로 켜고 끔. 배경에 불빛 그려진 이미지 쓰지 말 것.
4. 육성 루프: '산책 신호' 버튼 → 마스코트 짧은 hop 이동+발자국 → 도착점 아이템 pulse → 탭 수확 → 씨앗 카운트+1. '기상 신호'는 창문 불빛 켜기로 표현.
5. 함께 키우는 나무 컴포넌트: 두 게이지(초록=부모활동, 보라=자녀돌봄), 둘 다 차야 canopy scale 성장

지금은 1~3 먼저. 4~5 다음 세션. Supabase 스키마는 별도 제공. 각 단계 화면이 실제로 예쁜지(색·여백·모션 말랑함) 확인하며 진행. 완성도 최우선.
```

---

## 11. 발표 대비

### 정체성 문구
- 태그라인: "당신의 하루가, 누군가의 정원이 됩니다."
- 주제 슬라이드: "기술이 앗아간 온기를, 기술로 되돌립니다."
- 오프닝: "기술은 우리를 편리하게 했지만 멀어지게 했습니다. 안부 앱은 많지만 전부 '경보'입니다 — 무슨 일이 생겨야 알림이 옵니다. 저희는 반대로, 아무 일 없는 평범한 하루를 매일 정원으로 선물합니다. 그리고 그 정원은 혼자가 아니라 함께 키웁니다. Somden입니다."

### 킬러 질문 & 답
- **기존 안부 앱과 차이?** → "전부 경보입니다. 저흰 평범한 잘 지냄을 매일 정원으로 보여주고, 부모·자녀가 함께 키웁니다. 안전 모니터링과 정원 게임의 교차점입니다."
- **백그라운드 감지?** → "실서비스는 네이티브에서 걸음수·화면활동을 baseline 비교. 데모는 하루치 압축 재생이고 파이프라인은 동일."
- **위급 시?** → "안전 보장 기기가 아닌 정서적 공존 도구. '며칠째 정원 변화 없어요, 전화해보실래요?' 넛지까지가 범위, 본격 경보는 다음 단계."
- **수익모델?** → "마스코트 파츠·정원 스킨·프리미엄 씨앗·성장 가속. 카카오·라인이 증명한 아바타/이모티콘 경제를 가족 안부에 얹음."
- **게임이 왜 안부 앱에?** → "게임이 곧 안부입니다. 부모가 잘 지낼수록 씨앗이 쌓이고, 함께여야 나무가 자랍니다. 걱정이 아니라 애정으로 매일 서로를 확인하게 만드는 장치입니다."
```
