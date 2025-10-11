import { createRouter, createWebHashHistory } from 'vue-router'

import Launcher from '@renderer/components/Launcher.vue'
import HomePage from '@renderer/pages/Home.vue'
import LoginPage from '@renderer/pages/Login.vue'
import ChangelogPage from '@renderer/pages/Changelog.vue'
import SettingsPage from '@renderer/pages/Settings.vue'
import ShopPage from '@renderer/pages/Shop.vue'
import LoadingPage from '@renderer/pages/Loading.vue'
import UsersPage from '@renderer/pages/Users.vue'

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
      { path: 'changelog', name: 'changelog', component: ChangelogPage },
      {
        path: 'users',
        name: 'users',
        component: UsersPage
      }
    ]
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
