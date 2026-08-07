import { Mascot } from './Mascot';
import { deriveMascotShades } from '../lib/color';

// 배경 친화적인 뮤트 파스텔로만 제공 (섹션 1) — 쨍한 원색 배제.
const PALETTE = [
  { name: '세이지', hex: '#8FAE74' },
  { name: '살구', hex: '#E0A77E' },
  { name: '라벤더', hex: '#B9A6D8' },
  { name: '크림옐로', hex: '#E8C98A' },
  { name: '더스티블루', hex: '#89A6BE' },
  { name: '로즈', hex: '#D89AA0' },
];

export function Customize({ baseColor, onSelect }: { baseColor: string; onSelect: (hex: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6">
      <Mascot config={deriveMascotShades(baseColor)} size={150} />
      <div>
        <p className="mb-3 text-center text-sm font-medium text-ink/70">몸 색을 골라주세요</p>
        <div className="flex flex-wrap justify-center gap-3">
          {PALETTE.map((p) => (
            <button key={p.hex} onClick={() => onSelect(p.hex)} className="flex flex-col items-center gap-1">
              <span
                className="block h-11 w-11 rounded-full shadow-[0_4px_12px_rgba(120,110,180,0.15)] transition-transform"
                style={{
                  backgroundColor: p.hex,
                  outline: baseColor === p.hex ? '3px solid #534AB7' : 'none',
                  outlineOffset: 2,
                  transform: baseColor === p.hex ? 'scale(1.12)' : 'scale(1)',
                }}
              />
              <span className="text-[11px] text-ink/60">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
