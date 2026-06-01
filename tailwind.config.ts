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
        // Тёплая lo-fi / «бумажная» палитра
        page:     '#efe8dd',
        card:     '#ffffff',
        subtle:   '#f7f4ef',
        hover:    '#f0ece4',
        elevated: '#ffffff',
        accent: {
          DEFAULT: '#c4784a',
          hover:   '#b06838',
          active:  '#9a5a2e',
          light:   'rgba(196,120,74,0.12)',
        },
        border: {
          DEFAULT: 'rgba(90,70,40,0.10)',
          strong:  'rgba(90,70,40,0.20)',
          accent:  '#c4784a',
        },
        ink: {
          primary:   '#2a2018',
          secondary: '#7a6a55',
          muted:     '#b0a090',
        },
        clay:  '#c4784a',
        teal:  '#4a8a78',
        sand:  '#e8c4a0',
        status: {
          online: '#4a8a78',
          idle:   '#c4784a',
          dnd:    '#c4555a',
          offline:'#b0a090',
        },
      },
      fontFamily: {
        sans: ['Space Mono', 'Roboto Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        mono: ['Space Mono', 'Roboto Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sm:   '0 1px 2px rgba(90,70,40,0.08)',
        md:   '0 4px 14px rgba(90,70,40,0.10), 0 2px 4px rgba(90,70,40,0.06)',
        lg:   '0 24px 60px rgba(90,70,40,0.16), 0 6px 16px rgba(90,70,40,0.08)',
        glow: '0 0 22px rgba(196,120,74,0.30)',
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
