import { useId } from 'react';
import { deriveShades } from '../lib/color';
import { PencilFilter } from '../lib/gardenArt';

// 물방울·씨앗도 마스코트와 같은 규칙(gradient 3톤 + 연필 질감)으로 그린다.
// 다만 헤더 자원바 같은 추상 UI 아이콘이라 접지 그림자는 생략(정원 씬에 놓인
// 오브젝트가 아니므로).
const DROP = deriveShades('#7EB8D9');
const SEED = deriveShades('#C9A15A');

export function DropletIcon({ size = 18 }: { size?: number }) {
  const uid = useId();
  const gradId = `dropGrad-${uid}`;
  const filterId = `dropPencil-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <radialGradient id={gradId} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor={DROP.hi} />
          <stop offset="55%" stopColor={DROP.mid} />
          <stop offset="100%" stopColor={DROP.lo} />
        </radialGradient>
        <PencilFilter id={filterId} />
      </defs>
      <g filter={`url(#${filterId})`}>
        <path
          d="M20 4 C28 16 33 25 33 30 C33 36 27 39 20 39 C13 39 7 36 7 30 C7 25 12 16 20 4 Z"
          fill={`url(#${gradId})`}
        />
      </g>
    </svg>
  );
}

export function SeedIcon({ size = 18 }: { size?: number }) {
  const uid = useId();
  const gradId = `seedGrad-${uid}`;
  const filterId = `seedPencil-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <radialGradient id={gradId} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor={SEED.hi} />
          <stop offset="55%" stopColor={SEED.mid} />
          <stop offset="100%" stopColor={SEED.lo} />
        </radialGradient>
        <PencilFilter id={filterId} />
      </defs>
      <g filter={`url(#${filterId})`}>
        <path d="M20 9 C20 6 20 4 20 2" stroke={SEED.lo} strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="20" cy="23" rx="12" ry="15" fill={`url(#${gradId})`} />
      </g>
    </svg>
  );
}

// 다음 충전까지 남은 진행률(0~1)을 원형으로 표시.
export function CooldownRing({ size = 22, progress }: { size?: number; progress: number }) {
  const r = size / 2 - 2.5;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-cream-deep)" strokeWidth="2.5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#89A6BE"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
