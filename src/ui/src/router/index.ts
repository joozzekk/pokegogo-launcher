import { createRouter, createWebHashHistory } from 'vue-router'

import Launcher from '@ui/components/Launcher.vue'
import HomePage from '@ui/pages/Home.vue'
import LoginPage from '@ui/pages/Login.vue'
import ChangelogPage from '@ui/pages/Changelog.vue'
import SettingsPage from '@ui/pages/Settings.vue'
import ShopPage from '@ui/pages/Shop.vue'
import LoadingPage from '@ui/pages/Loading.vue'
import UsersPage from '@ui/pages/Users.vue'
import FTPPage from '@ui/pages/FTP.vue'
import ItemsPage from '@ui/pages/Items.vue'
import EventsPage from '@ui/pages/Events.vue'

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
