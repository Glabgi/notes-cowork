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
        // Linear/Vercel-style dark surfaces
        page:     '#08090A',
        subtle:   '#0B0C0E',
        card:     '#101113',
        elevated: '#151619',
        hover:    '#1A1C1F',
        accent: {
          DEFAULT: '#5B63D3',
          hover:   '#6B73E6',
          active:  '#4A52C0',
          violet:  '#8B5CF6',
          light:   'rgba(91,99,211,0.14)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong:  'rgba(255,255,255,0.145)',
          accent:  '#5B63D3',
        },
        ink: {
          primary:   '#EDEEF0',
          secondary: '#9B9FA7',
          muted:     '#62666D',
        },
        status: {
          online: '#3FB950',
          idle:   '#D29922',
          dnd:    '#F85149',
          offline:'#6E7681',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      backdropBlur: {
        glass: '16px',
        'glass-strong': '24px',
      },
      boxShadow: {
        sm:   '0 1px 2px rgba(0,0,0,0.40)',
        md:   '0 6px 20px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.30)',
        lg:   '0 20px 56px rgba(0,0,0,0.60), 0 8px 20px rgba(0,0,0,0.40)',
        glow: '0 0 0 1px rgba(91,99,211,0.30), 0 8px 30px rgba(91,99,211,0.35)',
      },
      backgroundImage: {
        'accent-grad': 'linear-gradient(135deg, #6E79E8 0%, #8B5CF6 100%)',
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
