<script lang="ts" setup>
import { themes } from '@ui/assets/theme/themes'
import useGeneralStore from '@ui/stores/general-store'
// UWAGA: Jeśli to mają być emotikony domyślne, upewnij się, że te importy
// zwracają stringa z emotikoną (np. "❄️"), a nie ścieżkę do pliku PNG.
// Jeśli importujesz PNG, musisz tutaj przypisać stringa ręcznie, np.:
const defaultFirstFloating = '❄️'
const defaultSecondFloating = '✨'
import background from '@ui/assets/img/choinka.png'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const generalStore = useGeneralStore()

const isTabActive = ref(!document.hidden)

const handleVisibilityChange = (): void => {
  isTabActive.value = !document.hidden
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

const bgImage = computed(() => {
  return generalStore.getTheme() === 'custom'
    ? generalStore.settings.customTheme?.backgroundImage
    : (themes.find((theme) => theme.name === generalStore.getTheme())?.backgroundImage ??
        background)
})

const firstFloatingBlock = computed(() => {
  return generalStore.getTheme() === 'custom'
    ? generalStore.settings.customTheme?.firstFloating
    : (themes.find((theme) => theme.name === generalStore.getTheme())?.firstFloating ??
        defaultFirstFloating)
})

const secondFloatingBlock = computed(() => {
  return generalStore.getTheme() === 'custom'
    ? generalStore.settings.customTheme?.secondFloating
    : (themes.find((theme) => theme.name === generalStore.getTheme())?.secondFloating ??
        defaultSecondFloating)
})
</script>

<template>
  <div class="fixed inset-0 w-full h-full overflow-hidden -z-50 bg-[#141419]">
    <div class="absolute inset-0 z-0">
      <transition name="fade">
        <img
          :key="bgImage"
          :src="bgImage"
          alt="background"
          class="w-full h-full object-cover opacity-60"
          @dragstart.prevent
        />
      </transition>
    </div>

    <div class="absolute inset-0 z-10 bg-radial-gradient pointer-events-none"></div>

    <div
      class="absolute inset-0 z-20 pointer-events-none overflow-hidden select-none"
      :class="{ paused: !isTabActive }"
    >
      <div class="floating-item item-1">{{ firstFloatingBlock }}</div>
      <div class="floating-item item-2">{{ firstFloatingBlock }}</div>
      <div class="floating-item item-3">{{ firstFloatingBlock }}</div>

      <div class="floating-item item-4">{{ secondFloatingBlock }}</div>
      <div class="floating-item item-5">{{ secondFloatingBlock }}</div>
      <div class="floating-item item-6">{{ secondFloatingBlock }}</div>
    </div>
  </div>
</template>

<style scoped>
.bg-radial-gradient {
  background: radial-gradient(
    circle at center,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.4) 60%,
    rgba(0, 0, 0, 0.8) 100%
  );
  backdrop-filter: blur(2px);
}

/* Animacje */
@keyframes float {
  0% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(10deg);
  }
  100% {
    transform: translateY(0px) rotate(0deg);
  }
}

@keyframes drift {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  50% {
    transform: translate(40px, -40px) rotate(15deg);
  }
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
}

.floating-item {
  position: absolute;
  color: rgba(255, 255, 255, 0.7); /* Kolor tekstu/ikony */
  font-size: 2rem; /* Domyślny rozmiar ikonki */
  font-weight: bold;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5); /* Cień dla lepszej widoczności */
  animation: float 6s ease-in-out infinite;
  user-select: none; /* Blokada zaznaczania tekstu */
  cursor: default;
  line-height: 1;
}

/* Pozycje i specyficzne style dla każdej ikonki */
.item-1 {
  top: 15%;
  left: 10%;
  font-size: 3rem; /* Większa */
  animation: drift 18s ease-in-out infinite;
  opacity: 0.6;
  filter: blur(1px); /* Efekt głębi */
}

.item-2 {
  top: 60%;
  left: 85%;
  font-size: 2.5rem;
  animation: float 8s ease-in-out infinite;
  animation-delay: 1s;
  opacity: 0.8;
}

.item-3 {
  top: 85%;
  left: 20%;
  font-size: 1.5rem; /* Mniejsza */
  animation: float 7s ease-in-out infinite;
  animation-delay: 2s;
  opacity: 0.5;
}

.item-4 {
  top: 10%;
  left: 80%;
  font-size: 2rem;
  animation: drift 22s ease-in-out infinite reverse;
  animation-delay: 0.5s;
  opacity: 0.6;
}

.item-5 {
  top: 45%;
  left: 5%;
  font-size: 1.8rem;
  animation: float 9s ease-in-out infinite;
  animation-delay: 3s;
  opacity: 0.4;
  filter: blur(2px);
}

.item-6 {
  bottom: 20%;
  right: 15%;
  font-size: 3.5rem; /* Bardzo duża */
  animation: float 10s ease-in-out infinite;
  animation-delay: 1.5s;
  opacity: 0.7;
}

/* Pauza animacji */
.paused .floating-item {
  animation-play-state: paused;
}

/* Przejścia tła */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
