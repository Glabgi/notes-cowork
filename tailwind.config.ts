import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Тёмно-синяя (navy) палитра
        page:     '#0a0f1e',
        card:     '#141d33',
        subtle:   '#0f1729',
        hover:    '#1c2942',
        elevated: '#1a2540',
        accent: {
          DEFAULT: '#5b8cff',
          hover:   '#4d7cf0',
          active:  '#3d68dd',
          light:   'rgba(91,140,255,0.15)',
        },
        border: {
          DEFAULT: 'rgba(120,150,210,0.12)',
          strong:  'rgba(120,150,210,0.24)',
          accent:  '#5b8cff',
        },
        ink: {
          primary:   '#e7ecf7',
          secondary: '#9fb0d0',
          muted:     '#647396',
        },
        clay:  '#5b8cff',
        teal:  '#4cc2a8',
        sand:  '#26375e',
        status: {
          online: '#4cc2a8',
          idle:   '#5b8cff',
          dnd:    '#f0676f',
          offline:'#647396',
        },
      },
      fontFamily: {
        sans: ['Space Mono', 'Roboto Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        mono: ['Space Mono', 'Roboto Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sm:   '0 1px 2px rgba(0,0,0,0.40)',
        md:   '0 4px 14px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.30)',
        lg:   '0 24px 60px rgba(0,0,0,0.55), 0 6px 16px rgba(0,0,0,0.35)',
        glow: '0 0 22px rgba(91,140,255,0.35)',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg:  '12px',
        xl:  '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
};

export default config;
