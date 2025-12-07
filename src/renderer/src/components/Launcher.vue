<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { initAnimations } from '@renderer/assets/scripts/animations'
import Header from '@renderer/components/Header.vue'
import Sidebar from '@renderer/components/Sidebar.vue'
import useUserStore from '@renderer/stores/user-store'
import {
  checkMachineID,
  fetchProfile,
  updateMachineData,
  updateProfileData
} from '@renderer/api/endpoints'
import useGeneralStore from '@renderer/stores/general-store'
import { refreshMicrosoftToken } from '@renderer/utils'
import BannedModal from '@renderer/components/modals/BannedModal.vue'
import { useSocket } from '@renderer/services/socket-service'
import api from '@renderer/utils/client'
import { LOGGER } from '@renderer/services/logger-service'
import choinka from '@renderer/assets/img/choinka.png'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const refreshInterval = ref<any>(null)
const generalStore = useGeneralStore()
const accountType = localStorage.getItem('LOGIN_TYPE')
const userStore = useUserStore()

const socket = useSocket()

const fetchProfileData = async (): Promise<void> => {
  const profile = await fetchProfile()

  userStore.setUser(profile)
}

const loadProfile = async (): Promise<void> => {
  await fetchProfileData()
}

const isMachineIDBanned = async (): Promise<void> => {
  const res = await checkMachineID(generalStore.settings.machineId)

  userStore.hwidBanned = res
}

const refreshToken = async (): Promise<void> => {
  const refreshToken = localStorage.getItem('refresh_token')

  api
    .post('/auth/refresh', { refreshToken })
    .then(({ data }) => {
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
    })
    .catch((err) => {
      LOGGER.log(err)
    })
}

socket.on('player:banned', async (data) => {
  await isMachineIDBanned()
  const isCurrentPlayerBanned =
    userStore.user?.machineId === data.uuid || userStore.user?.uuid === data.uuid

  if (isCurrentPlayerBanned) {
    await refreshToken()
    await fetchProfileData()
    location.reload()
  }
})

socket.on('player:unbanned', async (data) => {
  await isMachineIDBanned()
  const isCurrentPlayerUnbanned =
    userStore.user?.machineId === data.uuid || userStore.user?.uuid === data.uuid

  if (isCurrentPlayerUnbanned) {
    await refreshToken()
    await fetchProfileData()
    location.reload()
  }
})

socket.on('player:update-profile', async (data) => {
  const isCurrentPlayer = userStore.user?.uuid === data.uuid

  if (isCurrentPlayer) {
    await refreshToken()
    await fetchProfileData()
    location.reload()
  }
})

onMounted(async () => {
  initAnimations()

  if (accountType === 'microsoft') {
    refreshInterval.value = setInterval(
      async () => {
        const res = await refreshMicrosoftToken(
          localStorage.getItem(`msToken:${userStore.user?.nickname}`)
        )

        if (res) {
          localStorage.setItem(`msToken:${userStore.user?.nickname}`, res.msToken)
          localStorage.setItem('mcToken', res.mcToken)
        }
      },
      1000 * 60 * 60
    )
  }
  await loadProfile()

  const machineData = await window.electron?.ipcRenderer?.invoke('data:machine')
  generalStore.setMachineData(machineData.machineId, machineData.macAddress, machineData.ipAddress)

  if (userStore.user) {
    await updateProfileData({
      accountType: accountType ?? ''
    })

    await updateMachineData({
      machineId: generalStore.settings.machineId,
      macAddress: generalStore.settings.macAddress,
      ipAddress: generalStore.settings.ipAddress
    })

    await isMachineIDBanned()
  }
})

onUnmounted(() => {
  clearInterval(refreshInterval.value)
})
</script>

<template>
  <div>
    <div class="animated-bg">
      <img
        :src="choinka"
        alt="background"
        class="absolute !h-[100vh] z-[0]"
        @dragstart.prevent="null"
      />

      <div class="particles"></div>
    </div>
    <div class="vignette"></div>

    <Header />

    <div class="container">
      <Sidebar />

      <main class="main-content">
        <RouterView />
      </main>
    </div>

    <div id="toastContainer" class="toast-container"></div>
    <BannedModal />
  </div>
</template>
