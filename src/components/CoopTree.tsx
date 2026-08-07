import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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

const FRUIT_SPOTS: [number, number][] = [
  [58, 92],
  [100, 92],
  [80, 68],
  [68, 112],
  [92, 108],
  [80, 132],
];

// 0=씨앗 1=새싹 2=줄기 3=나무 4+=열매. 무대 정중앙에 크게 그려지는 성장 비주얼.
export function TreeVisual({ stage, justGrew, size = 200 }: { stage: number; justGrew: boolean; size?: number }) {
  const fruitCount = Math.min(Math.max(stage - 3, 0), FRUIT_SPOTS.length);

  return (
    <motion.svg width={size} height={size * 1.25} viewBox="0 0 160 200">
      <ellipse cx="80" cy="184" rx="46" ry="10" fill="#4A3A28" opacity="0.16" />

      {stage === 0 && (
        <>
          <ellipse cx="80" cy="178" rx="11" ry="8" fill="#8A6A4A" />
          <ellipse cx="77" cy="175" rx="4" ry="3" fill="#C9A97A" opacity="0.7" />
        </>
      )}

      {stage === 1 && (
        <g>
          <path d="M80 180 C80 168 80 160 80 152" stroke="#5E8050" strokeWidth="4" fill="none" strokeLinecap="round" />
          <motion.g
            style={{ transformOrigin: '80px 152px' }}
            animate={{ scale: justGrew ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <path d="M80 158 C68 154 61 143 66 132 C79 135 86 148 80 158 Z" fill="#9DBE7E" />
            <path d="M80 164 C92 158 99 146 94 135 C81 138 74 152 80 164 Z" fill="#8CB06E" />
          </motion.g>
        </g>
      )}

      {stage === 2 && (
        <g>
          <rect x="76" y="112" width="8" height="68" rx="4" fill="#8A6A4A" />
          <motion.g
            style={{ transformOrigin: '80px 145px' }}
            animate={{ scale: justGrew ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <path d="M76 168 C64 165 58 156 62 148 C73 150 79 160 76 168 Z" fill="#9DBE7E" />
            <path d="M84 158 C96 155 102 145 98 137 C87 140 81 150 84 158 Z" fill="#8CB06E" />
            <path d="M76 138 C65 135 60 127 64 120 C74 122 79 131 76 138 Z" fill="#A6CC86" />
            <path d="M84 128 C95 125 100 116 96 110 C86 112 80 121 84 128 Z" fill="#9DBE7E" />
          </motion.g>
        </g>
      )}

      {stage >= 3 && (
        <g>
          <rect x="70" y="118" width="20" height="66" rx="7" fill="#8A6A4A" />
          <motion.g
            style={{ transformOrigin: '80px 100px' }}
            animate={{ scale: justGrew ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <circle cx="80" cy="98" r="46" fill="#8FAE74" />
            <circle cx="52" cy="88" r="30" fill="#A8C594" />
            <circle cx="108" cy="88" r="30" fill="#7B9E6E" />
            {FRUIT_SPOTS.slice(0, fruitCount).map(([fx, fy], i) => (
              <circle key={i} cx={fx} cy={fy} r="5.5" fill="#D97B6C" />
            ))}
          </motion.g>
        </g>
      )}
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
