<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import Header from '@ui/components/core/Header.vue'
import Sidebar from '@ui/components/core/Sidebar.vue'
import BannedModal from '@ui/components/modals/BannedModal.vue'
import UserProfile from '@ui/components/modals/UserProfile.vue'
import Background from '@ui/components/Background.vue'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useLauncherService } from '@ui/services/launcher-service'
import { initAnimations } from '@ui/assets/scripts/animations'
import { useRoute } from 'vue-router'
import Chat from '../Chat.vue'
import BanPlayerModal from '../modals/BanPlayerModal.vue'
import PasswordResetConfirm from '../modals/PasswordResetConfirm.vue'
import { IUser } from '@ui/env'

const route = useRoute()

const transitionName = ref('slide-up')

const { useMethods, useFetches, useVariables } = useLauncherService()

const { startMicrosoftTokenRefreshInterval, handleRefreshDataAndProfile } = useMethods()
const { fetchUpdateData, fetchEvents, fetchFriends, fetchPlayers } = useFetches()
const { refreshInterval, events, allPlayers, filteredPlayers, hasMorePlayers, isLoadingPlayers } =
  useVariables()

const routeOrder = [
  '/app/events',
  '/app/items',
  '/app/ftp',
  '/app/home',
  '/app/users',
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

const banPlayerModalRef = ref()
const passwordResetModalRef = ref()

const handleLauncherBan = async (player: IUser): Promise<void> => {
  banPlayerModalRef.value?.openModal(player)
}

const handleLauncherUnban = async (player: IUser): Promise<void> => {
  banPlayerModalRef.value?.openModal(player, 'unban')
}

const handleResetPassword = async (player: IUser): Promise<void> => {
  passwordResetModalRef.value?.openModal(player)
}

onMounted(async () => {
  initAnimations()
  startMicrosoftTokenRefreshInterval()

  await fetchUpdateData()
  await fetchFriends()
  await fetchEvents()

  window.discord?.setActivity(`W PokeGoGo Launcher`, 'Przeglądam..')
})

onUnmounted(() => {
  clearInterval(refreshInterval.value)
})
</script>

<template>
  <Background />

  <Header />

  <div class="launcher-container">
    <Sidebar />

    <main class="main-content !relative overflow-hidden !w-full">
      <RouterView v-slot="{ Component }">
        <Transition :name="transitionName">
          <component
            :is="Component"
            :events="events"
            :all-players="allPlayers"
            :filtered-players="filteredPlayers"
            :has-more-players="hasMorePlayers"
            :is-loading-players="isLoadingPlayers"
            @fetch-players="fetchPlayers"
            @refresh-data="fetchPlayers"
            @ban-player="handleLauncherBan"
            @unban-player="handleLauncherUnban"
            @reset-password="handleResetPassword"
          />
        </Transition>
      </RouterView>
    </main>
  </div>

  <div id="toastContainer" class="toast-container"></div>
  <BannedModal />
  <Chat />
  <BanPlayerModal ref="banPlayerModalRef" @refresh-data="handleRefreshDataAndProfile" />
  <PasswordResetConfirm ref="passwordResetModalRef" />
  <UserProfile
    @refresh-data="handleRefreshDataAndProfile"
    @ban-player="handleLauncherBan"
    @unban-player="handleLauncherUnban"
    @reset-password="handleResetPassword"
  />
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
