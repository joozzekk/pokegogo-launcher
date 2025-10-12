import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { createPinia } from 'pinia'

const app = createApp(App)
app.use(router)
app.use(createPinia())

router.beforeEach(async (to, _from, next) => {
  const token = localStorage.getItem('msToken') ?? localStorage.getItem('token')

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
