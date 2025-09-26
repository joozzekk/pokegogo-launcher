import { createRouter, createWebHashHistory } from 'vue-router'

import LoginPage from '@renderer/components/LoginPage.vue'
import Launcher from '@renderer/components/Launcher.vue'
import HomePage from '@renderer/components/HomePage.vue'
import ChangelogPage from '@renderer/components/ChangelogPage.vue'
import SettingsPage from '@renderer/components/SettingsPage.vue'
import ShopPage from '@renderer/components/ShopPage.vue'
import LoadingPage from '@renderer/components/LoadingPage.vue'

const routes = [
  { path: '/', component: LoginPage },
  { path: '/loading', component: LoadingPage },
  {
    path: '/app',
    component: Launcher,
    name: 'app',
    children: [
      { path: 'home', name: 'home', component: HomePage },
      { path: 'shop', name: 'shop', component: ShopPage },
      { path: 'settings', name: 'settings', component: SettingsPage },
      { path: 'changelog', name: 'changelog', component: ChangelogPage }
    ]
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
