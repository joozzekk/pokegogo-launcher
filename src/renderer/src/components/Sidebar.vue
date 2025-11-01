<script setup lang="ts">
import useGeneralStore from '@renderer/stores/general-store'
import useUserStore from '@renderer/stores/user-store'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const generalStore = useGeneralStore()
const router = useRouter()
const playerName = computed(() => userStore.user?.nickname ?? 'Guest')

const handleLogout = async (): Promise<void> => {
  await userStore.logout()
  if (generalStore.currentState === 'minecraft-started') {
    await window.electron?.ipcRenderer?.invoke('launch:exit')
  }
}

const userRole = computed(() => {
  return userStore.user?.role ?? 'Gracz'
})

const handleChangeRoute = (newRoute: string): void => {
  router.push(newRoute)
}

const handleSupDev = (): void => {
  window.open('https://tipply.pl/@joozzekk', '_blank')
}

const collapseSidebar = (): void => {
  generalStore.settings.isSidebarCollapsed = !generalStore.settings.isSidebarCollapsed
  generalStore.saveSettings()
}
</script>

<template>
  <aside class="sidebar my-2" :class="{ collapsed: generalStore.settings.isSidebarCollapsed }">
    <div class="player-profile mx-3">
      <div class="player-fullinfo">
        <div class="player-avatar">
          <img
            id="playerSkin"
            :src="`https://mineskin.eu/helm/${playerName}/100.png`"
            class="player-skin"
            alt="Player Skin"
            @dragstart.prevent="null"
          />
          <div class="status-dot"></div>
        </div>
        <div class="player-info">
          <span class="player-name">
            {{ playerName }}
          </span>
          <span class="player-label">{{ userRole }}</span>
        </div>
      </div>
    </div>

    <div
      class="flex flex-col mb-auto mx-3"
      :class="{ 'mx-4': !generalStore.settings.isSidebarCollapsed }"
    >
      <button
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
      </button>
      <button
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
      </button>
      <button
        class="nav-item"
        :class="{
          active: $route.path === '/app/changelog'
        }"
        @click="handleChangeRoute('/app/changelog')"
      >
        <div class="nav-icon">
          <i class="fa-solid fa-calendar-days"></i>
        </div>
        <span>Changelog</span>
        <div class="nav-indicator"></div>
      </button>
      <button
        class="nav-item"
        :class="{
          active: $route.path === '/app/settings'
        }"
        @click="handleChangeRoute('/app/settings')"
      >
        <div class="nav-icon">
          <i class="fas fa-cog"></i>
        </div>
        <span>Ustawienia</span>
        <div class="nav-indicator"></div>
      </button>
    </div>

    <div class="flex flex-col mx-2" :class="{ 'mx-4': !generalStore.settings.isSidebarCollapsed }">
      <button class="nav-item hover:cursor-pointer select-none" @click="collapseSidebar">
        <i
          class="nav-icon fa-solid"
          :class="generalStore.settings.isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'"
        ></i>
        <label for="collapse" class="hover:cursor-pointer">
          {{ generalStore.settings.isSidebarCollapsed ? 'Rozwiń panel' : 'Zwiń panel' }}
        </label>
      </button>
      <button id="support" class="nav-item hover:cursor-pointer select-none" @click="handleSupDev">
        <i class="nav-icon fa fa-coffee" />
        <label for="support" class="hover:cursor-pointer">Kup kawusie 🥰</label>
      </button>
      <button id="logout" class="nav-item hover:cursor-pointer select-none" @click="handleLogout">
        <i class="nav-icon fa-solid fa-door-open"></i>
        <label for="logout" class="hover:cursor-pointer">Wyloguj się</label>
      </button>
    </div>
  </aside>
</template>
