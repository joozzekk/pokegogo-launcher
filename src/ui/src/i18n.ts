import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import pl from './locales/pl.json'

const savedSettings = localStorage.getItem('launcherSettings')
const defaultLocale = savedSettings ? JSON.parse(savedSettings).language || 'pl' : 'pl'

const i18n = createI18n({
  legacy: false, // use Composition API
  locale: defaultLocale, // set locale
  fallbackLocale: 'en', // set fallback locale
  messages: {
    en,
    pl
  }
})

export default i18n
