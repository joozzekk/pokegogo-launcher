<script setup lang="ts">
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const generalStore = useGeneralStore()
const router = useRouter()

const handleLogout = async (): Promise<void> => {
  await userStore.logout()
  if (generalStore.currentState === 'minecraft-started') {
    await window.electron?.ipcRenderer?.invoke('launch:exit')
  }
}

const isOnline = computed(() => userStore.user?.isOnline)

const handleChangeRoute = (newRoute: string): void => {
  router.push(newRoute)
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: generalStore.settings.isSidebarCollapsed }">
    <div class="player-profile mx-3 my-3">
      <div class="player-fullinfo">
        <div
          class="player-avatar cursor-pointer"
          @click="userStore.user && userStore.updateSelectedProfile(userStore.user)"
        >
          <img
            v-if="userStore.user?.headUrl"
            id="playerSkin"
            :src="userStore.user?.headUrl"
            class="player-skin"
            alt="Player Skin"
            @dragstart.prevent="null"
          />
          <div
            v-else
            id="playerSkin"
            class="player-skin flex items-center justify-center"
            alt="Player Skin"
          >
            <i class="fas fa-user"></i>
          </div>
          <div
            class="status-dot"
            :class="{
              'bg-green-400': isOnline,
              'bg-red-400': !isOnline
            }"
          ></div>
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
          <i class="fas fa-play"></i>
        </div>
        <span>Play</span>
        <div class="nav-indicator"></div>
      </button>
      <button
        class="nav-item"
        :class="{ active: $route.path === '/app/users' }"
        @click="handleChangeRoute('/app/users')"
      >
        <div class="nav-icon">
          <i class="fas fa-users"></i>
        </div>
        <span>Players</span>
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
        <span>Shop</span>
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
          <i class="fa-solid fa-rectangle-list"></i>
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
        <span>Settings</span>
        <div class="nav-indicator"></div>
      </button>
    </div>

    <div class="flex flex-col mx-2" :class="{ 'mx-4': !generalStore.settings.isSidebarCollapsed }">
      <button id="logout" class="nav-item hover:cursor-pointer select-none" @click="handleLogout">
        <i class="nav-icon fa-solid fa-door-open"></i>
        <label for="logout" class="hover:cursor-pointer text-[0.5rem] mt-[0.3rem]">Logout</label>
      </button>
    </div>
  </aside>
</template>

<style lang="scss">
.status-dot {
  position: absolute;
  bottom: 0px;
  right: -1px;
  width: 10px;
  height: 10px;
  border: 1px solid var(--bg-dark);
  border-radius: 50%;
  animation: statusPulse 2.5s infinite;
}

@keyframes statusPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 var(--text-secondary);
  }
  50% {
    box-shadow: 0 0 0 5px rgba(197, 167, 34, 0);
  }
}
</style>
