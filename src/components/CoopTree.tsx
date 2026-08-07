import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const MAX = 100;

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

// TODO: 실서비스에서는 coop_tree 테이블 realtime 구독으로 대체(섹션 7). 지금은 데모용 로컬 상태 + 수동 기여 버튼.
export function CoopTree() {
  const [parentProgress, setParentProgress] = useState(30);
  const [childProgress, setChildProgress] = useState(15);
  const [stage, setStage] = useState(1);
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

  const canopy = 22 + stage * 6;

  return (
    <div className="mx-auto flex max-w-sm items-center gap-3 rounded-3xl bg-cream/85 px-4 py-3 shadow-[0_6px_20px_rgba(120,110,180,0.10)] backdrop-blur-sm">
      <svg width="72" height="86" viewBox="0 0 72 86" className="shrink-0">
        <ellipse cx="36" cy="78" rx="18" ry="5" fill="#4A3A28" opacity="0.16" />
        <rect x="32" y="46" width="8" height="30" rx="4" fill="#8A6A4A" />
        <motion.g
          style={{ transformOrigin: '36px 40px' }}
          animate={{ scale: justGrew ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <circle cx="36" cy="40" r={canopy} fill="#8FAE74" />
          <circle cx="23" cy="36" r={canopy * 0.62} fill="#A8C594" />
          <circle cx="49" cy="36" r={canopy * 0.62} fill="#7B9E6E" />
        </motion.g>
      </svg>

      <div className="flex-1">
        <span className="mb-1.5 block text-xs font-semibold text-ink">함께 키우는 나무 · {stage}단계</span>
        <div className="space-y-1.5">
          <GaugeBar emoji="🌿" label="엄마" color="bg-garden-green" value={parentProgress} />
          <GaugeBar emoji="💜" label="나" color="bg-soft-purple" value={childProgress} />
        </div>
      </div>

      {/* TODO: 데모용 수동 기여 버튼. 실서비스에서는 활동 신호/돌봄 행동에서 자동 반영. */}
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => setParentProgress((p) => Math.min(MAX, p + 20))}
          className="rounded-full bg-garden-green/15 px-2 py-1 text-[11px] font-semibold text-garden-green"
        >
          +🌿
        </button>
        <button
          onClick={() => setChildProgress((c) => Math.min(MAX, c + 20))}
          className="rounded-full bg-soft-purple/20 px-2 py-1 text-[11px] font-semibold text-purple-ink"
        >
          +💜
        </button>
      </div>
    </div>
  );
}
