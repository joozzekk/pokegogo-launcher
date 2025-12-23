<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import Header from '@ui/components/core/Header.vue'
import Sidebar from '@ui/components/core/Sidebar.vue'
import BannedModal from '@ui/components/modals/BannedModal.vue'
import Background from '@ui/components/Background.vue'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useLauncherService } from '@ui/services/launcher-service'
import { initAnimations } from '@ui/assets/scripts/animations'
import { useRoute } from 'vue-router'
import Chat from '../Chat.vue'

const route = useRoute()

const transitionName = ref('slide-up')

const { useMethods, useFetches, useVariables } = useLauncherService()

const { startMicrosoftTokenRefreshInterval } = useMethods()
const { fetchUpdateData, fetchEvents } = useFetches()
const { refreshInterval, events } = useVariables()

const routeOrder = [
  '/app/users',
  '/app/events',
  '/app/items',
  '/app/ftp',
  '/app/home',
  '/app/news',
  '/app/shop',
  '/app/changelog',
  '/app/settings'
]

watch(
  () => route.path,
  (to, from) => {
    const toIndex = routeOrder.indexOf(to)
    const fromIndex = routeOrder.indexOf(from)

    if (toIndex !== -1 && fromIndex !== -1) {
      transitionName.value = toIndex > fromIndex ? 'view-next' : 'view-prev'
    } else {
      transitionName.value = 'view'
    }
  }
)

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

    <main class="main-content !relative overflow-hidden !w-[calc(100vw-6.5rem)]">
      <RouterView v-slot="{ Component }">
        <Transition :name="transitionName">
          <component :is="Component" :events="events" />
        </Transition>
      </RouterView>
    </main>
  </div>

  <div id="toastContainer" class="toast-container"></div>
  <BannedModal />
  <Chat />
</template>

<style>
.view-next-enter-active,
.view-next-leave-active,
.view-prev-enter-active,
.view-prev-leave-active {
  position: absolute;
  width: calc(100vw - 6.5rem);
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

.view-next-enter-from {
  transform: translateY(100%);
}
.view-next-leave-to {
  transform: translateY(-100%);
}

.view-prev-enter-from {
  transform: translateY(-100%);
}
.view-prev-leave-to {
  transform: translateY(100%);
}
</style>
