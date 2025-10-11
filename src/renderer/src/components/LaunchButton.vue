<script lang="ts" setup>
import { refreshMicrosoftToken } from '@renderer/services/refresh-service'
import useGeneralStore from '@renderer/stores/general-store'
import useUserStore from '@renderer/stores/user-store'
import { createParticles, showToast } from '@renderer/utils'
import { computed } from 'vue'

const generalStore = useGeneralStore()

const states = {
  start: 'Uruchamianie..',
  'java-install': 'Instalowanie Javy..',
  'files-verify': 'Weryfikowanie plików..',
  'minecraft-start': 'Uruchamianie gry..',
  'minecraft-started': 'Minecraft jest uruchomiony...',
  'minecraft-closed': 'Minecraft został zamknięty.'
}

const accountType = localStorage.getItem('LOGIN_TYPE')
const userStore = useUserStore()

const handleToggleGame = async (e: Event): Promise<void> => {
  try {
    switch (generalStore.currentState) {
      case 'files-verify':
        await handleKillVerify()
        break
      case 'minecraft-started':
      case 'minecraft-start':
        await handleKillGame()
        break
      case 'minecraft-closed':
        generalStore.setIsOpeningGame(false)
        generalStore.setCurrentState('start')
        break
      default:
        await handleLaunchGame(e)
    }
  } catch (err) {
    console.error(err)
    showToast('Wystąpił błąd podczas uruchamiania gry.', 'error')
    generalStore.setIsOpeningGame(false)
  }
}

const handleLaunchGame = async (e: Event): Promise<void> => {
  generalStore.setIsOpeningGame(true)
  createParticles(e.target as HTMLElement)

  const mcToken = localStorage.getItem('mcToken')

  if (accountType === 'microsoft' && mcToken?.includes('exp')) {
    const exp = JSON.parse(mcToken as string).exp
    const now = Math.floor(Date.now() / 1000)
    if (now >= exp) await refreshMicrosoftToken(localStorage.getItem('token'))
  }

  const res = await window.electron.ipcRenderer.invoke('launch-game', {
    token: accountType === 'microsoft' ? mcToken : JSON.stringify(userStore.user),
    mcVersion: '1.21.1',
    javaVersion: '21',
    settings: {
      resolution: generalStore.settings.resolution,
      ram: generalStore.settings.ram,
      displayMode: generalStore.settings.displayMode
    },
    accountType
  })

  if (res) {
    showToast(`${res}`)
  }
}

const state = computed(() => {
  return states[generalStore.currentState]
})

const handleKillGame = async (): Promise<void> => {
  await window.electron.ipcRenderer.invoke('launch:exit')
  generalStore.setCurrentState('start')
  generalStore.setIsOpeningGame(false)
}

const handleKillVerify = async (): Promise<void> => {
  await window.electron.ipcRenderer.invoke('launch:exit-verify')
  generalStore.setCurrentState('start')
  generalStore.setIsOpeningGame(false)
}

window.electron.ipcRenderer.on('launch:change-state', (_event, state: string) => {
  const parsedState = JSON.parse(state)
  generalStore.setCurrentState(parsedState)

  if (parsedState === 'minecraft-closed') {
    setTimeout(() => {
      generalStore.setCurrentState('start')
      generalStore.setIsOpeningGame(false)
    }, 500)
  }
})

window.electron.ipcRenderer.on('launch:show-log', (_event, data: string, ended?: string) => {
  if (!ended) {
    generalStore.setCurrentLog(data)
    return
  }

  generalStore.setCurrentLog('')
})
</script>

<template>
  <div
    class="launch-button-container"
    :class="{ 'margin-64': generalStore.currentState === 'files-verify' }"
  >
    <button id="launchBtn" class="launch-button" @click="(e) => handleToggleGame(e)">
      <div class="launch-button-bg"></div>
      <template v-if="!generalStore.isOpeningGame">
        <div class="title">
          <i class="fas fa-play"></i>
          <span>URUCHOM GRĘ</span>
        </div>
      </template>
      <div v-else class="launch-running">
        <div
          class="title"
          :class="{
            'margin-title': generalStore.isOpeningGame
          }"
        >
          <i v-if="generalStore.isOpeningGame" class="fas fa-spinner fa-spin"></i>
          <span>{{ state }}</span>
        </div>
        <span v-if="generalStore.isOpeningGame" class="info">Kliknij, aby przerwać</span>
      </div>
    </button>
    <Transition name="slide-down">
      <div
        v-if="generalStore.currentState === 'files-verify' && generalStore.currentLog.length"
        class="launch-button-info"
      >
        {{ generalStore.currentLog }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.launch-button-container {
  position: relative;
}

.margin-64 {
  margin-bottom: 42px;
}

.launch-button-info {
  width: 100%;
  height: 30px;
  position: absolute;
  top: 100%;
  width: 100%;
  background: var(--bg-dark);
  padding: 0.5rem;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
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
  padding: 20px;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: 1rem;
  font-size: 1.5rem;
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
  margin-bottom: 20px;
  z-index: 2;
}

.launch-button .title {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.margin-title {
  margin-bottom: 0.5rem;
}

.launch-button .info {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
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
  transform: translateY(-3px);
  box-shadow: 0 10px 2.25rem rgba(34, 151, 197, 0.4);
}

.launch-button:active {
  transform: translateY(-1px);
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
