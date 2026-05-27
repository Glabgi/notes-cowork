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
        page:   '#F0F5FF',
        card:   '#FFFFFF',
        subtle: '#EEF4FF',
        accent: {
          DEFAULT: '#2563EB',
          light:   '#DBEAFE',
          hover:   '#1D4ED8',
        },
        border: {
          DEFAULT: '#E2E8F0',
          strong:  '#CBD5E1',
          accent:  '#BFDBFE',
        },
        ink: {
          primary:   '#0F172A',
          secondary: '#475569',
          muted:     '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        md: '0 4px 16px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.04)',
        lg: '0 8px 32px rgba(15,23,42,0.10), 0 4px 12px rgba(15,23,42,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
