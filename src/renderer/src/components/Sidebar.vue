<script setup lang="ts">
import { onMounted, ref } from 'vue'

const playerName = ref<string>('guest')

onMounted(() => {
  const dataStr = localStorage.getItem('token')
  if (dataStr) {
    const data = JSON.parse(JSON.parse(dataStr))
    const profile = data?.profile
    playerName.value = profile?.name
  }
})
</script>

<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <div class="player-profile">
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

      <a href="#" class="nav-item active" data-page="home">
        <div class="nav-icon">
          <i class="fas fa-home"></i>
        </div>
        <span>Home</span>
        <div class="nav-indicator"></div>
      </a>
      <a href="#" class="nav-item" data-page="shop">
        <div class="nav-icon">
          <i class="fas fa-shopping-cart"></i>
        </div>
        <span>Sklep</span>
        <div class="nav-indicator"></div>
      </a>
      <a href="#" class="nav-item" data-page="settings">
        <div class="nav-icon">
          <i class="fas fa-cog"></i>
        </div>
        <span>Ustawienia</span>
        <div class="nav-indicator"></div>
      </a>
      <a href="#" class="nav-item" data-page="changelog">
        <div class="nav-icon">
          <i class="fas fa-list"></i>
        </div>
        <span>Changelog</span>
        <div class="nav-indicator"></div>
      </a>
    </nav>

    <div class="sidebar-footer">
      <div class="server-mini-status">
        <div class="pulse-dot"></div>
        <span>Server Online</span>
      </div>
    </div>
  </aside>
</template>
