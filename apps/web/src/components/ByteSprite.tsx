import { motion } from 'framer-motion';

export type ByteState = 'idle' | 'thinking' | 'happy' | 'confused' | 'sleep';

interface Props {
  state: ByteState;
  size?: number;
}

/**
 * CSS/SVG sprite placeholder. Swap to Lottie in Phase 6 once the designer
 * ships byte-{idle,thinking,happy,confused,sleep}.json.
 */
export function ByteSprite({ state, size = 72 }: Props) {
  const eyeColors: Record<ByteState, string> = {
    idle: '#00E5FF',
    thinking: '#F9F871',
    happy: '#4ade80',
    confused: '#FF2BD6',
    sleep: '#5eead4',
  };
  return (
    <motion.div
      aria-hidden="true"
      className="relative"
      style={{ width: size, height: size }}
      animate={
        state === 'sleep'
          ? { y: 0 }
          : state === 'thinking'
            ? { y: [0, -2, 0] }
            : { y: [0, -4, 0] }
      }
      transition={{
        duration: state === 'thinking' ? 0.8 : state === 'sleep' ? 3 : 3.2,
        repeat: state === 'sleep' ? 0 : Infinity,
        ease: 'easeInOut',
      }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={`BYTE ${state}`}>
        <defs>
          <linearGradient id="byte-body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#F4F9FF" />
            <stop offset="1" stopColor="#B5C6D6" />
          </linearGradient>
        </defs>
        {/* Antennae */}
        <line x1="24" y1="10" x2="24" y2="4" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="24" cy="3" r="2.2" fill="#F9F871" />
        <line x1="40" y1="10" x2="40" y2="4" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="40" cy="3" r="2.2" fill="#F9F871" />
        {/* Body */}
        <rect x="10" y="10" width="44" height="40" rx="10" fill="url(#byte-body)" stroke="#0B0F2B" strokeWidth="2" />
        {/* Screen */}
        <rect x="16" y="17" width="32" height="22" rx="4" fill="#0B0F2B" />
        {/* Eyes */}
        {state === 'sleep' ? (
          <>
            <text x="22" y="32" fill={eyeColors[state]} fontFamily="monospace" fontSize="10" fontWeight="700">z</text>
            <text x="30" y="30" fill={eyeColors[state]} fontFamily="monospace" fontSize="8" fontWeight="700">z</text>
            <text x="38" y="34" fill={eyeColors[state]} fontFamily="monospace" fontSize="12" fontWeight="700">z</text>
          </>
        ) : state === 'thinking' ? (
          <>
            <circle cx="22" cy="27" r="2" fill={eyeColors[state]} />
            <circle cx="30" cy="27" r="2" fill={eyeColors[state]} />
            <circle cx="38" cy="27" r="2" fill={eyeColors[state]} />
          </>
        ) : state === 'happy' ? (
          <>
            <path d="M18 27 q3 -4 6 0" stroke={eyeColors[state]} strokeWidth="2.5" fill="none" />
            <path d="M40 27 q3 -4 6 0" stroke={eyeColors[state]} strokeWidth="2.5" fill="none" />
            <path d="M22 33 q10 6 20 0" stroke={eyeColors[state]} strokeWidth="2" fill="none" />
          </>
        ) : state === 'confused' ? (
          <>
            <circle cx="21" cy="27" r="3" fill={eyeColors[state]} />
            <circle cx="43" cy="27" r="3" fill={eyeColors[state]} />
            <path d="M24 34 q8 2 16 -2" stroke={eyeColors[state]} strokeWidth="2" fill="none" />
          </>
        ) : (
          <>
            <circle cx="23" cy="27" r="3" fill={eyeColors[state]} />
            <circle cx="41" cy="27" r="3" fill={eyeColors[state]} />
            <path d="M24 34 q8 4 16 0" stroke={eyeColors[state]} strokeWidth="2" fill="none" />
          </>
        )}
        {/* Thrusters */}
        <rect x="18" y="50" width="8" height="4" rx="2" fill="#64748b" />
        <rect x="38" y="50" width="8" height="4" rx="2" fill="#64748b" />
        <ellipse cx="22" cy="58" rx="6" ry="2" fill="#00E5FF" opacity="0.4" />
        <ellipse cx="42" cy="58" rx="6" ry="2" fill="#00E5FF" opacity="0.4" />
      </svg>
    </motion.div>
  );
}
