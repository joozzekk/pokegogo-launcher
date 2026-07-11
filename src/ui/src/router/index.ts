import { createRouter, createWebHashHistory } from 'vue-router'

import Launcher from '@ui/components/core/Launcher.vue'
import HomePage from '@ui/pages/Home.vue'
import LoginPage from '@ui/pages/Login.vue'
import ChangelogPage from '@ui/pages/Changelog.vue'
import SettingsPage from '@ui/pages/Settings.vue'
import NewsPage from '@ui/pages/News.vue'
import ShopPage from '@ui/pages/Shop.vue'
import LoadingPage from '@ui/pages/Loading.vue'
import UsersPage from '@ui/pages/Users.vue'
import FTPPage from '@ui/pages/FTP.vue'
import ItemsPage from '@ui/pages/Items.vue'
import EventsPage from '@ui/pages/Events.vue'
import GameControlPage from '@ui/pages/GameControl.vue'

const routes = [
  { path: '/', component: LoginPage },
  { path: '/loading', component: LoadingPage },
  {
    path: '/app',
    component: Launcher,
    name: 'app',
    children: [
      {
        path: 'home',
        name: 'home',
        component: HomePage,
        meta: {
          displayName: 'router.home'
        }
      },
      {
        path: 'news',
        name: 'news',
        component: NewsPage,
        meta: {
          displayName: 'router.news'
        }
      },
      {
        path: 'shop',
        name: 'shop',
        component: ShopPage,
        meta: {
          displayName: 'router.shop'
        }
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsPage,
        meta: {
          displayName: 'router.settings'
        }
      },
      {
        path: 'changelog',
        name: 'changelog',
        component: ChangelogPage,
        meta: {
          displayName: 'router.changelog'
        }
      },
      {
        path: 'users',
        name: 'users',
        component: UsersPage,
        meta: {
          displayName: 'router.users'
        }
      },
      {
        path: 'ftp',
        name: 'ftp',
        component: FTPPage,
        meta: {
          displayName: 'router.ftp'
        }
      },
      {
        path: 'items',
        name: 'items',
        component: ItemsPage,
        meta: {
          displayName: 'router.items'
        }
      },
      {
        path: 'events',
        name: 'events',
        component: EventsPage,
        meta: {
          displayName: 'router.events'
        }
      },
      {
        path: 'game-control',
        name: 'gameControl',
        component: GameControlPage,
        meta: {
          displayName: 'router.gameControl'
        }
      }
    ]
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
