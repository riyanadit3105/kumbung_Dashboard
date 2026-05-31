/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Mono', 'monospace'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        'mushroom': {
          50: '#f0f9f4',
          100: '#dcf1e6',
          500: '#2d8c5e',
          600: '#1f6b47',
          700: '#155233',
          900: '#0a2b1a',
        },
        'panel': '#0d1117',
        'surface': '#161b22',
        'border': '#30363d',
        'accent': '#3fb950',
        'warn': '#d29922',
        'danger': '#f85149',
        'info': '#58a6ff',
        'muted': '#8b949e',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
