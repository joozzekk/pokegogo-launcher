<script lang="ts" setup>
import { onMounted } from 'vue'
import { initAnimations } from '@renderer/assets/scripts/animations'

import Header from '@renderer/components/Header.vue'
import Sidebar from '@renderer/components/Sidebar.vue'
const token = localStorage.getItem('token')

onMounted(() => {
  initAnimations()

  if (token) {
    setInterval(
      async () => {
        const { refreshToken, mcToken } = await window.electron.ipcRenderer.invoke(
          'refresh-token',
          token
        )

        console.log('RefreshToken: ', refreshToken)
        console.log('MCToken Data: ', JSON.parse(mcToken))
        localStorage.setItem('token', refreshToken)
        localStorage.setItem('mcToken', mcToken)
      },
      1000 * 60 * 30
    )
  }
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
