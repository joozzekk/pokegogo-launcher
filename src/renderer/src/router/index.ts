import { createRouter, createWebHashHistory } from 'vue-router'

import Launcher from '@renderer/components/Launcher.vue'
import HomePage from '@renderer/pages/Home.vue'
import LoginPage from '@renderer/pages/Login.vue'
import ChangelogPage from '@renderer/pages/Changelog.vue'
import SettingsPage from '@renderer/pages/Settings.vue'
import ShopPage from '@renderer/pages/Shop.vue'
import LoadingPage from '@renderer/pages/Loading.vue'
import UsersPage from '@renderer/pages/Users.vue'
import FTPPage from '@renderer/pages/FTP.vue'
import ItemsPage from '@renderer/pages/Items.vue'
import EventsPage from '@renderer/pages/Events.vue'

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
          displayName: 'Home'
        }
      },
      {
        path: 'shop',
        name: 'shop',
        component: ShopPage,
        meta: {
          displayName: 'Sklep'
        }
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsPage,
        meta: {
          displayName: 'Ustawienia'
        }
      },
      {
        path: 'changelog',
        name: 'changelog',
        component: ChangelogPage,
        meta: {
          displayName: 'Changelog'
        }
      },
      {
        path: 'users',
        name: 'users',
        component: UsersPage,
        meta: {
          displayName: 'Gracze'
        }
      },
      {
        path: 'ftp',
        name: 'ftp',
        component: FTPPage,
        meta: {
          displayName: 'FTP'
        }
      },
      {
        path: 'items',
        name: 'items',
        component: ItemsPage,
        meta: {
          displayName: 'Itemy'
        }
      },
      {
        path: 'events',
        name: 'events',
        component: EventsPage,
        meta: {
          displayName: 'Wydarzenia'
        }
      }
    ]
  }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
