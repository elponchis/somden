import { motion } from 'framer-motion';

export type HatStyle = 'none' | 'red' | 'straw' | 'beanie';
export type GlassesStyle = 'none' | 'round' | 'sunglasses';

export type MascotConfig = {
  bodyHi?: string;
  bodyMid?: string;
  bodyLo?: string; // gradient 3톤
  footColor?: string;
  brows?: boolean;
  cheek?: boolean;
  hat?: HatStyle;
  glasses?: GlassesStyle;
};

export function Mascot({
  config = {},
  hopping = false,
  size = 130,
}: {
  config?: MascotConfig;
  hopping?: boolean;
  size?: number;
}) {
  const {
    bodyHi = '#A8C594',
    bodyMid = '#8FB27A',
    bodyLo = '#6E9160',
    footColor = '#5E7D52',
    brows = false,
    cheek = true,
    hat = 'none',
    glasses = 'none',
  } = config;

  return (
    <motion.svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 130 150"
      animate={
        hopping
          ? { y: [0, -34, 0], scaleX: [1, 0.88, 1.12, 1], scaleY: [1, 1.14, 0.9, 1] }
          : { y: [0, -3, 0] }
      }
      transition={
        hopping
          ? { duration: 0.6, ease: 'easeOut' }
          : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
      }
      style={{ transformOrigin: '65px 130px' }}
    >
      <defs>
        <radialGradient id="body" cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor={bodyHi} />
          <stop offset="55%" stopColor={bodyMid} />
          <stop offset="100%" stopColor={bodyLo} />
        </radialGradient>
        <filter id="pencil" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      {/* 진한 그림자 = 접지 */}
      <ellipse cx="65" cy="140" rx="35" ry="8" fill="#4A3A28" opacity="0.28" />
      <g filter="url(#pencil)">
        <ellipse cx="52" cy="132" rx="9.5" ry="6.5" fill={footColor} />
        <ellipse cx="78" cy="132" rx="9.5" ry="6.5" fill={footColor} />
        <path
          d="M65 40 C100 40 108 78 105 100 C102 125 88 134 65 134 C42 134 28 125 25 100 C22 78 30 40 65 40 Z"
          fill="url(#body)"
        />
        <ellipse cx="50" cy="60" rx="20" ry="14" fill={bodyHi} opacity="0.4" />
        {cheek && (
          <>
            <ellipse cx="43" cy="99" rx="8" ry="5" fill="#EE9A94" opacity="0.55" />
            <ellipse cx="87" cy="99" rx="8" ry="5" fill="#EE9A94" opacity="0.55" />
          </>
        )}
        {brows && (
          <>
            <path d="M40 68 Q47 63 54 67" stroke="#3A4A32" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M76 67 Q83 63 90 68" stroke="#3A4A32" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </>
        )}
        <ellipse cx="50" cy="84" rx="7.5" ry="8.5" fill="#3A3228" />
        <ellipse cx="80" cy="84" rx="7.5" ry="8.5" fill="#3A3228" />
        <circle cx="52.8" cy="80.5" r="2.8" fill="#fff" />
        <circle cx="82.8" cy="80.5" r="2.8" fill="#fff" />
        {glasses === 'round' && (
          <g>
            <circle cx="50" cy="83" r="11" fill="none" stroke="#3A3228" strokeWidth="2.4" />
            <circle cx="80" cy="83" r="11" fill="none" stroke="#3A3228" strokeWidth="2.4" />
            <path d="M61 83 H69" stroke="#3A3228" strokeWidth="2.4" />
          </g>
        )}
        {glasses === 'sunglasses' && (
          <g>
            <rect x="39" y="74" width="22" height="17" rx="8.5" fill="#2E3A28" />
            <rect x="69" y="74" width="22" height="17" rx="8.5" fill="#2E3A28" />
            <path d="M61 82 H69" stroke="#2E3A28" strokeWidth="2.4" />
          </g>
        )}
        <path d="M59 100 Q65 105 71 100" stroke="#3A3228" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {hat === 'none' && (
          <>
            <path d="M65 40 C65 30 65 24 65 19" stroke="#5E8050" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M65 26 C56 22 51 14 53 7 C62 8 68 16 65 26 Z" fill="#A6CC86" />
          </>
        )}
        {hat === 'red' && <path d="M40 44 Q65 10 90 44 Z" fill="#D97B6C" />}
        {hat === 'straw' && (
          <g>
            <path d="M48 46 Q65 18 82 46 Z" fill="#F0D9A0" />
            <ellipse cx="65" cy="46" rx="34" ry="7" fill="#E8C98A" stroke="#C9A97A" strokeWidth="1.5" />
          </g>
        )}
        {hat === 'beanie' && (
          <g>
            <path d="M42 46 Q65 12 88 46 Z" fill="#89A6BE" />
            <rect x="40" y="41" width="50" height="10" rx="5" fill="#6F8CA3" />
            <circle cx="65" cy="12" r="4.5" fill="#F6F0E4" />
          </g>
        )}
      </g>
    </motion.svg>
  );
}
