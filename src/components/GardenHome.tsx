import { useState, type MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mascot } from './Mascot';
import { CoopTree } from './CoopTree';
import { Customize } from './Customize';
import { NoteBoard } from './NoteBoard';
import { deriveMascotShades } from '../lib/color';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TABS = [
  { key: 'garden', label: '정원', icon: '🌱' },
  { key: 'decorate', label: '꾸미기', icon: '🎀' },
  { key: 'note', label: '손글씨', icon: '✏️' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// bg-day.jpg 기준 창문 좌표 (문 오른쪽 창). 아침/밤/비 변주 이미지도 같은 구도라 좌표 재사용 가능.
const WINDOW_POSITION = { left: '27.5%', top: '37%' };
// 마스코트/발자국/아이템이 공유하는 무대 기준점 (main 기준 %)
const STAGE_ANCHOR = { left: '50%', top: '74%' };

type Point = { x: number; y: number };
type Footprint = Point & { id: number };
type Toast = Point & { id: number; text: string };

// 마스코트는 화면을 가로지르지 않고, 무대 안에서 짧게 2~4번 hop 후 정지한다.
const WALK_STEPS: Point[] = [
  { x: 30, y: -8 },
  { x: 28, y: -6 },
  { x: 22, y: -4 },
];

type QuestKey = 'sticker' | 'note' | 'harvest';
const QUEST_DEFS: { key: QuestKey; label: string; icon: string }[] = [
  { key: 'sticker', label: '엄마 정원에 스티커 붙이기', icon: '🎀' },
  { key: 'note', label: '손글씨 쪽지 보내기', icon: '✏️' },
  { key: 'harvest', label: '오늘 자란 열매 수확하기', icon: '🌰' },
];
const QUEST_REWARD = 2;

type StickerItem = { id: number; emoji: string; xPct: number; yPct: number };
const STICKER_EMOJIS = ['🌸', '💐', '🦋', '⭐', '💝', '🌈'];

type TimeOfDay = 'morning' | 'day' | 'night' | 'rain';
const TIME_OPTIONS: { key: TimeOfDay; icon: string }[] = [
  { key: 'morning', icon: '🌅' },
  { key: 'day', icon: '☀️' },
  { key: 'night', icon: '🌙' },
  { key: 'rain', icon: '🌧️' },
];
// TODO: public/bg-{morning,day,night,rain}.jpg 준비되면 교체(섹션 9). 지금은 시간대별 그라디언트 플레이스홀더.
const BG_GRADIENT: Record<TimeOfDay, string> = {
  morning: 'linear-gradient(180deg, #FBD8B0 0%, #F6C9A8 30%, #E9D3B0 55%, #CFE0AE 100%)',
  day: 'linear-gradient(180deg, #CFE3E0 0%, #DCEBD3 38%, #C9DDB4 62%, #AEC998 100%)',
  night: 'linear-gradient(180deg, #232A4D 0%, #2E3768 35%, #3B4372 60%, #46523E 100%)',
  rain: 'linear-gradient(180deg, #B9C2C9 0%, #C3CBCB 35%, #B7C2B0 65%, #9FAE93 100%)',
};
const BG_IMAGE: Record<TimeOfDay, string> = {
  morning: '/bg-morning.jpg',
  day: '/bg-day.jpg',
  night: '/bg-night.jpg',
  rain: '/bg-rain.jpg',
};

export function GardenHome() {
  const [activeTab, setActiveTab] = useState<TabKey>('garden');
  const [windowLit, setWindowLit] = useState(false);
  const [seeds, setSeeds] = useState(0);
  const [mascotBaseColor, setMascotBaseColor] = useState('#8FAE74');

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

  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [armedSticker, setArmedSticker] = useState<string | null>(null);
  const [showStickerTray, setShowStickerTray] = useState(false);

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
    if (!armedSticker) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.min(84, Math.max(16, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(88, Math.max(14, ((e.clientY - rect.top) / rect.height) * 100));
    setStickers((list) => [...list, { id: Date.now() + Math.random(), emoji: armedSticker, xPct, yPct }]);
    setArmedSticker(null);
    setShowStickerTray(false);
    completeQuest('sticker');
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
              onClick={() => setShowStickerTray((v) => !v)}
              className="rounded-full px-3.5 py-1.5 text-xs font-medium shadow-[0_4px_14px_rgba(120,110,180,0.08)] backdrop-blur-sm"
              style={{
                background: showStickerTray ? 'var(--color-soft-purple)' : 'rgba(251,243,230,0.7)',
                color: showStickerTray ? '#FBF3E6' : undefined,
              }}
            >
              🎀 스티커
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
        style={{ cursor: armedSticker ? 'copy' : undefined }}
      >
        {activeTab === 'garden' && (
          <>
            {/* 자유 배치된 스티커 */}
            {stickers.map((s) => (
              <motion.span
                key={s.id}
                className="absolute select-none text-2xl"
                style={{ left: `${s.xPct}%`, top: `${s.yPct}%`, marginLeft: -14, marginTop: -14 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              >
                {s.emoji}
              </motion.span>
            ))}

            {/* 접지 그림자 + 잔디 무대 */}
            <div
              className="absolute h-6 w-40 rounded-[50%]"
              style={{
                left: STAGE_ANCHOR.left,
                top: STAGE_ANCHOR.top,
                marginLeft: -80,
                marginTop: 50,
                background: 'radial-gradient(ellipse, rgba(94,125,82,0.35) 0%, rgba(94,125,82,0) 72%)',
              }}
            />

            {/* 마스코트 (짧은 hop 이동) */}
            <motion.div
              className="absolute"
              style={{ left: STAGE_ANCHOR.left, top: STAGE_ANCHOR.top, marginLeft: -64, marginTop: -74 }}
              animate={{ x: mascotPos.x, y: mascotPos.y }}
              transition={{ type: 'spring', stiffness: 130, damping: 15 }}
            >
              <Mascot size={128} hopping={hopping} config={deriveMascotShades(mascotBaseColor)} />
            </motion.div>

            {/* 지나온 자리의 점선 발자국 (1.5초 페이드) */}
            {footprints.map((fp) => (
              <motion.div
                key={fp.id}
                className="absolute flex gap-1.5"
                style={{ left: STAGE_ANCHOR.left, top: STAGE_ANCHOR.top, marginLeft: fp.x - 10, marginTop: fp.y - 4 }}
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
                style={{ left: STAGE_ANCHOR.left, top: STAGE_ANCHOR.top, marginLeft: drop.x - 18, marginTop: drop.y - 18 }}
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
                style={{ left: STAGE_ANCHOR.left, top: STAGE_ANCHOR.top, marginLeft: t.x - 14, marginTop: t.y - 18 }}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              >
                {t.text}
              </motion.div>
            ))}
          </>
        )}

        {activeTab === 'decorate' && <Customize baseColor={mascotBaseColor} onSelect={setMascotBaseColor} />}
        {activeTab === 'note' && <NoteBoard onSend={() => completeQuest('note')} />}
      </main>

      {/* 스티커 트레이 (정원 탭에서 🎀 스티커를 눌렀을 때만) */}
      {activeTab === 'garden' && showStickerTray && (
        <div className="relative z-20 px-4 pb-3">
          <div className="mx-auto flex max-w-sm items-center justify-center gap-2.5 rounded-3xl bg-cream/85 px-4 py-3 shadow-[0_6px_20px_rgba(120,110,180,0.10)] backdrop-blur-sm">
            {STICKER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setArmedSticker(emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl"
                style={{ background: armedSticker === emoji ? 'var(--color-soft-purple)' : 'transparent' }}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-center text-[11px] text-ink/50">
            {armedSticker ? '정원을 탭해서 붙여주세요' : '붙일 스티커를 골라주세요'}
          </p>
        </div>
      )}

      {/* 협동 목표 = 함께 키우는 나무 (정원 탭, 스티커 트레이가 닫혀 있을 때) */}
      {activeTab === 'garden' && !showStickerTray && (
        <div className="relative z-20 px-4 pb-3">
          <CoopTree />
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
