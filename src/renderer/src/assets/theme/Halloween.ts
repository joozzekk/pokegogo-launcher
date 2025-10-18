import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'

export const HalloweenPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{amber.50}',
      100: '{amber.100}',
      200: '{amber.200}',
      300: '{amber.300}',
      400: '{amber.400}',
      500: '{amber.500}',
      600: '{amber.600}',
      700: '{amber.700}',
      800: '{amber.800}',
      900: '{amber.900}',
      950: '{amber.950}'
    },
    colorScheme: {
      light: {
        surface: {
          0: '#25241a',
          50: '#25241a',
          100: '#b8ad94',
          200: '#b8ad94',
          300: '#b8ad94',
          400: '#b8ad94',
          500: '#b8ad94',
          600: '#b8ad94',
          700: '#b8ad94',
          800: '#25241a',
          900: '#25241a',
          950: '#25241a'
        },
        semantic: {
          highlight: {
            background: '{primary.50}',
            color: '{primary.700}'
          }
        }
      },
      dark: {
        surface: {
          0: '#25241a'
        }
      }
    }
  }
})
