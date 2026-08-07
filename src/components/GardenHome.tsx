import { useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mascot, type GlassesStyle, type HatStyle } from './Mascot';
import { TreeVisual, TreeGauges, useCoopTree } from './CoopTree';
import { PondVisual } from './GardenItems';
import { Customize } from './Customize';
import { NoteBoard } from './NoteBoard';
import { CooldownRing, DropletIcon, SeedIcon } from './ResourceIcons';
import { deriveMascotShades } from '../lib/color';
import { DEMO_COOLDOWN_MS, DROPLET_CAP, REAL_COOLDOWN_MS, formatCooldown, useDroplets } from '../hooks/useDroplets';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TABS = [
  { key: 'garden', label: '정원', icon: '🌱' },
  { key: 'tree', label: '나무', icon: '🌳' },
  { key: 'decorate', label: '꾸미기', icon: '🎀' },
  { key: 'note', label: '손글씨', icon: '✏️' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// bg-day.jpg 기준 창문 좌표 (문 오른쪽 창). 아침/밤/비 변주 이미지도 같은 구도라 좌표 재사용 가능.
const WINDOW_POSITION = { left: '27.5%', top: '37%' };
// 함께 키우는 나무 = 무대 중앙, 접지선 기준점
const TREE_ANCHOR = { left: '50%', top: '73%' };
const TREE_SIZE = 170;
// 마스코트의 기본 위치 = 집 앞. 산책 신호를 받으면 집에서 멀어지는 방향(오른쪽)으로 짧게 걷는다.
const HOUSE_FRONT_ANCHOR = { left: '23%', top: '68%' };
// 마스코트가 돌아다닐 수 있는 범위 = 중앙 잔디만(무대 기준 %). 양옆 꽃밭·집 쪽은 제외.
const MEADOW_BOUNDS = { xMin: 36, xMax: 82, yMin: 58, yMax: 84 };
// 집 클릭 판정 영역(무대 기준 %) — 배경 이미지 속 집 실루엣과 대략 맞춘 값.
const HOUSE_BOUNDS = { xMin: 3, xMax: 34, yMin: 2, yMax: 62 };
// 이동 시 한 hop당 이동하는 고정 거리(px). 목적지까지 거리를 이 값으로 나눠 스텝 수를 정하고,
// 마지막 스텝만 남은 거리 전부를 이동해 정확히 목적지에 닿는다.
const HOP_STEP_DISTANCE = 60;

type Point = { x: number; y: number };
type Footprint = Point & { id: number };
type Toast = Point & { id: number; text: string };

// 마스코트는 화면을 가로지르지 않고, 무대 안에서 짧게 2~4번 hop 후 정지한다.
const WALK_STEPS: Point[] = [
  { x: 20, y: -8 },
  { x: 18, y: -6 },
  { x: 14, y: -4 },
];

// mascotPos는 HOUSE_FRONT_ANCHOR로부터의 픽셀 오프셋. 탭 좌표(%)와 서로 변환해서
// 이동 목적지를 계산하고, 중앙 잔디 범위로 클램프한다.
function anchorPx(rect: { width: number; height: number }) {
  return {
    x: rect.width * (parseFloat(HOUSE_FRONT_ANCHOR.left) / 100),
    y: rect.height * (parseFloat(HOUSE_FRONT_ANCHOR.top) / 100),
  };
}

function offsetToPct(offset: Point, rect: { width: number; height: number }): Point {
  const a = anchorPx(rect);
  return { x: ((a.x + offset.x) / rect.width) * 100, y: ((a.y + offset.y) / rect.height) * 100 };
}

function pctToOffset(pct: Point, rect: { width: number; height: number }): Point {
  const a = anchorPx(rect);
  return { x: rect.width * (pct.x / 100) - a.x, y: rect.height * (pct.y / 100) - a.y };
}

function clampPctToMeadow(pct: Point): Point {
  return {
    x: Math.min(MEADOW_BOUNDS.xMax, Math.max(MEADOW_BOUNDS.xMin, pct.x)),
    y: Math.min(MEADOW_BOUNDS.yMax, Math.max(MEADOW_BOUNDS.yMin, pct.y)),
  };
}

function clampOffsetToMeadow(offset: Point, rect: { width: number; height: number }): Point {
  return pctToOffset(clampPctToMeadow(offsetToPct(offset, rect)), rect);
}
function isInHouse(pct: Point) {
  return (
    pct.x >= HOUSE_BOUNDS.xMin && pct.x <= HOUSE_BOUNDS.xMax && pct.y >= HOUSE_BOUNDS.yMin && pct.y <= HOUSE_BOUNDS.yMax
  );
}

type QuestKey = 'sticker' | 'note' | 'harvest';
// 퀘스트 완료 보상은 씨앗이 아니라 물방울(나무 성장 재료)로 바뀌었다.
const QUEST_DEFS: { key: QuestKey; label: string; icon: string; reward: number }[] = [
  { key: 'sticker', label: '쪽지에 스티커 붙이기', icon: '🎀', reward: 1 },
  { key: 'note', label: '손글씨 쪽지 보내기', icon: '✏️', reward: 2 },
  { key: 'harvest', label: '오늘 주운 도토리 수확하기', icon: '🌰', reward: 3 },
];

// 나무 열매 하나를 수확할 때 얻는 씨앗 — 대충 잡은 값, 나중에 밸런싱.
const FRUIT_SEED_REWARD = 5;

type PlantShopEntry = { id: string; emoji?: string; label: string; cost: number; kind: 'flower' | 'pond' };
const PLANT_SHOP: PlantShopEntry[] = [
  { id: 'tulip', emoji: '🌷', label: '튤립', cost: 4, kind: 'flower' },
  { id: 'daisy', emoji: '🌼', label: '데이지', cost: 4, kind: 'flower' },
  { id: 'clover', emoji: '🍀', label: '클로버', cost: 3, kind: 'flower' },
  { id: 'sunflower', emoji: '🌻', label: '해바라기', cost: 7, kind: 'flower' },
  { id: 'rose', emoji: '🌹', label: '장미', cost: 6, kind: 'flower' },
  { id: 'pond', label: '연못', cost: 15, kind: 'pond' },
];
type Planting = { id: number; shopId: string; kind: 'flower' | 'pond'; emoji?: string; xPct: number; yPct: number };

type TimeOfDay = 'morning' | 'day' | 'night' | 'rain' | 'snow';
const TIME_OPTIONS: { key: TimeOfDay; icon: string }[] = [
  { key: 'morning', icon: '🌅' },
  { key: 'day', icon: '☀️' },
  { key: 'night', icon: '🌙' },
  { key: 'rain', icon: '🌧️' },
  { key: 'snow', icon: '❄️' },
];
// 실제 배경 이미지 로드 전/실패 시 폴백으로 쓰이는 시간대별 그라디언트.
const BG_GRADIENT: Record<TimeOfDay, string> = {
  morning: 'linear-gradient(180deg, #FBD8B0 0%, #F6C9A8 30%, #E9D3B0 55%, #CFE0AE 100%)',
  day: 'linear-gradient(180deg, #CFE3E0 0%, #DCEBD3 38%, #C9DDB4 62%, #AEC998 100%)',
  night: 'linear-gradient(180deg, #232A4D 0%, #2E3768 35%, #3B4372 60%, #46523E 100%)',
  rain: 'linear-gradient(180deg, #B9C2C9 0%, #C3CBCB 35%, #B7C2B0 65%, #9FAE93 100%)',
  snow: 'linear-gradient(180deg, #E4E9EC 0%, #DCE4E8 35%, #D6DEE2 65%, #C9D3D6 100%)',
};
const BG_IMAGE: Record<TimeOfDay, string> = {
  morning: '/bg-morning.jpg',
  day: '/bg-day.jpg',
  night: '/bg-night.jpg',
  rain: '/bg-rain.jpg',
  snow: '/bg-snow.jpg',
};

export function GardenHome() {
  const [activeTab, setActiveTab] = useState<TabKey>('garden');
  const [windowLit, setWindowLit] = useState(false);
  // 데모 편의상 씨앗은 100개로 시작 — 상점에서 산 아이템이 바로 보이도록.
  const [seeds, setSeeds] = useState(100);
  const [mascotBaseColor, setMascotBaseColor] = useState('#8FAE74');

  const [equippedHat, setEquippedHat] = useState<HatStyle>('none');
  const [ownedHats, setOwnedHats] = useState<Set<HatStyle>>(() => new Set(['none']));
  const [equippedGlasses, setEquippedGlasses] = useState<GlassesStyle>('none');
  const [ownedGlasses, setOwnedGlasses] = useState<Set<GlassesStyle>>(() => new Set(['none']));

  // 8시간 쿨다운을 발표 데모에서는 8초로 압축해서 보여주기 위한 토글.
  const [demoMode, setDemoMode] = useState(true);
  const cooldownMs = demoMode ? DEMO_COOLDOWN_MS : REAL_COOLDOWN_MS;
  const droplets = useDroplets(cooldownMs);

  const coop = useCoopTree();
  const [fruitToast, setFruitToast] = useState<{ id: number; text: string } | null>(null);

  const [moveMode, setMoveMode] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const [isWalking, setIsWalking] = useState(false);
  const [hopping, setHopping] = useState(false);
  const [mascotPos, setMascotPos] = useState<Point>({ x: 0, y: 0 });
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [drop, setDrop] = useState<Point | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nudge, setNudge] = useState<string | null>(null);

  const [questsDone, setQuestsDone] = useState<Record<QuestKey, boolean>>({
    sticker: false,
    note: false,
    harvest: false,
  });
  const [showQuests, setShowQuests] = useState(false);

  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [armedPlant, setArmedPlant] = useState<PlantShopEntry | null>(null);
  const [showPlantTray, setShowPlantTray] = useState(false);

  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');

  const questsDoneCount = QUEST_DEFS.filter((q) => questsDone[q.key]).length;

  function completeQuest(kind: QuestKey) {
    if (questsDone[kind]) return;
    setQuestsDone((prev) => ({ ...prev, [kind]: true }));
    const def = QUEST_DEFS.find((q) => q.key === kind)!;
    droplets.addDroplets(def.reward);
    showNudge(`${def.icon} 오늘의 퀘스트 완료! 💧 +${def.reward}`);
  }

  function handleStageClick(e: ReactMouseEvent<HTMLElement>) {
    if (armedPlant) {
      if (seeds < armedPlant.cost) {
        showNudge('씨앗이 부족해요 🌱');
        setArmedPlant(null);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const xPct = Math.min(90, Math.max(10, ((e.clientX - rect.left) / rect.width) * 100));
      const yPct = Math.min(90, Math.max(15, ((e.clientY - rect.top) / rect.height) * 100));
      setPlantings((list) => [
        ...list,
        { id: Date.now() + Math.random(), shopId: armedPlant.id, kind: armedPlant.kind, emoji: armedPlant.emoji, xPct, yPct },
      ]);
      setSeeds((s) => s - armedPlant.cost);
      showNudge(armedPlant.kind === 'pond' ? '연못을 만들었어요!' : `${armedPlant.emoji} 심었어요!`);
      setArmedPlant(null);
      setShowPlantTray(false);
      return;
    }

    if (moveMode) {
      const rect = e.currentTarget.getBoundingClientRect();
      const rawPct = {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      };
      setMoveMode(false);
      if (isInHouse(rawPct)) {
        showNudge('집으로 들어갈까요? 🏠');
        moveMascotTo({ x: 0, y: 0 });
      } else {
        moveMascotTo(pctToOffset(clampPctToMeadow(rawPct), rect));
      }
    }
  }

  function toggleHat(id: HatStyle, cost: number) {
    if (ownedHats.has(id)) {
      setEquippedHat((cur) => (cur === id ? 'none' : id));
      return;
    }
    if (seeds < cost) {
      showNudge('씨앗이 부족해요 🌱');
      return;
    }
    setSeeds((s) => s - cost);
    setOwnedHats((prev) => new Set(prev).add(id));
    setEquippedHat(id);
    showNudge('모자를 구매했어요 🎉');
  }

  function toggleGlasses(id: GlassesStyle, cost: number) {
    if (ownedGlasses.has(id)) {
      setEquippedGlasses((cur) => (cur === id ? 'none' : id));
      return;
    }
    if (seeds < cost) {
      showNudge('씨앗이 부족해요 🌱');
      return;
    }
    setSeeds((s) => s - cost);
    setOwnedGlasses((prev) => new Set(prev).add(id));
    setEquippedGlasses(id);
    showNudge('안경을 구매했어요 🎉');
  }

  function showNudge(text: string) {
    setNudge(text);
    setTimeout(() => setNudge((cur) => (cur === text ? null : cur)), 2600);
  }

  function addFootprint(pos: Point) {
    const id = Date.now() + Math.random();
    setFootprints((list) => [...list, { id, ...pos }]);
    setTimeout(() => setFootprints((list) => list.filter((fp) => fp.id !== id)), 1500);
  }

  function addToast(pos: Point, text: string) {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, x: pos.x, y: pos.y, text }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 900);
  }

  async function triggerWalk() {
    if (isWalking || drop || moveMode) return;
    setIsWalking(true);
    showNudge('엄마가 산책을 시작했어요 🌿');

    const rect = mainRef.current?.getBoundingClientRect();
    let pos = mascotPos;
    for (const step of WALK_STEPS) {
      setHopping(true);
      await wait(400);
      addFootprint(pos);
      let next = { x: pos.x + step.x, y: pos.y + step.y };
      if (rect) next = clampOffsetToMeadow(next, rect);
      pos = next;
      setMascotPos(pos);
      setHopping(false);
      await wait(80);
    }
    // 마스코트 몸통과 겹치지 않도록 발밑 옆쪽에 살짝 띄워서 등장
    setDrop({ x: pos.x + 30, y: pos.y + 16 });
    setIsWalking(false);
  }

  // 부모(gardener)가 정원을 탭했을 때 마스코트를 그 자리로 이동시킨다. hop + 발자국은
  // triggerWalk와 같은 연출을 쓰되, 최종 목적지는 탭한 좌표 그대로 "정착"한다 — 원위치로
  // 돌아가지 않는다.
  async function moveMascotTo(target: Point) {
    if (isWalking || drop) return;
    setIsWalking(true);

    const start = mascotPos;
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / HOP_STEP_DISTANCE));

    let pos = start;
    for (let i = 0; i < steps; i++) {
      setHopping(true);
      await wait(400);
      addFootprint(pos);
      const isLast = i === steps - 1;
      // 마지막 스텝은 고정 보폭이 아니라 남은 거리 전부를 이동해 정확히 목적지에 닿는다.
      pos = isLast
        ? target
        : { x: start.x + (dx * ((i + 1) * HOP_STEP_DISTANCE)) / dist, y: start.y + (dy * ((i + 1) * HOP_STEP_DISTANCE)) / dist };
      setMascotPos(pos);
      setHopping(false);
      await wait(80);
    }
    setIsWalking(false);
  }

  function armMoveMode() {
    if (isWalking) return;
    setShowPlantTray(false);
    setArmedPlant(null);
    setMoveMode(true);
    showNudge('이동할 자리를 탭해주세요 🚶');
  }

  function harvestDrop() {
    if (!drop) return;
    droplets.addDroplets(1);
    addToast(drop, '💧 +1');
    setDrop(null);
    // 위치는 그대로 둔다 — 수확했다고 마스코트가 원위치로 돌아가면 안 된다.
    completeQuest('harvest');
  }

  function handleHarvestFruit(index: number) {
    const got = coop.harvestFruit(index);
    if (!got) return;
    setSeeds((s) => s + FRUIT_SEED_REWARD);
    setFruitToast({ id: Date.now() + Math.random(), text: `🌱 +${FRUIT_SEED_REWARD}` });
    setTimeout(() => setFruitToast(null), 900);
  }

  function triggerWake() {
    setWindowLit((lit) => {
      const next = !lit;
      showNudge(next ? '엄마가 일어났어요 ☀️' : '창문 불이 꺼졌어요');
      return next;
    });
  }

  return (
    <div className="relative flex h-svh w-full flex-col overflow-hidden">
      {/* 배경 레이어: bg-*.jpg가 있으면 우선 사용, 없으면 시간대별 그라디언트 플레이스홀더 */}
      <div
        className="absolute inset-0 transition-[background-image] duration-700"
        style={{
          backgroundImage: `url('${BG_IMAGE[timeOfDay]}'), ${BG_GRADIENT[timeOfDay]}`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* 창문 불빛 — 배경에 없는 상태 신호를 코드 레이어로 얹음 */}
        <motion.div
          className="absolute h-6 w-6 rounded-full"
          style={{
            left: WINDOW_POSITION.left,
            top: WINDOW_POSITION.top,
            background:
              'radial-gradient(circle, rgba(255,224,130,0.95) 0%, rgba(255,200,90,0.5) 55%, rgba(255,200,90,0) 100%)',
            filter: 'blur(2px)',
          }}
          animate={{ opacity: windowLit ? 1 : 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      </div>

      {/* 상단 = 정보 + 자원 바(물방울/씨앗) + (데모용) 트리거 */}
      <header className="relative z-20 flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center gap-2.5 rounded-full bg-cream/80 px-5 py-2.5 shadow-[0_6px_20px_rgba(120,110,180,0.10)] backdrop-blur-sm">
          <span className="text-lg leading-none">🏡</span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-ink">엄마의 정원</span>
            <span className="text-xs text-ink/60">오늘도 평온해요 · 오전 9:12</span>
          </div>
          <div className="ml-1 flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-1 text-xs font-semibold text-ink">
            <DropletIcon size={15} />
            {droplets.droplets}
            {droplets.droplets < DROPLET_CAP && (
              <span className="ml-0.5 flex items-center gap-0.5 text-[10px] font-normal text-ink/50">
                <CooldownRing size={14} progress={droplets.progress} />
                {formatCooldown(droplets.remainingMs)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-1 text-xs font-semibold text-ink">
            <SeedIcon size={15} />
            {seeds}
          </div>
          {/* 데모용: 물방울/씨앗을 한 번에 100개로 되돌리는 작은 초기화 버튼 */}
          <button
            onClick={() => {
              droplets.reset(100);
              setSeeds(100);
              showNudge('자원을 100개로 초기화했어요 🔄');
            }}
            className="rounded-full bg-cream-deep/70 px-2 py-1 text-[10px] font-medium text-ink/50"
            title="물방울·씨앗 100개로 초기화"
          >
            🔄
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 개발용 데모 모드 토글: 물방울 충전 주기를 8시간 ↔ 8초로 전환 */}
          <button
            onClick={() => setDemoMode((v) => !v)}
            className="rounded-full bg-cream/60 px-3 py-1 text-[10px] font-medium text-ink/60 backdrop-blur-sm"
          >
            ⚡ 데모모드(물방울 {demoMode ? '8초' : '8시간'}) · {demoMode ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* TODO: 실서비스는 실제 활동 파이프라인 + 하루 스크러버로 대체(섹션 0, 3). 지금은 데모용 수동 트리거. */}
        {activeTab === 'garden' && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={triggerWalk}
              disabled={isWalking || !!drop}
              className="rounded-full bg-cream/70 px-3.5 py-1.5 text-xs font-medium text-ink/80 shadow-[0_4px_14px_rgba(120,110,180,0.08)] backdrop-blur-sm transition-opacity disabled:opacity-40"
            >
              🌿 산책 신호
            </button>
            <button
              onClick={triggerWake}
              className="rounded-full bg-cream/70 px-3.5 py-1.5 text-xs font-medium text-ink/80 shadow-[0_4px_14px_rgba(120,110,180,0.08)] backdrop-blur-sm"
            >
              {windowLit ? '🌙 불 끄기' : '☀️ 기상 신호'}
            </button>
            <button
              onClick={() => setShowQuests(true)}
              className="rounded-full bg-cream/70 px-3.5 py-1.5 text-xs font-medium text-ink/80 shadow-[0_4px_14px_rgba(120,110,180,0.08)] backdrop-blur-sm"
            >
              🎯 퀘스트 {questsDoneCount}/{QUEST_DEFS.length}
            </button>
            <button
              onClick={() => {
                setShowPlantTray((v) => !v);
                setArmedPlant(null);
                setMoveMode(false);
              }}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium shadow-[0_4px_14px_rgba(120,110,180,0.08)] backdrop-blur-sm"
              style={{
                background: showPlantTray ? 'var(--color-soft-purple)' : 'rgba(251,243,230,0.7)',
                color: showPlantTray ? '#FBF3E6' : undefined,
              }}
            >
              🌷 심기
            </button>
          </div>
        )}

        {activeTab === 'garden' && !moveMode && !armedPlant && (
          <p className="text-[10px] text-ink/40">마스코트를 탭하면 원하는 자리로 이동시킬 수 있어요</p>
        )}

        {activeTab === 'garden' && (
          <div className="flex items-center gap-1.5 rounded-full bg-cream/60 px-2 py-1 backdrop-blur-sm">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTimeOfDay(t.key)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                style={{ background: timeOfDay === t.key ? 'rgba(255,255,255,0.7)' : 'transparent' }}
              >
                {t.icon}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {activeTab === 'garden' && nudge && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl bg-purple-ink px-3.5 py-1.5 text-xs font-medium text-cream shadow-[0_6px_20px_rgba(120,110,180,0.18)]"
            >
              {nudge}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 중앙 = 탭별 컨텐츠. 무대 높이가 하단 오버레이(식물 상점) 유무로 흔들리지 않도록
          그 오버레이는 main의 자식으로 absolute 배치한다(형제 블록으로 두면 main 높이가
          바뀌면서 나무·마스코트가 붕 뜨는 것처럼 보였음). */}
      <main
        ref={mainRef}
        className="relative flex-1"
        onClick={handleStageClick}
        style={{ cursor: armedPlant || moveMode ? 'copy' : undefined }}
      >
        {activeTab === 'garden' && (
          <>
            {/* 씨앗으로 심은 영구 식물/아이템 */}
            {plantings.map((p) =>
              p.kind === 'pond' ? (
                <motion.div
                  key={p.id}
                  className="absolute select-none"
                  style={{ left: `${p.xPct}%`, top: `${p.yPct}%`, marginLeft: -45, marginTop: -32 }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                >
                  <PondVisual size={90} />
                </motion.div>
              ) : (
                <motion.span
                  key={p.id}
                  className="absolute select-none text-2xl"
                  style={{ left: `${p.xPct}%`, top: `${p.yPct}%`, marginLeft: -14, marginTop: -14 }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                >
                  {p.emoji}
                </motion.span>
              ),
            )}

            {/* 함께 키우는 나무 — 무대 정중앙에 고정, 심기 중에도 위치가 흔들리지 않는다 */}
            <div
              className="absolute"
              style={{
                left: TREE_ANCHOR.left,
                top: TREE_ANCHOR.top,
                marginLeft: -(TREE_SIZE / 2),
                marginTop: -(TREE_SIZE * 1.25 * 0.92),
              }}
            >
              <TreeVisual stage={coop.stage} justGrew={coop.justGrew} size={TREE_SIZE} harvestedFruit={coop.harvestedFruit} />
            </div>

            {/* 마스코트 — 아이템을 심는 동안(armedPlant)은 배치에 방해되지 않도록 잠시 숨긴다 */}
            {!armedPlant && (
              <>
                <div
                  className="absolute h-6 w-32 rounded-[50%]"
                  style={{
                    left: HOUSE_FRONT_ANCHOR.left,
                    top: HOUSE_FRONT_ANCHOR.top,
                    marginLeft: -64,
                    marginTop: 50,
                    background: 'radial-gradient(ellipse, rgba(94,125,82,0.35) 0%, rgba(94,125,82,0) 72%)',
                  }}
                />
                <motion.div
                  className="absolute"
                  style={{
                    left: HOUSE_FRONT_ANCHOR.left,
                    top: HOUSE_FRONT_ANCHOR.top,
                    marginLeft: -55,
                    marginTop: -64,
                    cursor: !isWalking ? 'pointer' : undefined,
                  }}
                  animate={{
                    x: mascotPos.x,
                    y: mascotPos.y,
                    scale: moveMode ? [1, 1.08, 1] : 1,
                  }}
                  transition={{
                    x: { type: 'spring', stiffness: 130, damping: 15 },
                    y: { type: 'spring', stiffness: 130, damping: 15 },
                    scale: { duration: 0.6, repeat: moveMode ? Infinity : 0, ease: 'easeInOut' },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    armMoveMode();
                  }}
                >
                  <Mascot
                    size={110}
                    hopping={hopping}
                    config={{ ...deriveMascotShades(mascotBaseColor), hat: equippedHat, glasses: equippedGlasses }}
                  />
                </motion.div>
              </>
            )}

            {/* 지나온 자리의 점선 발자국 (1.5초 페이드) */}
            {footprints.map((fp) => (
              <motion.div
                key={fp.id}
                className="absolute flex gap-1.5"
                style={{
                  left: HOUSE_FRONT_ANCHOR.left,
                  top: HOUSE_FRONT_ANCHOR.top,
                  marginLeft: fp.x - 10,
                  marginTop: fp.y - 4,
                }}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              >
                <span className="block h-2 w-1.5 rounded-full bg-green-foot/70" />
                <span className="block h-2 w-1.5 rounded-full bg-green-foot/70" />
              </motion.div>
            ))}

            {/* 도착 지점 아이템: pulse, 탭하면 수확 */}
            {drop && (
              <div
                className="absolute"
                style={{
                  left: HOUSE_FRONT_ANCHOR.left,
                  top: HOUSE_FRONT_ANCHOR.top,
                  marginLeft: drop.x - 18,
                  marginTop: drop.y - 18,
                }}
              >
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    harvestDrop();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-cream/70 text-xl shadow-[0_6px_16px_rgba(120,110,180,0.15)]"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                >
                  🌰
                </motion.button>
              </div>
            )}

            {/* 수확 토스트 */}
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                className="absolute text-sm font-semibold text-garden-green"
                style={{
                  left: HOUSE_FRONT_ANCHOR.left,
                  top: HOUSE_FRONT_ANCHOR.top,
                  marginLeft: t.x - 14,
                  marginTop: t.y - 18,
                }}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              >
                {t.text}
              </motion.div>
            ))}
          </>
        )}

        {activeTab === 'tree' && (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
            <div className="relative">
              <TreeVisual
                stage={coop.stage}
                justGrew={coop.justGrew}
                size={220}
                harvestedFruit={coop.harvestedFruit}
                onHarvestFruit={handleHarvestFruit}
              />
              <AnimatePresence>
                {fruitToast && (
                  <motion.div
                    key={fruitToast.id}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -30 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="absolute left-1/2 top-16 -translate-x-1/2 text-sm font-semibold text-purple-ink"
                  >
                    {fruitToast.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {coop.stage >= 3 && (
              <p className="-mt-3 text-[11px] text-ink/50">🌰 열매를 탭하면 씨앗을 수확할 수 있어요</p>
            )}
            <TreeGauges
              parentProgress={coop.parentProgress}
              childProgress={coop.childProgress}
              stage={coop.stage}
              dropletsAvailable={droplets.droplets > 0}
              onWater={() => {
                if (droplets.droplets <= 0) return;
                droplets.spendDroplet();
                coop.water();
              }}
              onReplayParent={coop.replayParent}
            />
          </div>
        )}

        {activeTab === 'decorate' && (
          <Customize
            baseColor={mascotBaseColor}
            onSelectColor={setMascotBaseColor}
            seeds={seeds}
            equippedHat={equippedHat}
            ownedHats={ownedHats}
            onToggleHat={toggleHat}
            equippedGlasses={equippedGlasses}
            ownedGlasses={ownedGlasses}
            onToggleGlasses={toggleGlasses}
          />
        )}
        {activeTab === 'note' && (
          <NoteBoard onSend={() => completeQuest('note')} onStickerPlaced={() => completeQuest('sticker')} />
        )}

        {/* 식물 상점: main의 자식으로 absolute 배치 — 열고 닫아도 무대(main) 높이가
            바뀌지 않아 나무·마스코트가 흔들리지 않는다. */}
        {activeTab === 'garden' && showPlantTray && (
          <div className="absolute inset-x-0 bottom-3 z-20 px-4" onClick={(e) => e.stopPropagation()}>
            {!armedPlant ? (
              <>
                <div className="mx-auto flex max-w-sm items-center justify-center gap-2.5 rounded-3xl bg-cream/85 px-4 py-3 shadow-[0_6px_20px_rgba(120,110,180,0.10)] backdrop-blur-sm">
                  {PLANT_SHOP.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setArmedPlant(p)}
                      disabled={seeds < p.cost}
                      className="flex flex-col items-center gap-0.5"
                      style={{ opacity: seeds < p.cost ? 0.4 : 1 }}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full text-xl">
                        {p.kind === 'pond' ? <PondVisual size={30} /> : p.emoji}
                      </span>
                      <span className="text-[10px] font-semibold text-garden-green">🌱{p.cost}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-center text-[11px] text-ink/50">씨앗으로 심을 아이템을 골라주세요</p>
              </>
            ) : (
              // 아이템을 고르면 트레이 자체를 잠시 치워서 배치 탭에 방해되지 않게 한다.
              <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5">
                <p className="rounded-full bg-cream/85 px-4 py-2 text-xs font-medium text-ink/70 shadow-[0_6px_20px_rgba(120,110,180,0.10)] backdrop-blur-sm">
                  정원을 탭해서 심어주세요
                </p>
                <button onClick={() => setArmedPlant(null)} className="text-[11px] text-ink/40 underline">
                  취소
                </button>
              </div>
            )}
          </div>
        )}

        {/* 이동 모드: 심기 모드와 같은 자리(하단 오버레이)에 힌트 + 취소 버튼. */}
        {activeTab === 'garden' && moveMode && (
          <div className="absolute inset-x-0 bottom-3 z-20 px-4" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5">
              <p className="rounded-full bg-cream/85 px-4 py-2 text-xs font-medium text-ink/70 shadow-[0_6px_20px_rgba(120,110,180,0.10)] backdrop-blur-sm">
                정원을 탭해서 마스코트를 이동시켜주세요
              </p>
              <button onClick={() => setMoveMode(false)} className="text-[11px] text-ink/40 underline">
                취소
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 오늘의 퀘스트 모달 */}
      <AnimatePresence>
        {showQuests && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-ink/30 px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQuests(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl bg-cream px-5 py-5 shadow-[0_10px_30px_rgba(120,110,180,0.25)]"
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-3 text-sm font-bold text-ink">오늘의 퀘스트 {questsDoneCount}/{QUEST_DEFS.length}</h2>
              <ul className="flex flex-col gap-2">
                {QUEST_DEFS.map((q) => (
                  <li
                    key={q.key}
                    className="flex items-center gap-2.5 rounded-2xl bg-cream-deep px-3.5 py-2.5"
                  >
                    <span className="text-lg">{questsDone[q.key] ? '✅' : q.icon}</span>
                    <span
                      className={`flex-1 text-sm ${questsDone[q.key] ? 'text-ink/40 line-through' : 'text-ink'}`}
                    >
                      {q.label}
                    </span>
                    <span className="text-xs font-semibold text-garden-green">+{q.reward}💧</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowQuests(false)}
                className="mt-4 w-full rounded-2xl bg-garden-green py-2.5 text-sm font-semibold text-cream"
              >
                닫기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 하단 = 컨트롤 */}
      <footer className="relative z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)]">
        <nav className="mx-auto flex max-w-sm items-center justify-around rounded-3xl bg-cream/85 px-2 py-2 shadow-[0_6px_20px_rgba(120,110,180,0.10)] backdrop-blur-sm">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="relative flex flex-col items-center gap-0.5 rounded-2xl px-5 py-1.5"
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-highlight"
                    className="absolute inset-0 rounded-2xl bg-garden-green/15"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative text-xl leading-none">{tab.icon}</span>
                <span
                  className={`relative text-[11px] font-medium ${isActive ? 'text-garden-green' : 'text-ink/50'}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </footer>
    </div>
  );
}
