<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { initAnimations } from '@renderer/assets/scripts/animations'

import Header from '@renderer/components/Header.vue'
import Sidebar from '@renderer/components/Sidebar.vue'
import { refreshMicrosoftToken } from '@renderer/services/refresh-service'
import useUserStore from '@renderer/stores/user-store'
import { fetchProfile } from '@renderer/api/endpoints'

const refreshInterval = ref<any>(null)
const accountType = localStorage.getItem('LOGIN_TYPE')
const userStore = useUserStore()

const fetchProfileData = async (): Promise<void> => {
  if (!userStore.user?.uuid) {
    const profile = await fetchProfile()

    userStore.setUser(profile)
    console.log(userStore.user)
    console.log(new Date(profile.exp * 1000))
  }
}

const loadProfile = async (): Promise<void> => {
  const json = localStorage.getItem('mcToken')

  switch (accountType) {
    case 'backend':
      await fetchProfileData()
      break
    case 'microsoft':
      if (json) {
        const data = JSON.parse(json)
        const profile = data?.profile
        userStore.setUser(profile)
      }
      break
  }
}

onMounted(async () => {
  initAnimations()

  if (localStorage.getItem('LOGIN_TYPE')?.includes('microsoft') && localStorage.getItem('token')) {
    refreshInterval.value = setInterval(
      async () => {
        await refreshMicrosoftToken(localStorage.getItem('token'))
      },
      1000 * 60 * 5
    )
  }
  await loadProfile()
})

onUnmounted(() => {
  clearInterval(refreshInterval.value)
})
</script>

<template>
  <div>
    <div class="animated-bg">
      <div class="gradient-overlay"></div>
      <div class="particles"></div>
    </div>

    <Header />

    <div class="container">
      <Sidebar />

      <main class="main-content">
        <RouterView />
      </main>
    </div>

    <div id="toastContainer" class="toast-container"></div>
  </div>
</template>
