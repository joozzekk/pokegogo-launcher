import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { MainPreset } from './assets/theme/preset'

import i18n from './i18n'

const app = createApp(App)

app.use(router)
app.use(createPinia())
app.use(i18n)
app.use(PrimeVue, {
  theme: {
    preset: MainPreset,
    options: {
      darkModeSelector: 'my-app-dark',
      cssLayer: false
    }
  }
})

router.beforeEach(async (to, _from, next) => {
  const token = localStorage.getItem('token')

  if (token?.length) {
    if (to.path.startsWith('/app')) {
      next()
    } else {
      next('/app/home')
    }
  } else {
    if (to.path.startsWith('/app')) {
      next('/')
    } else {
      next()
    }
  }
})

import { discordLogger } from './services/discord-service'

window.onerror = (message, source, lineno, colno, error) => {
  discordLogger.sendError('[Global] Uncaught Exception', {
    message,
    source,
    lineno,
    colno,
    error
  })
}

window.onunhandledrejection = (event) => {
  discordLogger.sendError('[Global] Unhandled Rejection', event.reason)
}

app.mount('#app')
