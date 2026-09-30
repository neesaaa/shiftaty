/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'Cairo', 'Tahoma', 'sans-serif'],
      },
      colors: {
        // Medical "doctor coat" blue palette
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdcff',
          300: '#8ec6ff',
          400: '#59a5ff',
          500: '#3182f6',
          600: '#1e63e0',
          700: '#194ec2',
          800: '#1a439d',
          900: '#1b3b7c',
          950: '#13254c',
        },
        scrub: {
          // teal accent used in scrubs
          50: '#effcfb',
          100: '#c9f5f2',
          200: '#98eae6',
          300: '#5dd7d4',
          400: '#2fbdbc',
          500: '#159fa0',
          600: '#0f7f83',
          700: '#116569',
          800: '#135156',
          900: '#134349',
        },
      },
      boxShadow: {
        card: '0 4px 20px -4px rgba(27, 59, 124, 0.12)',
        soft: '0 2px 12px -2px rgba(27, 59, 124, 0.08)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pop': { '0%': { transform: 'scale(0.96)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out',
        'pop': 'pop 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
