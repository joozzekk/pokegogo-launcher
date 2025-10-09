<script setup lang="ts">
import useUserStore from '@renderer/stores/user-store'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()
const playerName = computed(() => userStore.user?.nickname ?? 'Guest')

const handleChangeRoute = (newRoute: string): void => {
  router.push(newRoute)
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
            <span class="player-label">Gracz</span>
            <span id="playerName" class="player-name">
              {{ playerName }}
            </span>
          </div>
        </div>
        <button class="player-logout" @click="userStore.logout">
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
