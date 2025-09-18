import { createRouter, createMemoryHistory } from 'vue-router'

import LoginPage from '@renderer/components/LoginPage.vue'
import Launcher from '@renderer/components/Launcher.vue'

const routes = [
  { path: '/', component: LoginPage },
  { path: '/app', component: Launcher }
]

export const router = createRouter({
  history: createMemoryHistory(),
  routes
})
