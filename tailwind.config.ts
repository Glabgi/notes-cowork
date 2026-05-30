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
        // Light frosted-glass palette (token-backed via CSS vars)
        page:     '#EEF1FB',
        card:     'rgba(255,255,255,0.62)',
        subtle:   'rgba(255,255,255,0.45)',
        hover:    'rgba(255,255,255,0.85)',
        elevated: 'rgba(255,255,255,0.78)',
        accent: {
          DEFAULT: '#6D4BFF',
          hover:   '#5A3CE0',
          active:  '#4A30C4',
          fuchsia: '#C44BFF',
          light:   'rgba(109,75,255,0.12)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.65)',
          strong:  'rgba(120,130,170,0.30)',
          accent:  '#6D4BFF',
        },
        ink: {
          primary:   '#1B1E2B',
          secondary: '#4A5168',
          muted:     '#828AA3',
        },
        status: {
          online: '#22C55E',
          idle:   '#F59E0B',
          dnd:    '#EF4444',
          offline:'#94A0B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      backdropBlur: {
        glass: '20px',
        'glass-strong': '28px',
      },
      boxShadow: {
        sm:   '0 1px 2px rgba(40,50,90,0.06), 0 1px 3px rgba(40,50,90,0.05)',
        md:   '0 4px 16px rgba(40,50,90,0.10), 0 2px 6px rgba(40,50,90,0.06)',
        lg:   '0 16px 48px rgba(40,50,90,0.18), 0 6px 16px rgba(40,50,90,0.10)',
        glow: '0 8px 28px rgba(109,75,255,0.40)',
      },
      backgroundImage: {
        'accent-grad': 'linear-gradient(135deg, #6D4BFF 0%, #C44BFF 100%)',
      },
      borderRadius: {
        DEFAULT: '12px',
        lg:  '16px',
        xl:  '20px',
        '2xl': '28px',
      },
    },
  },
  plugins: [],
};

export default config;
