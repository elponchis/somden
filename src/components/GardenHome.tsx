import { useState, type MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mascot, type GlassesStyle, type HatStyle } from './Mascot';
import { TreeVisual, TreeGauges, useCoopTree } from './CoopTree';
import { PondVisual } from './GardenItems';
import { Customize } from './Customize';
import { NoteBoard } from './NoteBoard';
import { deriveMascotShades } from '../lib/color';

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
// 함께 키우는 나무 = 무대 중앙, 접지선 기준점 (기존 80%에서 조금 더 화면 중앙 쪽으로)
const TREE_ANCHOR = { left: '50%', top: '73%' };
const TREE_SIZE = 170;
// 마스코트의 기본 위치 = 집 앞. 산책 신호를 받으면 집에서 멀어지는 방향(오른쪽)으로 짧게 걷는다.
const HOUSE_FRONT_ANCHOR = { left: '23%', top: '68%' };

type Point = { x: number; y: number };
type Footprint = Point & { id: number };
type Toast = Point & { id: number; text: string };

// 마스코트는 화면을 가로지르지 않고, 무대 안에서 짧게 2~4번 hop 후 정지한다.
const WALK_STEPS: Point[] = [
  { x: 20, y: -8 },
  { x: 18, y: -6 },
  { x: 14, y: -4 },
];

type QuestKey = 'sticker' | 'note' | 'harvest';
const QUEST_DEFS: { key: QuestKey; label: string; icon: string }[] = [
  { key: 'sticker', label: '쪽지에 스티커 붙이기', icon: '🎀' },
  { key: 'note', label: '손글씨 쪽지 보내기', icon: '✏️' },
  { key: 'harvest', label: '오늘 자란 열매 수확하기', icon: '🌰' },
];
const QUEST_REWARD = 2;

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
  const [seeds, setSeeds] = useState(0);
  const [mascotBaseColor, setMascotBaseColor] = useState('#8FAE74');

  const [equippedHat, setEquippedHat] = useState<HatStyle>('none');
  const [ownedHats, setOwnedHats] = useState<Set<HatStyle>>(() => new Set(['none']));
  const [equippedGlasses, setEquippedGlasses] = useState<GlassesStyle>('none');
  const [ownedGlasses, setOwnedGlasses] = useState<Set<GlassesStyle>>(() => new Set(['none']));

  const coop = useCoopTree();

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
    setSeeds((s) => s + QUEST_REWARD);
    const def = QUEST_DEFS.find((q) => q.key === kind);
    showNudge(`${def?.icon} 오늘의 퀘스트 완료! 🌰 +${QUEST_REWARD}`);
  }

  function handleStageClick(e: ReactMouseEvent<HTMLElement>) {
    if (!armedPlant) return;
    if (seeds < armedPlant.cost) {
      showNudge('씨앗이 부족해요 🌰');
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
  }

  function toggleHat(id: HatStyle, cost: number) {
    if (ownedHats.has(id)) {
      setEquippedHat((cur) => (cur === id ? 'none' : id));
      return;
    }
    if (seeds < cost) {
      showNudge('씨앗이 부족해요 🌰');
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
      showNudge('씨앗이 부족해요 🌰');
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
    if (isWalking || drop) return;
    setIsWalking(true);
    showNudge('엄마가 산책을 시작했어요 🌿');

    let pos = mascotPos;
    for (const step of WALK_STEPS) {
      setHopping(true);
      await wait(600);
      addFootprint(pos);
      pos = { x: pos.x + step.x, y: pos.y + step.y };
      setMascotPos(pos);
      setHopping(false);
      await wait(120);
    }
    // 마스코트 몸통과 겹치지 않도록 발밑 옆쪽에 살짝 띄워서 등장
    setDrop({ x: pos.x + 30, y: pos.y + 16 });
    setIsWalking(false);
  }

  function harvestDrop() {
    if (!drop) return;
    setSeeds((s) => s + 1);
    addToast(drop, '🌰 +1');
    setDrop(null);
    setMascotPos({ x: 0, y: 0 });
    completeQuest('harvest');
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

      {/* 상단 = 정보 + 씨앗 자원 + (데모용) 활동 신호 트리거 */}
      <header className="relative z-20 flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center gap-3 rounded-full bg-cream/80 px-5 py-2.5 shadow-[0_6px_20px_rgba(120,110,180,0.10)] backdrop-blur-sm">
          <span className="text-lg leading-none">🏡</span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-ink">엄마의 정원</span>
            <span className="text-xs text-ink/60">오늘도 평온해요 · 오전 9:12</span>
          </div>
          <div className="ml-1 flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-1 text-xs font-semibold text-ink">
            🌰 {seeds}
          </div>
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

      {/* 중앙 = 탭별 컨텐츠 */}
      <main
        className="relative flex-1"
        onClick={handleStageClick}
        style={{ cursor: armedPlant ? 'copy' : undefined }}
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

            {/* 함께 키우는 나무 — 무대 정중앙, 씨앗~열매 성장 비주얼 */}
            <div
              className="absolute"
              style={{
                left: TREE_ANCHOR.left,
                top: TREE_ANCHOR.top,
                marginLeft: -(TREE_SIZE / 2),
                marginTop: -(TREE_SIZE * 1.25 * 0.92),
              }}
            >
              <TreeVisual stage={coop.stage} justGrew={coop.justGrew} size={TREE_SIZE} />
            </div>

            {/* 마스코트 접지 그림자 — 기본 위치는 집 앞 */}
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

            {/* 마스코트 — 집 앞이 기본 위치, 산책 신호를 받으면 집에서 멀어지는 쪽(오른쪽)으로 짧게 hop */}
            <motion.div
              className="absolute"
              style={{
                left: HOUSE_FRONT_ANCHOR.left,
                top: HOUSE_FRONT_ANCHOR.top,
                marginLeft: -55,
                marginTop: -64,
              }}
              animate={{ x: mascotPos.x, y: mascotPos.y }}
              transition={{ type: 'spring', stiffness: 130, damping: 15 }}
            >
              <Mascot
                size={110}
                hopping={hopping}
                config={{ ...deriveMascotShades(mascotBaseColor), hat: equippedHat, glasses: equippedGlasses }}
              />
            </motion.div>

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
            <TreeVisual stage={coop.stage} justGrew={coop.justGrew} size={220} />
            <TreeGauges
              parentProgress={coop.parentProgress}
              childProgress={coop.childProgress}
              stage={coop.stage}
              onContributeParent={coop.contributeParent}
              onContributeChild={coop.contributeChild}
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
      </main>

      {/* 식물 상점 (정원 탭에서 🌷 심기를 눌렀을 때만) */}
      {activeTab === 'garden' && showPlantTray && (
        <div className="relative z-20 px-4 pb-3">
          <div className="mx-auto flex max-w-sm items-center justify-center gap-2.5 rounded-3xl bg-cream/85 px-4 py-3 shadow-[0_6px_20px_rgba(120,110,180,0.10)] backdrop-blur-sm">
            {PLANT_SHOP.map((p) => (
              <button
                key={p.id}
                onClick={() => setArmedPlant(p)}
                disabled={seeds < p.cost}
                className="flex flex-col items-center gap-0.5"
                style={{
                  opacity: seeds < p.cost ? 0.4 : 1,
                }}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xl"
                  style={{ background: armedPlant?.id === p.id ? 'var(--color-soft-purple)' : 'transparent' }}
                >
                  {p.kind === 'pond' ? <PondVisual size={30} /> : p.emoji}
                </span>
                <span className="text-[10px] font-semibold text-garden-green">🌰{p.cost}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-center text-[11px] text-ink/50">
            {armedPlant ? '정원을 탭해서 심어주세요' : '씨앗으로 심을 식물을 골라주세요'}
          </p>
        </div>
      )}

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
                    <span className="text-xs font-semibold text-garden-green">+{QUEST_REWARD}🌰</span>
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
