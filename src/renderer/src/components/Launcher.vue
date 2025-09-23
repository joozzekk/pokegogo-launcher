<script lang="ts" setup>
import { onMounted } from 'vue'
import { initAnimations } from '@renderer/assets/scripts/animations'

import HomePage from '@renderer/components/HomePage.vue'
import ShopPage from '@renderer/components/ShopPage.vue'
import SettingsPage from '@renderer/components/SettingsPage.vue'
import ChangelogPage from '@renderer/components/ChangelogPage.vue'

import Header from '@renderer/components/Header.vue'
import Sidebar from '@renderer/components/Sidebar.vue'

onMounted(() => {
  initAnimations()
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
        <HomePage />
        <ShopPage />
        <SettingsPage />
        <ChangelogPage />
      </main>
    </div>

    <div id="toastContainer" class="toast-container"></div>
  </div>
</template>
