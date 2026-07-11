<script setup lang="ts">
import { onMounted } from 'vue'
import { applyTheme } from '@ui/assets/theme/themes'
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import { connectPlayer, disconnectPlayer } from '@ui/api/endpoints'
import { useSocketService } from '@ui/services/socket-service'
import { LOGGER } from '@ui/services/logger-service'
import { showToast } from '@ui/utils'
import LaunchErrorModal from '@ui/components/modals/LaunchErrorModal.vue'
import { ref, watch } from 'vue'
import banMusicSrc from '@ui/assets/audio/banmusic.mp3'

const launchErrorModalRef = ref()

const banAudio = new Audio(banMusicSrc)
banAudio.loop = true

const generalStore = useGeneralStore()
const userStore = useUserStore()
const { emit: emitSocket } = useSocketService()

window.electron?.ipcRenderer?.on('toast:show', (_, data: string) => {
  showToast(`${data}`)
})

window.electron?.ipcRenderer?.on('change:version', (_, ver: string) => {
  generalStore.changeVersion(ver)
})

window.electron?.ipcRenderer?.on('change:max-ram', (_, ram: string) => {
  generalStore.changeMaxRAM(parseInt(ram))
})

let heartbeatInterval: number | undefined = undefined

const startHeartbeat = (): void => {
  if (heartbeatInterval) clearInterval(heartbeatInterval)
  heartbeatInterval = window.setInterval(
    () => {
      if (generalStore.currentState === 'minecraft-started' && generalStore.mcInstance) {
        emitSocket('player:mc-started', { nickname: userStore.user?.nickname })
      }
    },
    10 * 60 * 1000
  )
}

const stopHeartbeat = (): void => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = undefined
  }
}

window.electron?.ipcRenderer?.on(
  'launch:change-state',
  async (_event, state: string, pid?: number) => {
    const parsedState = JSON.parse(state)
    generalStore.setCurrentState(parsedState)
    if (pid) generalStore.mcInstance = pid

    if (parsedState === 'minecraft-started') {
      LOGGER.with('Launch State').log('Minecraft is running..')
      generalStore.setIsOpeningGame(true)

      // Clear logs after 15 seconds delay
      setTimeout(() => {
        if (generalStore.currentState === 'minecraft-started') {
          generalStore.setCurrentLog('')
        }
      }, 15000)

      window.discord.setActivity(`W PokeGoGo Launcher`, 'Gram..')
      await connectPlayer()
      emitSocket('player:mc-started', { nickname: userStore.user?.nickname })
      startHeartbeat()
    }

    if (parsedState === 'minecraft-closed') {
      generalStore.setCurrentState('start')
      generalStore.setIsOpeningGame(false)
      generalStore.setCurrentLog('')
      window.discord.setActivity(`W PokeGoGo Launcher`, 'Przeglądam..')
      LOGGER.with('Launch State').log('Minecraft is closed.')
      await disconnectPlayer()
      emitSocket('player:mc-closed', { nickname: userStore.user?.nickname })
      stopHeartbeat()
    }
  }
)

window.electron?.ipcRenderer?.on('launch:show-log', (_event, data: string, ended?: boolean) => {
  if (ended) {
    generalStore.setCurrentLog('')
  } else {
    generalStore.setCurrentLog(data)
  }
})

window.electron?.ipcRenderer?.on('launch:error', (_event, errorData: any) => {
  LOGGER.with('Launch State').err('Received launch:error:', errorData)
  generalStore.setCurrentState('start')
  generalStore.setIsOpeningGame(false)
  generalStore.setCurrentLog('')
  launchErrorModalRef.value?.openModal(errorData.type, errorData.details)
})

watch(() => userStore.user?.isBanned || userStore.hwidBanned, (isBanned) => {
  if (isBanned) {
    banAudio.play().catch(e => console.error('Audio play failed', e))
  } else {
    banAudio.pause()
    banAudio.currentTime = 0
  }
}, { immediate: true })

window.electron?.ipcRenderer?.on('window:tray-hidden', () => {
  banAudio.pause()
})

window.electron?.ipcRenderer?.on('window:tray-restored', () => {
  if (userStore.user?.isBanned || userStore.hwidBanned) {
    banAudio.play().catch(e => console.error('Audio play failed', e))
  }
})

onMounted(() => {
  generalStore.loadSettings()

  applyTheme(
    localStorage.getItem('customTheme') && generalStore.settings.theme === 'custom'
      ? 'custom'
      : generalStore.getTheme()
  )
})
</script>

<template>
  <RouterView />
  <LaunchErrorModal ref="launchErrorModalRef" />
</template>

<style lang="css">
@import '@ui/assets/base.css';
</style>
