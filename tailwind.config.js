/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'blue-royal': '#2346C8',
        'blue-deep': '#12206B',
        'blue-sky': '#BFD4F2',
        cream: '#FBF6EA',
        white: '#FFFFFF',
        sun: '#F8D56B',
        orange: '#F89C3D',
        'green-ok': '#2E9E6B',
        'red-soft': '#D9534F'
      },
      fontFamily: {
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif']
      },
      borderRadius: {
        card: '24px',
        'card-lg': '28px',
        pill: '9999px'
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        12: '48px',
        16: '64px'
      },
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.4' }], // Mínimo absoluto 14px (escala com rem)
        sm: ['0.9375rem', { lineHeight: '1.45' }], // 15px
        base: ['1rem', { lineHeight: '1.5' }], // 16px
        lg: ['1.125rem', { lineHeight: '1.45' }], // 18px
        xl: ['1.25rem', { lineHeight: '1.35' }], // 20px
        '2xl': ['1.5rem', { lineHeight: '1.3' }], // 24px
        '3xl': ['1.875rem', { lineHeight: '1.2' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '1.15' }], // 36px
        '5xl': ['2.75rem', { lineHeight: '1.1' }] // 44px
      },
      boxShadow: {
        soft: '0 8px 24px -4px rgba(18, 32, 107, 0.08)',
        card: '0 4px 16px -2px rgba(18, 32, 107, 0.06)'
      }
    }
  },
  plugins: []
};
