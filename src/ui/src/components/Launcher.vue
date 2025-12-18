<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import Header from '@ui/components/Header.vue'
import Sidebar from '@ui/components/Sidebar.vue'
import useUserStore from '@ui/stores/user-store'
import { getEvents, updateMachineData, updateProfileData } from '@ui/api/endpoints'
import useGeneralStore from '@ui/stores/general-store'
import BannedModal from '@ui/components/modals/BannedModal.vue'
import Background from './Background.vue'
import { isMachineIDBanned, refreshMicrosoftToken } from '@ui/utils'
import { useSocketService } from '@ui/services/socket-service'
import { onMounted, onUnmounted, ref } from 'vue'
import { initAnimations } from '@ui/assets/scripts/animations'

const refreshInterval = ref<any>(null)
const generalStore = useGeneralStore()
const userStore = useUserStore()
const { connect } = useSocketService()

const events = ref<any[]>([])

onMounted(async () => {
  events.value = await getEvents()

  initAnimations()

  if (userStore.user?.accountType === 'microsoft') {
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
      1000 * 60 * 60 // Every 1 hour
    )
  }
  await userStore.updateProfile()

  const machineData = await window.electron?.ipcRenderer?.invoke('data:machine')
  generalStore.setMachineData(machineData.machineId, machineData.macAddress, machineData.ipAddress)

  if (userStore.user) {
    await updateProfileData({
      accountType: userStore.user?.accountType ?? ''
    })

    await updateMachineData({
      machineId: generalStore.settings.machineId,
      macAddress: generalStore.settings.macAddress,
      ipAddress: generalStore.settings.ipAddress
    })

    await isMachineIDBanned()

    connect(userStore.user.uuid)
  }

  window.discord.setActivity(`W PokeGoGo Launcher`, 'Przeglądam..')
})

onUnmounted(() => {
  clearInterval(refreshInterval.value)
})
</script>

<template>
  <Background />

  <Header />

  <div class="container">
    <Sidebar />

    <main class="main-content">
      <RouterView v-slot="{ Component }">
        <component :is="Component" :events="events" />
      </RouterView>
    </main>
  </div>

  <div id="toastContainer" class="toast-container"></div>
  <BannedModal />
</template>
