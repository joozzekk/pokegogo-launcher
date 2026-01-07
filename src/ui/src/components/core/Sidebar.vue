<script setup lang="ts">
import { IUser } from '@ui/env'
import { LOGGER } from '@ui/services/logger-service'
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import { extractHead } from '@ui/utils'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const generalStore = useGeneralStore()
const router = useRouter()
const playerName = computed(() => userStore.user?.nickname ?? 'Guest')
const skinHeadUrl = ref<string | undefined>(undefined)

const apiURL = import.meta.env.RENDERER_VITE_API_URL

const handleLogout = async (): Promise<void> => {
  await userStore.logout()
  if (generalStore.currentState === 'minecraft-started') {
    await window.electron?.ipcRenderer?.invoke('launch:exit')
  }
}

const handleChangeRoute = (newRoute: string): void => {
  router.push(newRoute)
}

const fallbackHeadUrl = computed(() => `https://mineskin.eu/helm/${playerName.value}/100.png`)

async function loadCustomOrFallbackHead(): Promise<void> {
  const currentName = playerName.value
  const customSkinSource = `${apiURL}/skins/image/${currentName}`

  try {
    const base64Head = await extractHead(customSkinSource, 100)
    skinHeadUrl.value = base64Head

    if (userStore.user) {
      userStore.user.headUrl = base64Head
    }
    LOGGER.with('SkinAPI').success(`Custom skin is loaded for ${currentName}.`)
  } catch (error) {
    LOGGER.with('SkinAPI').err('Error during skin load.', (error as Error)?.message)

    skinHeadUrl.value = fallbackHeadUrl.value
    if (userStore.user) {
      userStore.user.headUrl = fallbackHeadUrl.value
    }
  }
}

watch(
  playerName,
  (newPlayerName, oldPlayerName) => {
    if (oldPlayerName?.length) {
      LOGGER.with('SkinAPI').log(`Nickname has changed to ${newPlayerName}. Loading skin...`)

      loadCustomOrFallbackHead()
    }
  },
  {
    immediate: true
  }
)
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: generalStore.settings.isSidebarCollapsed }">
    <div class="player-profile mx-3 my-3">
      <div class="player-fullinfo">
        <div
          class="player-avatar cursor-pointer"
          @click="
            userStore.updateSelectedProfile({ ...userStore.user, headUrl: skinHeadUrl } as IUser)
          "
        >
          <img
            v-if="skinHeadUrl"
            id="playerSkin"
            :src="skinHeadUrl"
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
          <div class="status-dot"></div>
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
