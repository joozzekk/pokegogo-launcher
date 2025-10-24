<script lang="ts" setup>
import logo from '@renderer/assets/logo.png'
import { LOGGER } from '@renderer/services/logger-service'
import useGeneralStore from '@renderer/stores/general-store'
import { checkUpdate, showToast } from '@renderer/utils'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import UpdateConfirm from './modals/UpdateConfirm.vue'
import { useRouter } from 'vue-router'
import useUserStore from '@renderer/stores/user-store'

const userStore = useUserStore()
const generalStore = useGeneralStore()
const router = useRouter()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateInterval = ref<any>()
const isInstallingUpdate = ref<boolean>(false)

const hasMod = computed(() =>
  ['admin', 'technik', 'mod'].includes(userStore.user?.role || 'default')
)
const hasTech = computed(() => ['technik'].includes(userStore.user?.role || 'default'))
const hasAdmin = computed(() => ['admin', 'technik'].includes(userStore.user?.role || 'default'))

const handleChangeRoute = (newRoute: string): void => {
  router.push(newRoute)
}

const maximizeWindow = (): void => {
  window.electron?.ipcRenderer?.send('window:maximize', generalStore.settings.resolution)
}

const minimizeWindow = (): void => {
  window.electron?.ipcRenderer?.send('window:minimize')
}

const closeWindow = (): void => {
  window.electron?.ipcRenderer?.send('window:close', generalStore.settings.hideToTray)
  if (generalStore.currentState === 'minecraft-started' && !generalStore.settings.hideToTray) {
    window.electron?.ipcRenderer?.invoke('launch:exit')
  }
}

const isUpdateAvailable = computed(() => {
  return generalStore.isUpdateAvailable
})

const handleInstallUpdate = async (): Promise<void> => {
  isInstallingUpdate.value = true
  try {
    try {
      await window.electron?.ipcRenderer?.invoke('launch:exit')
    } finally {
      await window.electron?.ipcRenderer?.invoke('update:start')
    }
  } catch (err) {
    showToast('Wystąpił błąd podczas aktualizacji. Spróbuj ponownie później.', 'error')
    LOGGER.log(err as string)
  } finally {
    isInstallingUpdate.value = false
  }
}

const confirmModalRef = ref()

const openConfirmModal = (): void => {
  confirmModalRef.value?.openModal()
}

onMounted(async () => {
  await checkUpdate()

  updateInterval.value = setInterval(checkUpdate, 1000 * 60)
})

onUnmounted(() => {
  clearInterval(updateInterval.value)
})
</script>

<template>
  <header class="header">
    <div class="applogo">
      <div class="applogo-icon">
        <img :src="logo" width="100%" @dragstart.prevent="null" />
      </div>
      <h1>PokeGoGo</h1>
    </div>
    <div v-if="$route.path.includes('/app')" class="breadcrumbs flex items-center gap-2">
      <button class="nav-icon" @click="$router.push('/app/home')">
        <i class="fa fa-home" />
      </button>
      <button
        v-if="hasMod"
        class="nav-icon"
        :class="{ active: $route.path === '/app/users' }"
        @click="handleChangeRoute('/app/users')"
      >
        <i class="fa fa-users"></i>
      </button>
      <button
        v-if="hasAdmin"
        class="nav-icon"
        :class="{ active: $route.path === '/app/events' }"
        @click="handleChangeRoute('/app/events')"
      >
        <i class="fa fa-calendar-week"></i>
      </button>
      <button
        v-if="hasTech"
        class="nav-icon"
        :class="{ active: $route.path === '/app/items' }"
        @click="handleChangeRoute('/app/items')"
      >
        <i class="fa fa-list"></i>
      </button>
      <button
        v-if="hasTech"
        class="nav-icon"
        :class="{ active: $route.path === '/app/ftp' }"
        @click="handleChangeRoute('/app/ftp')"
      >
        <i class="fa fa-folder"></i>
      </button>
      <div>></div>
      <div class="active">
        {{ $route.meta.displayName }}
      </div>
    </div>

    <div class="flex ml-auto mr-[9rem] items-center gap-2">
      <div class="applogo-badge">{{ generalStore.settings.updateChannel }}</div>

      <button
        v-if="isUpdateAvailable"
        class="nav-icon"
        @click="
          generalStore.currentState === 'minecraft-started'
            ? openConfirmModal()
            : handleInstallUpdate()
        "
      >
        <i v-if="isInstallingUpdate" class="fas fa-spinner fa-spin"></i>
        <i v-else class="fas fa-download"></i>
      </button>
    </div>
    <div class="buttons">
      <button @click="minimizeWindow">
        <i class="fa-solid fa-window-minimize"></i>
      </button>
      <button @click="maximizeWindow">
        <i class="fa-solid fa-window-maximize" />
      </button>
      <button class="red" @click="closeWindow">
        <i class="fa-solid fa-xmark fa-xl"></i>
      </button>
    </div>

    <UpdateConfirm ref="confirmModalRef" @accept="handleInstallUpdate" />
  </header>
</template>

<style scoped>
.nav-icon {
  border: none;
  -webkit-app-region: no-drag;
  transition: background 0.1s ease-in-out;
}

.nav-icon.active {
  background: var(--nav-item-active);
  color: var(--primary);
}

.buttons {
  position: absolute;
  right: 0;
  top: 0;
  display: flex;
  height: 100%;
}

.buttons button {
  background: transparent;
  border: none;
  color: white;
  width: 50px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  -webkit-app-region: no-drag;
  transition: background 0.1s ease-in-out;
}

.buttons button > i {
  height: 100%;
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.buttons button:hover,
.buttons button:focus {
  background: var(--btn-hover);
}

.buttons button.red:hover,
.buttons button.red:focus {
  background: rgba(197, 34, 48, 0.4) !important;
}

.breadcrumbs {
  color: var(--breadcrumbs-text);
  margin-left: 0.5rem;
  user-select: none;
  -webkit-app-region: no-drag;
  text-transform: capitalize;
}

.breadcrumbs > i:hover {
  cursor: pointer;
  color: var(--primary);
}

.breadcrumbs > .active:hover {
  cursor: pointer;
  text-decoration: underline;
}
</style>
