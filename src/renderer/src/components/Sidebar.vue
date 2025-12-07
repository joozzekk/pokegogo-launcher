<script setup lang="ts">
import { LOGGER } from '@renderer/services/logger-service'
import useGeneralStore from '@renderer/stores/general-store'
import useUserStore from '@renderer/stores/user-store'
import { extractHead } from '@renderer/utils'
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

const handleSupDev = (): void => {
  window.open('https://tipply.pl/@joozzekk', '_blank')
}

const fallbackHeadUrl = computed(() => `https://mineskin.eu/helm/${playerName.value}/100.png`)

async function loadCustomOrFallbackHead(): Promise<void> {
  const currentName = playerName.value
  const customSkinSource = `${apiURL}/skins/image/${currentName}`

  try {
    LOGGER.log(`Próbuję wyciąć głowę z niestandardowego API dla gracza: ${currentName}`)

    const base64Head = await extractHead(customSkinSource, 100)
    skinHeadUrl.value = base64Head
  } catch (error) {
    LOGGER.err(
      'Błąd cięcia/ładowania skina z API. Używam fallbacku Minotar.',
      (error as Error)?.message
    )

    skinHeadUrl.value = fallbackHeadUrl.value
  }
}

watch(
  playerName,
  (newPlayerName, oldPlayerName) => {
    LOGGER.log(
      `Zauważono zmianę nazwy gracza z "${oldPlayerName}" na "${newPlayerName}". Ładuję skina...`
    )

    loadCustomOrFallbackHead()
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
        <div class="player-avatar">
          <img
            id="playerSkin"
            :src="skinHeadUrl"
            class="player-skin"
            alt="Player Skin"
            @dragstart.prevent="null"
          />
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
      <button id="support" class="nav-item hover:cursor-pointer select-none" @click="handleSupDev">
        <i class="nav-icon fa fa-coffee" />
        <label for="support" class="hover:cursor-pointer text-[0.5rem] mt-[0.3rem]"
          >Kup kawusie 🥰</label
        >
      </button>
      <button id="logout" class="nav-item hover:cursor-pointer select-none" @click="handleLogout">
        <i class="nav-icon fa-solid fa-door-open"></i>
        <label for="logout" class="hover:cursor-pointer text-[0.5rem] mt-[0.3rem]"
          >Wyloguj się</label
        >
      </button>
    </div>
  </aside>
</template>
