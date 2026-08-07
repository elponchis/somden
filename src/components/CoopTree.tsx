import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { deriveShades } from '../lib/color';
import { GroundShadow, PencilFilter } from '../lib/gardenArt';

const MAX = 100;
const STAGE_LABELS = ['씨앗', '새싹', '줄기', '나무', '열매'];

export function treeStageLabel(stage: number) {
  return STAGE_LABELS[Math.min(stage, STAGE_LABELS.length - 1)];
}

// TODO: 실서비스에서는 coop_tree 테이블 realtime 구독으로 대체(섹션 7). 지금은 데모용 로컬 상태 + 수동 기여 버튼.
export function useCoopTree() {
  const [parentProgress, setParentProgress] = useState(30);
  const [childProgress, setChildProgress] = useState(15);
  const [stage, setStage] = useState(0);
  const [justGrew, setJustGrew] = useState(false);

  useEffect(() => {
    if (parentProgress >= MAX && childProgress >= MAX) {
      setJustGrew(true);
      const growTimer = setTimeout(() => {
        setStage((s) => s + 1);
        setParentProgress(0);
        setChildProgress(0);
      }, 500);
      const flagTimer = setTimeout(() => setJustGrew(false), 1100);
      return () => {
        clearTimeout(growTimer);
        clearTimeout(flagTimer);
      };
    }
  }, [parentProgress, childProgress]);

  return {
    parentProgress,
    childProgress,
    stage,
    justGrew,
    contributeParent: () => setParentProgress((p) => Math.min(MAX, p + 20)),
    contributeChild: () => setChildProgress((c) => Math.min(MAX, c + 20)),
  };
}

// 마스코트 몸통 기본 그라디언트와 동일한 3톤 — "나무를 크게 늘린 마스코트"로 보이게 팔레트를 맞춘다.
const TREE_HI = '#A8C594';
const TREE_MID = '#8FB27A';
const TREE_LO = '#6E9160';
const TRUNK = deriveShades('#8A6A4A');
const FRUIT_COLOR = '#C9897B'; // 채도를 낮춘 뮤트 테라코타

const FRUIT_SPOTS: [number, number][] = [
  [58, 92],
  [100, 92],
  [80, 68],
  [68, 112],
  [92, 108],
  [80, 132],
];

// 캐노피: 원 3개를 겹치는 대신, 손그림처럼 뭉친 유기적 실루엣 하나로.
const CANOPY_BLOB =
  'M 82 50 C 104 48 124 62 128 84 C 131 102 122 118 108 128 C 116 136 110 146 92 148 ' +
  'C 74 150 58 146 46 136 C 32 124 28 106 34 88 C 39 72 50 60 64 54 C 70 51 76 50 82 50 Z';

// 0=씨앗 1=새싹 2=줄기 3=나무 4+=열매. 무대에 크게 그려지는 성장 비주얼.
// 마스코트와 같은 규칙(gradient 3톤 + 연필 질감 필터 + 접지 그림자)을 따른다.
export function TreeVisual({ stage, justGrew, size = 200 }: { stage: number; justGrew: boolean; size?: number }) {
  const fruitCount = Math.min(Math.max(stage - 3, 0), FRUIT_SPOTS.length);

  return (
    <motion.svg width={size} height={size * 1.25} viewBox="0 0 160 200">
      <defs>
        <radialGradient id="treeCanopy" cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor={TREE_HI} />
          <stop offset="55%" stopColor={TREE_MID} />
          <stop offset="100%" stopColor={TREE_LO} />
        </radialGradient>
        <linearGradient id="treeTrunk" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={TRUNK.hi} />
          <stop offset="55%" stopColor={TRUNK.mid} />
          <stop offset="100%" stopColor={TRUNK.lo} />
        </linearGradient>
        <PencilFilter id="treePencil" />
      </defs>

      {/* 접지 그림자 — 마스코트와 동일한 색·불투명도 */}
      <GroundShadow cx={80} cy={184} rx={42} ry={9} opacity={0.28} />

      <g filter="url(#treePencil)">
        {stage === 0 && (
          <>
            <ellipse cx="80" cy="178" rx="11" ry="8" fill={TRUNK.mid} />
            <ellipse cx="77" cy="175" rx="4" ry="3" fill={TRUNK.hi} opacity="0.7" />
          </>
        )}

        {stage === 1 && (
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

        {stage === 2 && (
          <g>
            <rect x="76" y="112" width="8" height="68" rx="4" fill="url(#treeTrunk)" />
            <motion.g
              style={{ transformOrigin: '80px 145px' }}
              animate={{ scale: justGrew ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <path d="M76 168 C64 165 58 156 62 148 C73 150 79 160 76 168 Z" fill={TREE_MID} />
              <path d="M84 158 C96 155 102 145 98 137 C87 140 81 150 84 158 Z" fill={TREE_LO} />
              <path d="M76 138 C65 135 60 127 64 120 C74 122 79 131 76 138 Z" fill={TREE_HI} />
              <path d="M84 128 C95 125 100 116 96 110 C86 112 80 121 84 128 Z" fill={TREE_MID} />
            </motion.g>
          </g>
        )}

        {stage >= 3 && (
          <g>
            <rect x="70" y="118" width="20" height="66" rx="7" fill="url(#treeTrunk)" />
            <motion.g
              style={{ transformOrigin: '80px 100px' }}
              animate={{ scale: justGrew ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <path d={CANOPY_BLOB} fill="url(#treeCanopy)" />
              {FRUIT_SPOTS.slice(0, fruitCount).map(([fx, fy], i) => (
                <circle key={i} cx={fx} cy={fy} r="4.2" fill={FRUIT_COLOR} />
              ))}
            </motion.g>
          </g>
        )}
      </g>
    </motion.svg>
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
  onContributeParent,
  onContributeChild,
}: {
  parentProgress: number;
  childProgress: number;
  stage: number;
  onContributeParent: () => void;
  onContributeChild: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-sm items-center gap-3 rounded-3xl bg-cream/85 px-4 py-3 shadow-[0_6px_20px_rgba(120,110,180,0.10)] backdrop-blur-sm">
      <div className="flex-1">
        <span className="mb-1.5 block text-xs font-semibold text-ink">
          함께 키우는 나무 · {treeStageLabel(stage)} ({stage + 1}단계)
        </span>
        <div className="space-y-1.5">
          <GaugeBar emoji="🌿" label="엄마" color="bg-garden-green" value={parentProgress} />
          <GaugeBar emoji="💜" label="나" color="bg-soft-purple" value={childProgress} />
        </div>
      </div>

      {/* TODO: 데모용 수동 기여 버튼. 실서비스에서는 활동 신호/돌봄 행동에서 자동 반영. */}
      <div className="flex flex-col gap-1.5">
        <button
          onClick={onContributeParent}
          className="rounded-full bg-garden-green/15 px-2 py-1 text-[11px] font-semibold text-garden-green"
        >
          +🌿
        </button>
        <button
          onClick={onContributeChild}
          className="rounded-full bg-soft-purple/20 px-2 py-1 text-[11px] font-semibold text-purple-ink"
        >
          +💜
        </button>
      </div>
    </div>
  );
}
