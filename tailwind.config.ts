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
        // Discord-like dark palette
        page:     '#1E1F22',
        card:     '#2B2D31',
        subtle:   '#232428',
        hover:    '#35373C',
        elevated: '#313338',
        accent: {
          DEFAULT: '#5865F2',
          hover:   '#4752C4',
          active:  '#3C45A5',
          light:   'rgba(88,101,242,0.15)',
        },
        border: {
          DEFAULT: '#3F4147',
          strong:  '#4E5058',
          accent:  '#5865F2',
        },
        ink: {
          primary:   '#F2F3F5',
          secondary: '#B5BAC1',
          muted:     '#80848E',
        },
        status: {
          online: '#23A55A',
          idle:   '#F0B232',
          dnd:    '#F23F43',
          offline:'#80848E',
        },
      },
      fontFamily: {
        sans: ['gg sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm:   '0 1px 2px rgba(0,0,0,0.30)',
        md:   '0 4px 12px rgba(0,0,0,0.40), 0 2px 4px rgba(0,0,0,0.25)',
        lg:   '0 8px 32px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35)',
        glow: '0 0 24px rgba(88,101,242,0.35)',
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
