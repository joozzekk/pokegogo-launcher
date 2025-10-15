<script setup lang="ts">
import useGeneralStore from '@renderer/stores/general-store'
import useUserStore from '@renderer/stores/user-store'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const generalStore = useGeneralStore()
const router = useRouter()
const playerName = computed(() => userStore.user?.nickname ?? 'Guest')
const hasAdmin = computed(() => userStore.user?.role === 'admin')

const handleLogout = async (): Promise<void> => {
  await userStore.logout()
  if (generalStore.currentState === 'minecraft-started') {
    await window.electron?.ipcRenderer?.invoke('launch:exit')
  }
}

const userRole = computed(() => {
  switch (userStore.user?.role) {
    case 'admin':
      return 'Admin'
    default:
      return 'Gracz'
  }
})

const handleChangeRoute = (newRoute: string): void => {
  router.push(newRoute)
}

const handleSupDev = (): void => {
  window.open('https://tipply.pl/@joozzekk', '_blank')
}
</script>

<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <div class="player-profile">
        <div class="player-fullinfo">
          <div class="player-avatar">
            <img
              id="playerSkin"
              :src="`https://mineskin.eu/helm/${playerName}/100.png`"
              class="player-skin"
              alt="Player Skin"
            />
            <div class="status-dot"></div>
          </div>
          <div class="player-info">
            <span class="player-label">{{ userRole }}</span>
            <span id="playerName" class="player-name">
              {{ playerName }}
            </span>
          </div>
        </div>
        <button class="player-logout" @click="handleLogout">
          <i class="fa-solid fa-door-open"></i>
        </button>
      </div>

      <a
        class="nav-item"
        :class="{
          active: $route.path === '/app/home'
        }"
        @click="handleChangeRoute('/app/home')"
      >
        <div class="nav-icon">
          <i class="fas fa-home"></i>
        </div>
        <span>Home</span>
        <div class="nav-indicator"></div>
      </a>
      <a
        class="nav-item"
        :class="{
          active: $route.path === '/app/shop'
        }"
        @click="handleChangeRoute('/app/shop')"
      >
        <div class="nav-icon">
          <i class="fas fa-shopping-cart"></i>
        </div>
        <span>Sklep</span>
        <div class="nav-indicator"></div>
      </a>
      <a
        v-if="hasAdmin"
        class="nav-item"
        :class="{
          active: $route.path === '/app/users'
        }"
        @click="handleChangeRoute('/app/users')"
      >
        <div class="nav-icon">
          <i class="fas fa-users"></i>
        </div>
        <span>Gracze</span>
        <div class="nav-indicator"></div>
      </a>

      <a
        v-if="hasAdmin"
        class="nav-item"
        :class="{
          active: $route.path === '/app/ftp'
        }"
        @click="handleChangeRoute('/app/ftp')"
      >
        <div class="nav-icon">
          <i class="fas fa-folder"></i>
        </div>
        <span>Pliki MC</span>
        <div class="nav-indicator"></div>
      </a>
      <a
        class="nav-item"
        :class="{
          active: $route.path === '/app/settings'
        }"
        @click="handleChangeRoute('/app/settings')"
      >
        <div class="nav-icon">
          <i class="fas fa-list"></i>
        </div>
        <span>Ustawienia</span>
        <div class="nav-indicator"></div>
      </a>

      <!-- <a
        href="#"
        class="nav-item"
        :class="{
          active: $route.path === '/app/changelog'
        }"
        @click="handleChangeRoute('/app/changelog')"
      >
        <div class="nav-icon">
          <i class="fas fa-list"></i>
        </div>
        <span>Changelog</span>
        <div class="nav-indicator"></div>
      </a> -->
    </nav>

    <div class="sidebar-footer">
      <button class="btn-primary" @click="handleSupDev">
        <i class="fa fa-coffee" />
        <span>Wesprzyj developera 🥰</span>
      </button>
    </div>
  </aside>
</template>
