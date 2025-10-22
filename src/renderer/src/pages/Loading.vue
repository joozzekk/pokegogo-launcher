<script lang="ts" setup>
import logo from '@renderer/assets/logo.png'
import { ref, onMounted } from 'vue'
import dynia from '@renderer/assets/img/dynia.png'
import ghost from '@renderer/assets/img/ghost.png'
import { applyTheme, halloween } from '@renderer/assets/theme/official'

const status = ref<string>('Inicjalizowanie..')
const progress = ref(0)

const statuses = {
  'check-for-update': 'Sprawdzanie aktualizacji..',
  updating: 'Aktualizowanie..',
  starting: 'Uruchamianie..',
  'app-started': 'Witamy!'
}

onMounted(() => {
  applyTheme(
    localStorage.getItem('selectedTheme')
      ? JSON.parse(localStorage.getItem('selectedTheme')!)
      : halloween
  )

  window.electron?.ipcRenderer?.on('load:status', (_, currentStatus: string) => {
    let val = 0
    const parsedStatus = JSON.parse(currentStatus)

    switch (parsedStatus) {
      case 'check-for-update':
        val = 10
        break
      case 'updating':
        val = 45
        break
      case 'starting':
        val = 80
        break
      case 'app-started':
        val = 100
        break
    }
    status.value = statuses[parsedStatus]
    progress.value = val
  })
})
</script>

<template>
  <div class="container">
    <div class="background">
      <div class="bg-gradient"></div>
      <div class="floating-blocks">
        <img :src="dynia" class="block-1" @dragstart.prevent="null" />
        <img :src="dynia" class="block-2" @dragstart.prevent="null" />
        <img :src="dynia" class="block-3" @dragstart.prevent="null" />
        <img :src="ghost" class="ghost-1" @dragstart.prevent="null" />
        <img :src="ghost" class="ghost-2" @dragstart.prevent="null" />
        <img :src="ghost" class="ghost-3" @dragstart.prevent="null" />
      </div>
    </div>
    <div class="loading-container">
      <div class="logo-container">
        <div class="logo">
          <img :src="logo" width="70%" />
        </div>
      </div>
      <div id="loadingText" class="loading-text">{{ status }}</div>
      <div class="progress-container">
        <div id="progressBar" class="progress-bar" :style="{ width: progress + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.logo-container {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--primary), var(--primary));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  box-shadow: 0 8px 24px var(--border);
  animation: pulse 2s ease-in-out infinite;
  overflow: hidden;
}

.logo {
  font-size: 36px;
  color: #fff;
  user-select: none;
}

.loading-text {
  font-size: 16px;
  font-weight: 500;
  color: #b9bbbe;
  margin-bottom: 24px;
  min-height: 20px;
  opacity: 1;
  transition:
    opacity 0.3s ease-in-out,
    transform 0.3s ease-in-out;
}

.progress-container {
  max-width: 320px;
  height: 8px;
  background-color: black;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  display: flex;
}

.progress-bar {
  width: 0%;
  transition: width 0.8s ease-out;
  height: 100%;
  background-color: var(--primary);
  border-radius: 4px;
  box-shadow: 0 0 8px var(--border);
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
    box-shadow: 0 0 32px var(--border);
  }
}

@media (max-width: 480px) {
  .logo-container {
    width: 64px;
    height: 64px;
    margin-bottom: 24px;
  }

  .logo {
    font-size: 28px;
  }

  .loading-text {
    font-size: 14px;
  }

  .progress-container {
    width: 70vw;
    max-width: 280px;
  }
}

.background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.bg-gradient {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, var(--border) 0%, var(--bg-primary) 100%);
  animation: gradientShift 10s ease-in-out infinite alternate;
}

.floating-blocks {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.block-1 {
  position: absolute;
  width: 90px;
  height: 90px;
  top: 20%;
  left: 10%;
  animation: float 20s linear infinite;
  opacity: 0.3;
}

.block-2 {
  position: absolute;
  width: 60px;
  height: 60px;
  top: 60%;
  left: 80%;
  animation: float 18s linear infinite;
  animation-delay: -8s;
  opacity: 0.3;
}

.block-3 {
  animation: float 22s linear infinite;
  position: absolute;
  width: 30px;
  height: 30px;
  top: 80%;
  left: 20%;
  animation-delay: -15s;
  opacity: 0.3;
}

.ghost-1 {
  animation: sway 3s ease-in-out infinite;
  width: 100px;
  position: absolute;
  top: 15%;
  left: 60%;
  opacity: 0.1;
}

.ghost-2 {
  animation: sway 2s ease-in-out infinite;
  width: 80px;
  position: absolute;
  top: 70%;
  left: 50%;
  opacity: 0.1;
}

.ghost-3 {
  animation: sway 4s ease-in-out infinite;
  width: 40px;
  position: absolute;
  top: 50%;
  left: 10%;
  opacity: 0.1;
}

@keyframes sway {
  0% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-8px);
  }
  50% {
    transform: translateX(0);
  }
  75% {
    transform: translateX(8px);
  }
  100% {
    transform: translateX(0);
  }
}

@keyframes float {
  0% {
    transform: translateY(0px) rotate(0deg);
  }

  25% {
    transform: translateY(-20px) rotate(90deg);
  }

  50% {
    transform: translateY(-10px) rotate(180deg);
  }

  75% {
    transform: translateY(-30px) rotate(270deg);
  }

  100% {
    transform: translateY(0px) rotate(360deg);
  }
}
</style>
