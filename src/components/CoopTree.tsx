import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { deriveShades } from '../lib/color';
import { GroundShadow, PencilFilter } from '../lib/gardenArt';

// 씨앗·새싹 단계는 이미지 잘라내기가 덜 깔끔해서(배경 잔여/접지감 부족) 기존 손그림 SVG를 그대로 쓴다.
const TREE_MID = '#8FB27A';
const TREE_LO = '#6E9160';
const TRUNK = deriveShades('#8A6A4A');

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

  if (clampedStage <= 1) {
    // 씨앗/새싹은 완성된 나무보다 훨씬 작으므로, 전체 캔버스(160x200)를 그대로 쓰면 위쪽에
    // 빈 공간만 크게 남아 "붕 떠있는" 것처럼 보인다. 실제 내용물 주변만 타이트하게 잘라서
    // 박스 맨 아래(땅)에 붙여 그린다 — 이미지 단계(나무/열매)와 같은 접지선을 공유.
    const viewBox = clampedStage === 0 ? '30 155 100 50' : '50 118 60 82';
    const svgHeight = clampedStage === 0 ? size * 0.32 : size * 0.5;
    const svgWidth = clampedStage === 0 ? size * 0.64 : size * 0.44;
    return (
      <div className="relative" style={{ width: size, height: size * 1.15 }}>
        <motion.svg
          width={svgWidth}
          height={svgHeight}
          viewBox={viewBox}
          className="absolute bottom-[6%] left-1/2 -translate-x-1/2"
        >
          <defs>
            <PencilFilter id="treePencilEarly" />
          </defs>
          <GroundShadow cx={80} cy={184} rx={42} ry={9} opacity={0.28} />
          <g filter="url(#treePencilEarly)">
            {clampedStage === 0 && (
              <>
                <ellipse cx="80" cy="178" rx="11" ry="8" fill={TRUNK.mid} />
                <ellipse cx="77" cy="175" rx="4" ry="3" fill={TRUNK.hi} opacity="0.7" />
              </>
            )}
            {clampedStage === 1 && (
              <g>
                <path d="M80 180 C80 168 80 160 80 152" stroke={TRUNK.mid} strokeWidth="4" fill="none" strokeLinecap="round" />
                <motion.g
                  style={{ transformOrigin: '80px 152px' }}
                  animate={{ scale: justGrew ? [1, 1.3, 1] : 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  <path d="M80 158 C68 154 61 143 66 132 C79 135 86 148 80 158 Z" fill={TREE_MID} />
                  <path d="M80 164 C92 158 99 146 94 135 C81 138 74 152 80 164 Z" fill={TREE_LO} />
                </motion.g>
              </g>
            )}
          </g>
        </motion.svg>
      </div>
    );
  }

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
