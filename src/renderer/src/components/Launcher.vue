<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { initAnimations } from '@renderer/assets/scripts/animations'

import Header from '@renderer/components/Header.vue'
import Sidebar from '@renderer/components/Sidebar.vue'
import { refreshMicrosoftToken } from '@renderer/services/refresh-service'

const refreshInterval = ref<any>(null)

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
