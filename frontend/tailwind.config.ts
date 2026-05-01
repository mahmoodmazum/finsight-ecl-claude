import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#136fff',
          light: '#1faeff',
          lighter: '#97e5ff',
          dark: '#0d5acc',
        },
        stage1: '#2DB87A',
        stage2: '#F4A623',
        stage3: '#E84F4F',
        teal: '#16B9B9',
        'app-bg': '#F0F4FA',
        'app-border': '#E2E8F4',
        'sidebar-bg': '#0a1628',
        'sidebar-hover': '#1a2d4a',
        'sidebar-active': '#1a3a6b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
