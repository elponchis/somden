import { motion } from 'framer-motion';

export type MascotConfig = {
  bodyHi?: string;
  bodyMid?: string;
  bodyLo?: string; // gradient 3톤
  footColor?: string;
  brows?: boolean;
  hat?: boolean;
  cheek?: boolean;
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
    hat = false,
    cheek = true,
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
        <path d="M59 100 Q65 105 71 100" stroke="#3A3228" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M65 40 C65 30 65 24 65 19" stroke="#5E8050" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M65 26 C56 22 51 14 53 7 C62 8 68 16 65 26 Z" fill="#A6CC86" />
        {hat && <path d="M40 44 Q65 10 90 44 Z" fill="#D97B6C" />}
      </g>
    </motion.svg>
  );
}
