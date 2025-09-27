<script lang="ts" setup>
import useGeneralStore from '@renderer/stores/general-store'
import useUserStore from '@renderer/stores/user-store'
import { createParticles, showToast } from '@renderer/utils'
import { computed, ref } from 'vue'

const generalStore = useGeneralStore()
const isOpeningGame = ref<boolean>(false)
const currentState = ref<string>('start')
const currentLog = ref<string>('')

const states = {
  start: 'Uruchamianie..',
  'java-install': 'Instalowanie Javy..',
  'files-verify': 'Weryfikowanie plików..',
  'minecraft-start': 'Uruchamianie gry..'
}

window.electron.ipcRenderer.on('change-launch-state', (_event, state: string) => {
  currentState.value = JSON.parse(state)
})

window.electron.ipcRenderer.on('show-log', (_event, data: string, ended?: boolean) => {
  if (!ended) {
    currentLog.value = data
    return
  }

  currentLog.value = ''
})

const accountType = localStorage.getItem('LOGIN_TYPE')
const mcToken = localStorage.getItem('mcToken')
const userStore = useUserStore()

const handleToggleGame = async (e: Event): Promise<void> => {
  switch (currentState.value) {
    case 'files-verify':
      handleKillVerify()
      isOpeningGame.value = false
      break
    case 'minecraft-start':
      handleKillGame()
      isOpeningGame.value = false
      break
    default:
      handleLaunchGame(e)
  }
}

const handleLaunchGame = async (e: Event): Promise<void> => {
  isOpeningGame.value = true
  createParticles(e.target as HTMLElement)

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
  return states[currentState.value]
})

const handleKillGame = async (): Promise<void> => {
  await window.electron.ipcRenderer.invoke('exit-launch')
}

const handleKillVerify = async (): Promise<void> => {
  await window.electron.ipcRenderer.invoke('exit-verify')
  isOpeningGame.value = false
}
</script>

<template>
  <div class="launch-button-container" :class="{ 'margin-64': currentState === 'files-verify' }">
    <button id="launchBtn" class="launch-button" @click="(e) => handleToggleGame(e)">
      <div class="launch-button-bg"></div>
      <template v-if="!isOpeningGame">
        <div class="title">
          <i class="fas fa-play"></i>
          <span>URUCHOM GRĘ</span>
        </div>
      </template>
      <div v-else class="launch-running">
        <div
          class="title"
          :class="{
            'margin-title': !['minecraft-start', 'start'].includes(currentState)
          }"
        >
          <i class="fas fa-spinner fa-spin"></i>
          <span>{{ state }}</span>
        </div>
        <span v-if="!['minecraft-start', 'start'].includes(currentState)" class="info"
          >Kliknij, aby anulować</span
        >
      </div>
    </button>
    <Transition name="slide-down">
      <div v-if="currentState === 'files-verify'" class="launch-button-info">
        {{ currentLog }}
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
