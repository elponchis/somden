import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const MAX = 100;
// 4단계로 압축: 씨앗 → 새싹 → 나무 → 열매가 풍성한 나무. 마지막 두 단계는 수확↔물주기로 순환한다.
const STAGE_LABELS = ['씨앗', '새싹', '나무', '열매가 풍성한 나무'];
const STAGE_IMAGES = ['/tree-seed.png', '/tree-sprout.png', '/tree-full.png', '/tree-fruit.png'];
const LAST_STAGE = STAGE_LABELS.length - 1;
const MATURE_STAGE = LAST_STAGE - 1; // '나무' — 열매/수확 순환의 기준 단계

// 물주기(자녀 기여)/부모 활동 재생(부모 기여) 1회당 게이지 증가량. 대충 잡은 값 — 나중에 밸런싱.
const WATER_GAIN = 25;
const PARENT_REPLAY_GAIN = 25;

export function treeStageLabel(stage: number) {
  return STAGE_LABELS[Math.min(stage, STAGE_LABELS.length - 1)];
}

// TODO: 실서비스에서는 coop_tree 테이블 realtime 구독으로 대체(섹션 7). 지금은 데모용 로컬 상태.
export function useCoopTree() {
  const [parentProgress, setParentProgress] = useState(30);
  const [childProgress, setChildProgress] = useState(15);
  const [stage, setStage] = useState(0);
  const [justGrew, setJustGrew] = useState(false);

  useEffect(() => {
    if (stage < LAST_STAGE && parentProgress >= MAX && childProgress >= MAX) {
      setJustGrew(true);
      const growTimer = setTimeout(() => {
        setStage((s) => Math.min(s + 1, LAST_STAGE));
        setParentProgress(0);
        setChildProgress(0);
      }, 500);
      const flagTimer = setTimeout(() => setJustGrew(false), 1100);
      return () => {
        clearTimeout(growTimer);
        clearTimeout(flagTimer);
      };
    }
  }, [parentProgress, childProgress, stage]);

  function water() {
    setChildProgress((c) => Math.min(MAX, c + WATER_GAIN));
  }

  function replayParent() {
    setParentProgress((p) => Math.min(MAX, p + PARENT_REPLAY_GAIN));
  }

  // '열매가 풍성한 나무' 단계에서 나무를 탭하면 한 번에 수확하고 '나무' 단계로 되돌아간다.
  // 이후 다시 물을 주고 채우면 열매가 풍성한 나무로 돌아오는 순환 구조.
  function harvest() {
    if (stage !== LAST_STAGE) return false;
    setStage(MATURE_STAGE);
    setParentProgress(0);
    setChildProgress(0);
    return true;
  }

  return { parentProgress, childProgress, stage, justGrew, water, replayParent, harvest };
}

// 손으로 자른 정원 그림 에셋(씨앗/새싹/나무/열매 나무)을 단계별로 보여준다.
// 열매가 풍성한 나무 단계에서만 탭 가능 — 한 번 탭하면 전체 수확 + '나무' 단계로 정착.
export function TreeVisual({
  stage,
  justGrew,
  size = 200,
  onHarvest,
}: {
  stage: number;
  justGrew: boolean;
  size?: number;
  onHarvest?: () => void;
}) {
  const clampedStage = Math.min(stage, LAST_STAGE);
  const interactive = clampedStage === LAST_STAGE && Boolean(onHarvest);

  return (
    <div className="relative" style={{ width: size, height: size * 1.15 }}>
      <div
        className="absolute rounded-[50%]"
        style={{
          left: '50%',
          bottom: '4%',
          width: size * 0.62,
          height: size * 0.14,
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse, rgba(74,58,40,0.28) 0%, rgba(74,58,40,0) 72%)',
        }}
      />
      <motion.img
        key={clampedStage}
        src={STAGE_IMAGES[clampedStage]}
        alt={STAGE_LABELS[clampedStage]}
        className="absolute inset-0 h-full w-full select-none object-contain"
        style={{ cursor: interactive ? 'pointer' : undefined }}
        draggable={false}
        onClick={interactive ? onHarvest : undefined}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: justGrew ? [1, 1.16, 1] : 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      {interactive && (
        <motion.p
          className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-purple-ink px-2.5 py-1 text-[10px] font-medium text-cream shadow-[0_4px_12px_rgba(120,110,180,0.18)]"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          탭해서 수확하기 🌰
        </motion.p>
      )}
    </div>
  );
}

function GaugeBar({
  emoji,
  label,
  color,
  value,
}: {
  emoji: string;
  label: string;
  color: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[11px] font-medium text-ink/70">
        {emoji} {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-deep">
        <motion.div
          className={`h-full rounded-full ${color}`}
          animate={{ width: `${value}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

export function TreeGauges({
  parentProgress,
  childProgress,
  stage,
  dropletsAvailable,
  onWater,
  onReplayParent,
}: {
  parentProgress: number;
  childProgress: number;
  stage: number;
  dropletsAvailable: boolean;
  onWater: () => void;
  onReplayParent: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-3xl bg-cream/85 px-4 py-3 shadow-[0_6px_20px_rgba(120,110,180,0.10)] backdrop-blur-sm">
      <span className="text-xs font-semibold text-ink">
        함께 키우는 나무 · {treeStageLabel(stage)} ({Math.min(stage + 1, STAGE_LABELS.length)}단계)
      </span>
      <div className="space-y-1.5">
        <GaugeBar emoji="🌿" label="엄마" color="bg-garden-green" value={parentProgress} />
        <GaugeBar emoji="💜" label="나" color="bg-soft-purple" value={childProgress} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onWater}
          disabled={!dropletsAvailable}
          className="flex-1 rounded-2xl bg-garden-green px-3 py-2 text-xs font-semibold text-cream shadow-[0_4px_12px_rgba(120,110,180,0.12)] disabled:bg-cream-deep disabled:text-ink/30 disabled:shadow-none"
        >
          💧 물주기
        </button>
        <button
          onClick={onReplayParent}
          className="flex-1 rounded-2xl bg-soft-purple/70 px-3 py-2 text-xs font-semibold text-purple-ink shadow-[0_4px_12px_rgba(120,110,180,0.12)]"
        >
          🌿 부모 활동 재생
        </button>
      </div>
    </div>
  );
}
