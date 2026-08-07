import { Mascot, type GlassesStyle, type HatStyle } from './Mascot';
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

export const HAT_SHOP: { id: HatStyle; emoji: string; label: string; cost: number }[] = [
  { id: 'none', emoji: '➖', label: '없음', cost: 0 },
  { id: 'red', emoji: '🎩', label: '빨간 고깔', cost: 6 },
  { id: 'straw', emoji: '👒', label: '밀짚모자', cost: 6 },
  { id: 'beanie', emoji: '🧢', label: '비니', cost: 6 },
];

export const GLASSES_SHOP: { id: GlassesStyle; emoji: string; label: string; cost: number }[] = [
  { id: 'none', emoji: '➖', label: '없음', cost: 0 },
  { id: 'round', emoji: '👓', label: '동그란 안경', cost: 5 },
  { id: 'sunglasses', emoji: '🕶️', label: '선글라스', cost: 5 },
];

function ShopItem({
  emoji,
  label,
  cost,
  owned,
  equipped,
  affordable,
  onClick,
}: {
  emoji: string;
  label: string;
  cost: number;
  owned: boolean;
  equipped: boolean;
  affordable: boolean;
  onClick: () => void;
}) {
  const locked = !owned && !affordable;
  return (
    <button onClick={onClick} disabled={locked} className="flex flex-col items-center gap-1">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-transform"
        style={{
          background: equipped ? 'var(--color-soft-purple)' : 'var(--color-cream-deep)',
          opacity: locked ? 0.4 : 1,
          transform: equipped ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        {emoji}
      </span>
      <span className="text-[10px] text-ink/60">{label}</span>
      <span className="text-[10px] font-semibold text-garden-green">
        {cost === 0 ? '무료' : owned ? (equipped ? '장착중' : '보유') : `🌰 ${cost}`}
      </span>
    </button>
  );
}

export function Customize({
  baseColor,
  onSelectColor,
  seeds,
  equippedHat,
  ownedHats,
  onToggleHat,
  equippedGlasses,
  ownedGlasses,
  onToggleGlasses,
}: {
  baseColor: string;
  onSelectColor: (hex: string) => void;
  seeds: number;
  equippedHat: HatStyle;
  ownedHats: Set<HatStyle>;
  onToggleHat: (id: HatStyle, cost: number) => void;
  equippedGlasses: GlassesStyle;
  ownedGlasses: Set<GlassesStyle>;
  onToggleGlasses: (id: GlassesStyle, cost: number) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center gap-5 overflow-y-auto px-6 pt-2 pb-3">
      <Mascot
        config={{ ...deriveMascotShades(baseColor), hat: equippedHat, glasses: equippedGlasses }}
        size={130}
      />

      <div>
        <p className="mb-2.5 text-center text-sm font-medium text-ink/70">몸 색을 골라주세요</p>
        <div className="flex flex-wrap justify-center gap-3">
          {PALETTE.map((p) => (
            <button key={p.hex} onClick={() => onSelectColor(p.hex)} className="flex flex-col items-center gap-1">
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

      <div>
        <p className="mb-2.5 text-center text-sm font-medium text-ink/70">🌰 {seeds}개로 모자를 사볼까요?</p>
        <div className="flex flex-wrap justify-center gap-3">
          {HAT_SHOP.map((h) => (
            <ShopItem
              key={h.id}
              emoji={h.emoji}
              label={h.label}
              cost={h.cost}
              owned={ownedHats.has(h.id)}
              equipped={equippedHat === h.id}
              affordable={seeds >= h.cost}
              onClick={() => onToggleHat(h.id, h.cost)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-center text-sm font-medium text-ink/70">안경도 씌워볼까요?</p>
        <div className="flex flex-wrap justify-center gap-3">
          {GLASSES_SHOP.map((g) => (
            <ShopItem
              key={g.id}
              emoji={g.emoji}
              label={g.label}
              cost={g.cost}
              owned={ownedGlasses.has(g.id)}
              equipped={equippedGlasses === g.id}
              affordable={seeds >= g.cost}
              onClick={() => onToggleGlasses(g.id, g.cost)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
