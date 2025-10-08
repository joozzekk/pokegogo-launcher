<script setup lang="ts">
import { fetchProfile } from '@renderer/api/endpoints'
import useUserStore from '@renderer/stores/user-store'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const playerName = ref<string>('guest')
const accountType = localStorage.getItem('LOGIN_TYPE')
const userStore = useUserStore()

const handleLogout = async (): Promise<void> => {
  localStorage.removeItem('LOGIN_TYPE')
  localStorage.removeItem('token')
  switch (accountType) {
    case 'backend':
      localStorage.removeItem('refresh_token')
      break
    case 'microsoft':
      localStorage.removeItem('mcToken')
      break
    default:
  }

  router.push('/')
}

const handleChangeRoute = (newRoute: string): void => {
  router.push(newRoute)
}

const fetchProfileData = async (): Promise<void> => {
  if (!userStore.user?.uuid) {
    const profile = await fetchProfile()

    userStore.setUser(profile)
    console.log(new Date(profile.exp * 1000))
  }

  playerName.value = userStore.user?.nickname ?? 'guest'
}

const loadProfile = async (): Promise<void> => {
  const json = localStorage.getItem('mcToken')

  switch (accountType) {
    case 'backend':
      await fetchProfileData()
      break
    case 'microsoft':
      if (json) {
        const data = JSON.parse(json)
        const profile = data?.profile
        playerName.value = profile?.name
      }
      break
  }
}

onMounted(async () => {
  await loadProfile()
})
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
            <span class="player-label">Gracz</span>
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
        href="#"
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
        href="#"
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
        href="#"
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
      <div class="server-mini-status">
        <div class="pulse-dot"></div>
        <span>Wesprzyj developera 🥰</span>
      </div>
    </div>
  </aside>
</template>
