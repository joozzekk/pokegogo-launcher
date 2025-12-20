<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import Header from '@ui/components/core/Header.vue'
import Sidebar from '@ui/components/core/Sidebar.vue'
import BannedModal from '@ui/components/modals/BannedModal.vue'
import Background from '@ui/components/Background.vue'
import { onMounted, onUnmounted } from 'vue'
import { useLauncherService } from '@ui/services/launcher-service'
import { initAnimations } from '@ui/assets/scripts/animations'

const { useMethods, useFetches, useVariables } = useLauncherService()

const { startMicrosoftTokenRefreshInterval } = useMethods()
const { fetchUpdateData, fetchEvents } = useFetches()
const { refreshInterval, events } = useVariables()

onMounted(async () => {
  initAnimations()
  startMicrosoftTokenRefreshInterval()

  await fetchUpdateData()
  await fetchEvents()

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
