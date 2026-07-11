<script lang="ts" setup>
import { LOGGER } from '@ui/services/logger-service'
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import { UserRole } from '@ui/types/app'
import { checkUpdate, showToast } from '@ui/utils'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import UpdateConfirm from '@ui/components/modals/UpdateConfirm.vue'
import DiscordReportModal from '@ui/components/modals/DiscordReportModal.vue'
import logo from '@ui/assets/logo.png'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t, locale } = useI18n()
const router = useRouter()

const generalStore = useGeneralStore()
const userStore = useUserStore()

const isAdmin = computed(() => {
  if (!userStore.user) return false
  const role = userStore.user.role?.toLowerCase() ?? UserRole.USER
  return [UserRole.OWNER, UserRole.ADMIN, UserRole.DEV, UserRole.DEV_EN, UserRole.MODERATOR, UserRole.MOD].includes(role as UserRole)
})

const isFullAdmin = computed(() => {
  if (!userStore.user) return false
  const role = userStore.user.role?.toLowerCase() ?? UserRole.USER
  return [UserRole.OWNER, UserRole.ADMIN, UserRole.DEV, UserRole.DEV_EN].includes(role as UserRole)
})

const isTechnician = computed(() => {
  if (!userStore.user) return false
  const role = userStore.user.role?.toLowerCase()
  return (role === UserRole.DEV || role === UserRole.DEV_EN) || role === UserRole.OWNER
})

const isAdminMenuOpen = ref(false)
const toggleAdminMenu = (): void => {
  isAdminMenuOpen.value = !isAdminMenuOpen.value
  if (isAdminMenuOpen.value) isDiscordMenuOpen.value = false
}

const isDiscordMenuOpen = ref(false)
const toggleDiscordMenu = (): void => {
  isDiscordMenuOpen.value = !isDiscordMenuOpen.value
  if (isDiscordMenuOpen.value) isAdminMenuOpen.value = false
}

const linkDiscordAccount = (): void => {
  const backendUrl = import.meta.env.RENDERER_VITE_API_URL || 'https://api.pokemongogo.pl/v1'
  const uuid = userStore.user?.uuid
  if (uuid) {
    window.open(`${backendUrl}/discord/link?uuid=${uuid}`, '_blank')

    const focusHandler = async () => {
      await userStore.updateProfile()
      window.removeEventListener('focus', focusHandler)
    }
    window.addEventListener('focus', focusHandler)
  }
}

const toggleLocale = (): void => {
  const newLocale = locale.value === 'en' ? 'pl' : 'en'
  locale.value = newLocale
  generalStore.setLanguage(newLocale)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateInterval = ref<any>()
const isInstallingUpdate = ref<boolean>(false)

const discordReportModalRef = ref()
const openDiscordReportModal = (): void => {
  discordReportModalRef.value?.openModal()
}

const openDiscord = (): void => {
  window.open('discord://-/invite/pokemongogo', '_blank')
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
    await window.electron?.ipcRenderer?.invoke('launch:exit')
  } catch {
    // ignore
  }
  try {
    await window.electron?.ipcRenderer?.invoke('update:start')
  } catch (err) {
    showToast(t('toasts.updateError'), 'error')
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
  updateInterval.value = setInterval(checkUpdate, 1000 * 60)
  window.addEventListener('click', () => {
    isAdminMenuOpen.value = false
    isDiscordMenuOpen.value = false
  })
})

onUnmounted(() => {
  clearInterval(updateInterval.value)
  window.removeEventListener('click', () => {
    isAdminMenuOpen.value = false
    isDiscordMenuOpen.value = false
  })
})
</script>

<template>
  <header class="header">
    <div class="applogo">
      <div class="applogo-icon">
        <img :src="logo" width="100%" @dragstart.prevent="null" />
      </div>
      <div class="flex flex-col ml-2">
        <h1>PokeGoGo</h1>
        <div class="applogo-badge">
          {{ generalStore.appVersion }}
        </div>
      </div>
    </div>

    <!-- Simplified Breadcrumbs -->
    <div v-if="$route.path.includes('/app')" class="breadcrumbs">
      <span class="crumb-disabled">App</span>
      <span class="separator">/</span>
      <span class="crumb-active">
        {{ t($route.meta.displayName as string) }}
      </span>
    </div>

    <div class="flex ml-auto items-center gap-2 window-controls">
      <button class="icon-btn lang-btn" :title="t('header.changeLanguage')" @click="toggleLocale">
        <span>{{ locale.toUpperCase() }}</span>
      </button>

      <button
        v-if="isAdmin"
        class="icon-btn admin-btn"
        :class="{ active: isAdminMenuOpen }"
        title="Admin Tools"
        @click.stop="toggleAdminMenu"
      >
        <i class="fas fa-shield-halved" />

        <Transition name="fade-slide">
          <div v-if="isAdminMenuOpen" class="admin-dropdown">
            <button
              v-if="isTechnician"
              class="dropdown-item"
              @click="router.push('/app/game-control')"
            >
              <i class="fas fa-gamepad"></i>
              <span>{{ t('router.gameControl') }}</span>
            </button>
            <button v-if="isFullAdmin" class="dropdown-item" @click="router.push('/app/ftp')">
              <i class="fas fa-folder-tree"></i>
              <span>{{ t('router.ftp') }}</span>
            </button>
            <button v-if="isFullAdmin" class="dropdown-item" @click="router.push('/app/items')">
              <i class="fas fa-boxes-stacked"></i>
              <span>{{ t('router.items') }}</span>
            </button>
            <button v-if="isAdmin" class="dropdown-item" @click="router.push('/app/events')">
              <i class="fas fa-calendar-alt"></i>
              <span>{{ t('router.events') }}</span>
            </button>
          </div>
        </Transition>
      </button>

      <button
        class="icon-btn admin-btn"
        :class="{ active: isDiscordMenuOpen }"
        title="Discord"
        @click.stop="toggleDiscordMenu"
      >
        <i class="fab fa-discord" />

        <Transition name="fade-slide">
          <div v-if="isDiscordMenuOpen" class="admin-dropdown discord-dropdown" style="right: 0;">
            <button class="dropdown-item" @click.stop="openDiscord">
              <i class="fab fa-discord"></i>
              <span>Dołącz na serwer</span>
            </button>
            <template v-if="userStore.user">
              <button v-if="!userStore.user?.discordId" class="dropdown-item" @click.stop="linkDiscordAccount">
                <i class="fas fa-link"></i>
                <span>Połącz konto</span>
              </button>
              <button v-else class="dropdown-item" @click.stop="linkDiscordAccount">
                <i class="fas fa-sync"></i>
                <span>Odśwież połączenie</span>
              </button>
            </template>
          </div>
        </Transition>
      </button>

      <button class="icon-btn" title="Report Issue" @click="openDiscordReportModal">
        <i class="fa fa-question" />
      </button>

      <button
        v-if="isUpdateAvailable"
        class="icon-btn update-btn"
        title="Update Available"
        @click="
          generalStore.currentState === 'minecraft-started'
            ? openConfirmModal()
            : handleInstallUpdate()
        "
      >
        <i v-if="isInstallingUpdate" class="fas fa-spinner fa-spin"></i>
        <i v-else class="fas fa-download"></i>
      </button>

      <div class="divider"></div>

      <button class="win-btn" @click="minimizeWindow">
        <i class="fa-solid fa-minus"></i>
      </button>
      <button class="win-btn close" @click="closeWindow">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <UpdateConfirm ref="confirmModalRef" @accept="handleInstallUpdate" />
    <DiscordReportModal ref="discordReportModalRef" />
  </header>
</template>

<style scoped>
.header {
  position: relative;
  z-index: 50;
  width: 100%;
  height: 60px; /* Fixed height */
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  background: transparent; /* Transparent for glass feel */
  -webkit-app-region: drag;
  user-select: none;
}

/* Logo Section */
.applogo {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag; /* Interactable */
}

.applogo-icon {
  width: 2.2rem;
  height: 2.2rem;
  filter: drop-shadow(0 0 8px rgba(var(--primary-rgb), 0.5));
  transition: transform 0.3s ease;
}

.applogo:hover .applogo-icon {
  transform: rotate(10deg) scale(1.1);
}

.applogo h1 {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.applogo-badge {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Breadcrumbs */
.breadcrumbs {
  margin-left: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  -webkit-app-region: no-drag;
}

.crumb-disabled {
  color: var(--text-muted);
  font-weight: 500;
}

.separator {
  color: var(--text-muted);
  opacity: 0.5;
}

.crumb-active {
  color: var(--primary);
  font-weight: 600;
}

/* Controls */
.window-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  -webkit-app-region: no-drag;
}

.icon-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.update-btn {
  background: var(--primary);
  color: white;
  box-shadow: 0 0 10px rgba(var(--primary-rgb), 0.4);
}

.update-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.lang-btn {
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.5px;
}

.admin-btn {
  background: rgba(var(--primary-rgb), 0.1);
  color: var(--primary);
  border: 1px solid rgba(var(--primary-rgb), 0.2);
  position: relative;
}

.admin-btn:hover,
.admin-btn.active {
  background: var(--primary);
  color: white;
}

.admin-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 180px;
  background: var(--bg-card);
  backdrop-filter: blur(24px);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  transform: translateX(4px);
}

.dropdown-item i {
  width: 20px;
  text-align: center;
  font-size: 1rem;
  opacity: 0.7;
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.divider {
  width: 1px;
  height: 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 0.5rem;
}

.win-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
}

.win-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.win-btn.close:hover {
  background: rgba(255, 59, 48, 0.2);
  color: #ff3b30;
}
</style>
