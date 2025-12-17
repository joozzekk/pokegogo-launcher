import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { MainPreset } from './assets/theme/preset'

const app = createApp(App)

app.use(router)
app.use(createPinia())
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

app.mount('#app')
