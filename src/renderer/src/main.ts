import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { createPinia } from 'pinia'

const app = createApp(App)
app.use(router)
app.use(createPinia())

const token = localStorage.getItem('token')

router.beforeEach(async (to, _from, next) => {
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

if (token) {
  setInterval(
    async () => {
      const { refreshToken, mcToken } = await window.electron.ipcRenderer.invoke(
        'refresh-token',
        token
      )

      console.log('RefreshToken: ', refreshToken)
      console.log('MCToken Data: ', JSON.parse(mcToken))
      localStorage.setItem('token', refreshToken)
      localStorage.setItem('mcToken', mcToken)
    },
    1000 * 60 * 30
  )
}

app.mount('#app')
