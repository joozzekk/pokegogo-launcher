<script lang="ts" setup>
import { connectPlayer, disconnectPlayer } from '@ui/api/endpoints'
import { LOGGER } from '@ui/services/logger-service'
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import { createParticles, refreshMicrosoftToken, showToast } from '@ui/utils'
import { differenceInMilliseconds, intervalToDuration, parseISO } from 'date-fns'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

const generalStore = useGeneralStore()

const states = reactive({
  start: 'Uruchamianie..',
  'java-install': 'Instalowanie Javy..',
  'files-verify': 'Weryfikowanie plików..',
  'minecraft-start': 'Uruchamianie gry..',
  'minecraft-started': 'Minecraft jest uruchomiony...',
  'minecraft-closed': 'Minecraft został zamknięty.'
})

const userStore = useUserStore()

const isBanned = computed(() => {
  return userStore.hwidBanned
    ? userStore.hwidBanned
    : userStore.user?.banEndDate
      ? differenceInMilliseconds(parseISO(userStore.user?.banEndDate as string), new Date()) > 0
      : !!userStore.user?.isBanned
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
        await handleLaunchGame(e)
        break
      default:
        break
    }
  } catch (err) {
    LOGGER.with('Launch State').err((err as Error).toString())
    showToast('Wystąpił błąd podczas uruchamiania gry.', 'error')
  }
}

const handleLaunchGame = async (e: Event): Promise<void> => {
  createParticles(e.target as HTMLElement)

  let mcToken = localStorage.getItem('mcToken')

  if (userStore.user?.accountType === 'microsoft' && mcToken?.includes('exp')) {
    LOGGER.with('Launch State').log('Weryfikacja tokenu MC..')
    const exp = parseInt(JSON.parse(mcToken as string).exp)
    const now = new Date().getTime()

    LOGGER.with('Launch State').log(`${now} ${exp}`)

    if (now >= exp) {
      LOGGER.with('Launch State').log('Odświeżanie tokenu MC..')
      try {
        const res = await refreshMicrosoftToken(
          localStorage.getItem(`msToken:${userStore.user?.nickname}`)
        )

        if (res) {
          localStorage.setItem(`msToken:${userStore.user?.nickname}`, res.msToken)
          localStorage.setItem('mcToken', res.mcToken)

          mcToken = res.mcToken
        }

        LOGGER.with('Launch State').success('MC Token został odświeżony.')
      } catch (err: unknown) {
        LOGGER.with('Launch State').err('Błąd odświażania tokenu.', `${err}`)
        showToast('Błąd odświeżania tokenu MC. Spróbuj ponownie za chwilę.')

        generalStore.setCurrentState('start')
        return
      }
    }
  }

  const res = await window.electron?.ipcRenderer?.invoke('launch:game', {
    token: userStore.user?.accountType === 'microsoft' ? mcToken : JSON.stringify(userStore.user),
    accessToken: localStorage.getItem('token'),
    javaVersion: '21',
    isDev: generalStore.settings.updateChannel === 'dev',
    settings: {
      resolution: generalStore.settings.resolution,
      ram: generalStore.settings.ram,
      displayMode: generalStore.settings.displayMode,
      gameMode: generalStore.settings.gameMode
    },
    accountType: userStore.user?.accountType
  })

  if (res) generalStore.mcInstance = parseInt(res)
}

const state = computed(() => {
  return states[generalStore.currentState]
})

const handleKillGame = async (): Promise<void> => {
  if (!generalStore.isOpeningGame) return

  await window.electron?.ipcRenderer?.invoke('launch:exit', generalStore.mcInstance)
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
    return 'Permanentnie'
  }

  const banEndDate = parseISO(banEndDateString)
  const remainingMs = differenceInMilliseconds(banEndDate, now.value)

  if (remainingMs <= 0) {
    clearInterval(timerInterval)
    return 'Blokada zakończyła się'
  }

  const duration = intervalToDuration({
    start: now.value,
    end: banEndDate
  })

  const totalHours = (duration.days || 0) * 24 + (duration.hours || 0)
  const hours = pad(totalHours)
  const minutes = pad(duration.minutes || 0)
  const seconds = pad(duration.seconds || 0)

  return `Pozostało: ${hours}:${minutes}:${seconds}`
})

window.electron?.ipcRenderer?.on('launch:change-state', async (_event, state: string) => {
  const parsedState = JSON.parse(state)
  generalStore.setCurrentState(parsedState)

  if (parsedState === 'minecraft-start') {
    window.discord.setActivity(`W PokeGoGo Launcher`, 'Uruchamiam grę..')
  }

  if (parsedState === 'minecraft-started') {
    LOGGER.with('Launch State').log('Minecraft is running..')
    generalStore.setIsOpeningGame(true)
    window.discord.setActivity(`W PokeGoGo Launcher`, 'Gram..')
    await connectPlayer()
  }

  if (parsedState === 'minecraft-closed') {
    generalStore.setCurrentState('start')
    generalStore.setIsOpeningGame(false)
    generalStore.setCurrentLog('')
    window.discord.setActivity(`W PokeGoGo Launcher`, 'Przeglądam..')
    LOGGER.with('Launch State').log('Minecraft is closed.')
    await disconnectPlayer()
  }
})

window.electron?.ipcRenderer?.on('launch:show-log', (_event, data: string, ended?: string) => {
  if (!ended) {
    generalStore.setCurrentLog(data)
    return
  }

  generalStore.setCurrentLog('')
})

const currentState = computed(() => {
  return generalStore.currentState
})

onMounted(async () => {
  timerInterval = window.setInterval(() => {
    now.value = new Date()
  }, 1000)

  try {
    const isRunning = generalStore.mcInstance

    if (isRunning) {
      generalStore.setIsOpeningGame(true)
      generalStore.setCurrentState('minecraft-started')
      LOGGER.with('Launch State').log('Minecraft is running..')
      window.discord.setActivity(`W PokeGoGo Launcher`, 'Gram..')
    }
  } catch {
    LOGGER.with('Launch State').log('Minecraft is not running.')
  }
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<template>
  <div class="relative">
    <button
      class="launch-button"
      :class="{
        banned: isBanned,
        'mb-7': generalStore.currentLog.length
      }"
      :disabled="isBanned"
      @click="(e) => handleToggleGame(e)"
    >
      <div class="launch-button-bg"></div>
      <template v-if="currentState === 'start'">
        <div class="title">
          <template v-if="isBanned">
            <i class="fas fa-exclamation-triangle text-2xl"></i>
            <div class="flex flex-col">
              <span class="title" :class="{ 'mb-2': userStore.user?.banEndDate }">
                Twoje konto zostało zablokowane
              </span>
              <span class="text-[0.7rem] text-black">
                {{ userStore.user?.banEndDate ? formattedBanTime : '' }}
              </span>
            </div>
          </template>
          <template v-else>
            <i class="fas fa-play"></i>
            <span>URUCHOM GRĘ</span>
          </template>
        </div>
      </template>
      <div v-else class="launch-running">
        <div
          class="title"
          :class="{
            'margin-title': generalStore.isOpeningGame
          }"
        >
          <i v-if="currentState !== 'start'" class="fas fa-spinner fa-spin"></i>
          <span>{{ state }}</span>
        </div>
        <span v-if="generalStore.isOpeningGame" class="info">Kliknij, aby przerwać</span>
      </div>
    </button>
    <Transition name="slide-down">
      <div v-if="generalStore.currentLog.length" class="launch-button-info">
        {{
          generalStore.currentLog.length > 80
            ? generalStore.currentLog.slice(0, 80) + '..'
            : generalStore.currentLog
        }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.launch-button-info {
  width: 100%;
  height: 1.5rem;
  position: absolute;
  top: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-dark);
  padding: 0.1rem;
  font-size: 0.6rem;
  color: var(--text-primary);
  text-align: center;
  border-radius: 0 0 15px 15px;
}

.launch-running {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.launch-button {
  position: relative;
  width: 100%;
  padding: 1rem;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: 0.8rem;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease-in-out;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 2;
}

.banned {
  background: var(--gradient-banned);
}

.banned:hover,
.banned:focus {
  box-shadow: none !important;
}

.launch-button .title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.margin-title {
  margin-bottom: 0.5rem;
}

.launch-button .info {
  font-size: 0.5rem;
  color: var(--bg-dark);
}

.launch-button-bg {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.launch-button:hover .launch-button-bg {
  left: 100%;
}

.launch-button:hover,
.launch-button:focus {
  box-shadow: 0 0.25rem 1rem var(--border);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.15s ease-in-out;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
