import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'

export const MainPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: 'var(--primary)',
      100: 'var(--primary)',
      200: 'var(--primary)',
      300: 'var(--primary)',
      400: 'var(--primary)',
      500: 'var(--primary)',
      600: 'var(--primary)',
      700: 'var(--primary)',
      800: 'var(--primary)',
      900: 'var(--primary)',
      950: 'var(--primary)'
    },
    colorScheme: {
      light: {
        surface: {
          0: 'var(--bg-card)',
          50: 'var(--bg-light)',
          100: 'var(--bg-light)',
          200: 'var(--border)',
          300: 'var(--border)',
          400: 'var(--text-muted)',
          500: 'var(--text-secondary)',
          600: 'var(--text-secondary)',
          700: 'var(--text-primary)',
          800: 'var(--text-primary)',
          900: 'var(--text-primary)',
          950: 'var(--text-primary)'
        }
      },
      dark: {
        surface: {
          0: 'var(--bg-card)',
          50: 'var(--bg-light)',
          100: 'var(--bg-light)',
          200: 'var(--border)',
          300: 'var(--border)',
          400: 'var(--text-muted)',
          500: 'var(--text-secondary)',
          600: 'var(--text-secondary)',
          700: 'var(--text-primary)',
          800: 'var(--text-primary)',
          900: 'var(--text-primary)',
          950: 'var(--text-primary)'
        }
      }
    }
  }
})
