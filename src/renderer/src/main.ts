import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)
app.use(router)

router.beforeEach((to, _from, next) => {
  // TODO: add take token from electron
  const token = localStorage.getItem('token')

  if (token) {
    if (to.path !== '/app') {
      next('/app')
    } else {
      next()
    }
  } else {
    next()
  }
})

app.mount('#app')
