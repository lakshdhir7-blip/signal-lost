import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Signal Lost palette
        cyan: {
          brand: '#00E5FF',
          glow: 'rgba(0, 229, 255, 0.4)',
        },
        magenta: {
          brand: '#FF2BD6',
          glow: 'rgba(255, 43, 214, 0.4)',
        },
        acid: {
          brand: '#F9F871',
        },
        navy: {
          brand: '#0B0F2B',
          deep: '#070A1F',
        },
        alert: {
          brand: '#FF3B3B',
        },
      },
      fontFamily: {
        display: ['"Press Start 2P"', 'monospace'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        dyslexia: ['OpenDyslexic', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-cyan': 'pulse-cyan 2s ease-in-out infinite',
        'glitch-text': 'glitch-text 3s infinite',
        'code-rain': 'code-rain 25s linear infinite',
        'bob-idle': 'bob-idle 4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-cyan': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 229, 255, 0.8)' },
        },
        'glitch-text': {
          '0%, 97%, 100%': { transform: 'translate(0)', textShadow: 'none' },
          '98%': { transform: 'translate(-2px, 0)', textShadow: '2px 0 #FF2BD6, -2px 0 #00E5FF' },
          '99%': { transform: 'translate(2px, 0)', textShadow: '-2px 0 #FF2BD6, 2px 0 #00E5FF' },
        },
        'code-rain': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'bob-idle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      backgroundImage: {
        'scanlines':
          'repeating-linear-gradient(0deg, rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
