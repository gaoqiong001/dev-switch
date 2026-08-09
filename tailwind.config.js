/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
          darker: '#1d4ed8',
        },
        danger: {
          DEFAULT: '#ef4444',
          dark: '#dc2626',
          darker: '#b91c1c',
        },
        success: {
          DEFAULT: '#22c55e',
          dark: '#16a34a',
        },
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        card: 'var(--card)',
        'card-fg': 'var(--card-fg)',
        muted: 'var(--muted)',
        'muted-fg': 'var(--muted-fg)',
        accent: 'var(--accent)',
        'accent-fg': 'var(--accent-fg)',
        border: 'var(--border)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', 'monospace'],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
      spacing: {
        sidebar: '260px',
      },
    },
  },
  plugins: [],
}
