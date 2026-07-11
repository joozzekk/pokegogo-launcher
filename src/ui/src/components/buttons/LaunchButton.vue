<script lang="ts" setup>
import { LOGGER } from '@ui/services/logger-service'
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import { useSocketService } from '@ui/services/socket-service'
import { createParticles, refreshMicrosoftToken, showToast, isMachineIDBanned } from '@ui/utils'
import { differenceInMilliseconds, intervalToDuration, parseISO } from 'date-fns'
import { computed, onMounted, ref, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const generalStore = useGeneralStore()
const { emit: emitSocket } = useSocketService()

const states = computed<Record<string, string>>(() => ({
  start: t('launcher.launchButton.states.start'),
  'java-install': t('launcher.launchButton.states.javaInstall'),
  'files-verify': t('launcher.launchButton.states.filesVerify'),
  'minecraft-start': t('launcher.launchButton.states.minecraftStart'),
  'minecraft-started': t('launcher.launchButton.states.minecraftStarted'),
  'minecraft-closed': t('launcher.launchButton.states.minecraftClosed')
}))

const isLaunching = ref(false)
const userStore = useUserStore()

const isBanned = computed(() => {
  return userStore.hwidBanned
    ? userStore.hwidBanned
    : userStore.user?.banEndDate
      ? differenceInMilliseconds(parseISO(userStore.user?.banEndDate as string), new Date()) > 0
      : !!userStore.user?.isBanned
})

watch(isBanned, async (newVal) => {
  if (
    newVal &&
    (generalStore.currentState === 'minecraft-started' ||
      generalStore.currentState === 'minecraft-start' ||
      generalStore.currentState === 'files-verify')
  ) {
    LOGGER.with('Launch State').warn('Banned during session. Killing game.')
    await handleKillGame()
    showToast(t('launcher.launchButton.ban.bannedTitle'), 'error')
  }
})

const handleToggleGame = async (e: Event): Promise<void> => {
  try {
    switch (generalStore.currentState) {
      case 'files-verify':
      case 'minecraft-started':
      case 'minecraft-start':
        await handleKillGame()
        break
      case 'minecraft-closed':
        generalStore.mcInstance = null
        generalStore.setIsOpeningGame(false)
        generalStore.setCurrentState('start')
        break
      case 'start':
        if (isLaunching.value) return
        await handleLaunchGame(e)
        break
      default:
        break
    }
  } catch (err) {
    LOGGER.with('Launch State').err((err as Error).toString())
    showToast(t('launcher.launchButton.errors.generic'), 'error')
    generalStore.setCurrentState('start')
    generalStore.setIsOpeningGame(false)
  }
}

const handleLaunchGame = async (e: Event): Promise<void> => {
  if (isLaunching.value) return
  isLaunching.value = true

  // Extra strict ban check before launching
  try {
    await isMachineIDBanned()
  } catch (err) {
    LOGGER.with('Launch State').err('Failed to check HWID ban status:', `${err}`)
  }

  if (isBanned.value) {
    isLaunching.value = false
    showToast(t('launcher.launchButton.ban.bannedTitle'), 'error')
    return
  }

  createParticles(e.target as HTMLElement)

  // Natychmiastowa reakcja UI
  generalStore.setIsOpeningGame(true)
  generalStore.setCurrentState('minecraft-start')

  let mcToken = localStorage.getItem('mcToken')

  try {
    if (userStore.user?.accountType === 'microsoft' && mcToken?.includes('exp')) {
      LOGGER.with('Launch State').log(t('launcher.launchButton.errors.tokenVerify'))
      const exp = parseInt(JSON.parse(mcToken as string).exp)
      const now = new Date().getTime()

      LOGGER.with('Launch State').log(`${now} ${exp}`)

      if (now >= exp) {
        LOGGER.with('Launch State').log(t('launcher.launchButton.errors.tokenRefreshing'))
        try {
          const res = await refreshMicrosoftToken(
            localStorage.getItem(`msToken:${userStore.user?.nickname?.toLowerCase()}`)
          )

          if (res) {
            localStorage.setItem(`msToken:${userStore.user?.nickname?.toLowerCase()}`, res.msToken)
            localStorage.setItem('mcToken', res.mcToken)

            mcToken = res.mcToken
          }

          LOGGER.with('Launch State').success(t('launcher.launchButton.errors.tokenRefreshed'))
        } catch (err: unknown) {
          LOGGER.with('Launch State').err('Błąd odświażania tokenu.', `${err}`)
          showToast(t('launcher.launchButton.errors.tokenRefreshError'))

          generalStore.setCurrentState('start')
          generalStore.setIsOpeningGame(false)
          return
        }
      }
    }

    const res = await window.electron?.ipcRenderer?.invoke('launch:game', {
      token: userStore.user?.accountType === 'microsoft' ? mcToken : JSON.stringify(userStore.user),
      accessToken: localStorage.getItem('token'),
      javaVersion: generalStore.settings.gameMode === 'create' ? '17' : '21',
      isDev: generalStore.settings.updateChannel === 'dev',
      settings: {
        resolution: generalStore.settings.resolution,
        ram: generalStore.settings.ram,
        displayMode: generalStore.settings.displayMode,
        gameMode: generalStore.settings.gameMode
      },
      accountType: userStore.user?.accountType
    })

    if (res) {
      generalStore.mcInstance = res as number
      emitSocket('player:mc-started', { nickname: userStore.user?.nickname })
    }
  } catch (err) {
    LOGGER.with('Launch State').err('Global launch error:', `${err}`)
    generalStore.setCurrentState('start')
    generalStore.setIsOpeningGame(false)
  } finally {
    isLaunching.value = false
  }
}

const state = computed(() => {
  return states.value[generalStore.currentState]
})

const handleKillGame = async (): Promise<void> => {
  await window.electron?.ipcRenderer?.invoke('launch:exit', generalStore.mcInstance)
  emitSocket('player:mc-closed', { nickname: userStore.user?.nickname })
  generalStore.mcInstance = null
  generalStore.setCurrentState('start')
  setTimeout(() => {
    generalStore.setCurrentLog('')
  }, 250)
}

const now = ref(new Date())
let timerInterval: number | undefined = undefined

const pad = (num: number): string => String(num).padStart(2, '0')

const formattedBanTime = computed(() => {
  const banEndDateString = userStore.user?.banEndDate as string | null

  if (!banEndDateString?.length) {
    return t('launcher.launchButton.ban.perm')
  }

  const banEndDate = parseISO(banEndDateString)
  const remainingMs = differenceInMilliseconds(banEndDate, now.value)

  if (remainingMs <= 0) {
    clearInterval(timerInterval)
    return t('launcher.launchButton.ban.ended')
  }

  const duration = intervalToDuration({
    start: now.value,
    end: banEndDate
  })

  const totalHours = (duration.days || 0) * 24 + (duration.hours || 0)
  const hours = pad(totalHours)
  const minutes = pad(duration.minutes || 0)
  const seconds = pad(duration.seconds || 0)

  return t('launcher.launchButton.ban.remaining', { time: `${hours}:${minutes}:${seconds}` })
})

// State tracking and listeners moved to App.vue for global persistence.
// This component now relies solely on generalStore for its reactive state.

const currentState = computed(() => {
  return generalStore.currentState
})

const isDropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const toggleDropdown = (): void => {
  if (generalStore.isOpeningGame || currentState.value !== 'start') return
  isDropdownOpen.value = !isDropdownOpen.value
}

const selectMode = (value: string): void => {
  generalStore.setGameMode(value)
  isDropdownOpen.value = false
}

const currentMode = computed(() => {
  return generalStore.availableGameModes.find((m) => m.value === generalStore.settings.gameMode)
})

const onClickOutside = (event: MouseEvent): void => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false
  }
}

onMounted(async (): Promise<void> => {
  document.addEventListener('click', onClickOutside)

  timerInterval = window.setInterval(() => {
    now.value = new Date()
  }, 1000)

  // Initialization check moved to App.vue or handled by store persistence
})

// Clean up listener
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  // Global listeners in App.vue handle the lifecycle now
})
</script>

<template>
  <div class="launch-split-container">
    <!-- Game Mode Dropdown Menu -->
    <Transition name="fade-slide">
      <div v-if="isDropdownOpen" ref="dropdownRef" class="mode-dropdown">
        <div class="dropdown-header">{{ t('settings.gameMode') }}</div>
        <div class="dropdown-list">
          <button
            v-for="mode in generalStore.availableGameModes"
            :key="mode.value"
            class="dropdown-item"
            :class="{ active: generalStore.settings.gameMode === mode.value }"
            @click="selectMode(mode.value)"
          >
            <i :class="mode.icon"></i>
            <div class="item-info">
              <span class="item-label">{{ mode.label }}</span>
              <span class="item-value">{{ mode.value }}</span>
            </div>
            <div
              v-if="generalStore.settings.gameMode === mode.value"
              class="fas fa-check check-icon"
            ></div>
          </button>
        </div>
      </div>
    </Transition>

    <div
      class="split-button-wrapper"
      :class="{
        banned: isBanned,
        running: generalStore.isOpeningGame,
        'has-log': generalStore.currentLog.length
      }"
    >
      <!-- Main Action -->
      <button class="main-action" :disabled="isBanned" @click="(e) => handleToggleGame(e)">
        <div class="launch-button-bg"></div>

        <template v-if="currentState === 'start' || isBanned">
          <div class="action-content">
            <template v-if="isBanned">
              <i class="fas fa-exclamation-triangle ban-icon"></i>
              <div class="ban-text-container">
                <span class="ban-title">{{ t('launcher.launchButton.ban.bannedTitle') }}</span>
                <span class="ban-timer">{{
                  userStore.user?.banEndDate ? formattedBanTime : ''
                }}</span>
              </div>
            </template>
            <template v-else>
              <i class="fas fa-play"></i>
              <span class="truncate">{{ t('launcher.launchButton.actions.launch') }}</span>
            </template>
          </div>
        </template>

        <div v-else class="action-running">
          <div class="title" :class="{ 'margin-title': generalStore.isOpeningGame }">
            <i class="fas fa-spinner fa-spin"></i>
            <span class="truncate">{{ state }}</span>
          </div>
          <span v-if="generalStore.isOpeningGame" class="info">{{
            t('launcher.launchButton.actions.abort')
          }}</span>
        </div>
      </button>

      <!-- Mode Indicator (Icon Trigger on Right) -->
      <button
        v-if="currentState === 'start' && !isBanned"
        class="mode-trigger"
        :class="{ open: isDropdownOpen }"
        :title="currentMode?.label"
        @click.stop="toggleDropdown"
      >
        <i :class="currentMode?.icon || 'fas fa-gamepad'"></i>
      </button>
    </div>

    <!-- Log Overlay (New positioning) -->
    <Transition name="slide-up">
      <div v-if="generalStore.currentLog.length" class="launch-log-overlay">
        {{ generalStore.currentLog }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.launch-split-container {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}

.split-button-wrapper {
  display: flex;
  align-items: center;
  background: var(--gradient-primary);
  border-radius: 16px;
  padding: 0;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
  width: 100%;
  max-width: 280px;
}

.split-button-wrapper.running {
  animation: pulse-border 2s infinite;
  max-width: 280px;
}

.split-button-wrapper.banned {
  background: var(--gradient-banned);
}

/* Main Action */
.main-action {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 100px;
  height: 48px;
  padding: 0 12px 0 16px;
  background: transparent;
  border: none;
  border-radius: 0;
  color: #fff;
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
}

/* Divider */
.main-action::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.1);
}

/* Mode Trigger on Right */
.mode-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  padding: 0 0.8rem;
  height: 48px;
  background: transparent;
  border: none;
  border-radius: 0;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-trigger:hover {
  background: rgba(255, 255, 255, 0.1);
}

.mode-trigger.open {
  background: rgba(0, 0, 0, 0.2);
}

/* Dropdown Menu - Right Aligned */
.mode-dropdown {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  width: 100%;
  background: rgba(20, 20, 25, 0.95);
  backdrop-filter: blur(24px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  z-index: 1001;
}

.dropdown-header {
  padding: 8px 12px;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.dropdown-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.dropdown-item.active {
  background: rgba(var(--primary-rgb), 0.15);
  color: #fff;
  border: 1px solid rgba(var(--primary-rgb), 0.2);
}

.dropdown-item i {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.dropdown-item.active i:first-child {
  color: var(--primary);
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-label {
  font-weight: 700;
  font-size: 0.85rem;
}

.item-value {
  font-size: 0.65rem;
  opacity: 0.5;
}

.check-icon {
  font-size: 0.8rem;
  color: var(--primary);
}

/* Action Content */
.action-content {
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2;
}

.action-running {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  z-index: 2;
  width: 100%;
  max-width: 100%;
}

.action-running .title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: 100%;
  padding: 0 10px;
}

.action-running .truncate {
  min-width: 0;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
}

.action-running .info {
  font-size: 0.55rem;
  opacity: 0.7;
  font-weight: 600;
}

/* Ban UI refinement */
.ban-icon {
  font-size: 0.9rem;
  color: #fff;
  opacity: 0.9;
  flex-shrink: 0;
}

.ban-text-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.1;
  min-width: 0;
  max-width: 100%;
  padding-right: 4px;
}

.ban-title {
  font-size: 0.7rem;
  font-weight: 800;
  white-space: normal;
  text-align: left;
  line-height: 1.2;
}

.ban-timer {
  font-size: 0.55rem;
  opacity: 0.7;
  font-weight: 600;
}

.launch-button-bg {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  z-index: 1;
}

.main-action:hover .launch-button-bg {
  animation: shine 2s infinite;
}

/* Log Overlay */
.launch-log-overlay {
  position: absolute;
  bottom: calc(100% + 12px);
  width: 300px;
  background: rgba(15, 15, 20, 0.9);
  backdrop-filter: blur(12px);
  padding: 8px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  font-size: 0.7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

@keyframes shine {
  from {
    left: -100%;
  }
  to {
    left: 100%;
  }
}

@keyframes pulse-border {
  0% {
    border-color: rgba(var(--primary-rgb), 0.3);
  }
  50% {
    border-color: rgba(var(--primary-rgb), 0.8);
  }
  100% {
    border-color: rgba(var(--primary-rgb), 0.3);
  }
}
.split-button-wrapper:hover:not(.running):not(.banned) {
  transform: scale(1.02);
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
