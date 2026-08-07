import { deriveShades } from '../lib/color';
import { GroundShadow, PencilFilter } from '../lib/gardenArt';

// 연못도 마스코트·나무와 같은 규칙(gradient 3톤 + 연필 질감 + 접지 그림자)으로 그린다.
const WATER = deriveShades('#8FB6B4');

export function PondVisual({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 120 86">
      <defs>
        <radialGradient id="pondWater" cx="38%" cy="32%" r="80%">
          <stop offset="0%" stopColor={WATER.hi} />
          <stop offset="55%" stopColor={WATER.mid} />
          <stop offset="100%" stopColor={WATER.lo} />
        </radialGradient>
        <PencilFilter id="pondPencil" />
      </defs>

      <GroundShadow cx={60} cy={78} rx={38} ry={7} opacity={0.2} />

      <g filter="url(#pondPencil)">
        <ellipse cx="60" cy="42" rx="52" ry="28" fill="url(#pondWater)" />
        <ellipse cx="44" cy="30" rx="16" ry="7" fill="#EAF5F3" opacity="0.45" />
      </g>
    </svg>
  );
}
