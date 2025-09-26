import { createApp } from 'vue'
import { router } from './router'
import { createPinia } from 'pinia'
import LoadingPage from './components/LoadingPage.vue'

const app = createApp(LoadingPage)
app.use(router)
app.use(createPinia())

const token = localStorage.getItem('token')

router.beforeEach(async (to, from, next) => {
  if (to.path.includes('/loading') && !from.path.includes('/loading')) {
    next()
    return
  }

  if (token) {
    if (!to.path.includes('/app')) {
      next('/app/home')
    } else {
      next()
    }
  } else {
    next()
  }
})

app.mount('#loading')
