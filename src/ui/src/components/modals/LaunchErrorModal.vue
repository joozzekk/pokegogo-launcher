<script lang="ts" setup>
import { ref } from 'vue'
import { showToast } from '@ui/utils'

const modalVisible = ref(false)
const errorType = ref<string>('')
const errorDetails = ref<any>(null)

// Otwieranie modala
const openModal = (type: string, details?: any): void => {
  errorType.value = type
  errorDetails.value = details
  modalVisible.value = true
}

const handleExit = (): void => {
  modalVisible.value = false
}

const openLogs = async (): Promise<void> => {
  handleExit()
  await window.electron?.ipcRenderer?.invoke('logs:open-game', 'pokemons') // fallback to pokemons or main
}

const copyError = async (): Promise<void> => {
  const dataToCopy = JSON.stringify({
    type: errorType.value,
    details: errorDetails.value
  }, null, 2)
  try {
    await navigator.clipboard.writeText(dataToCopy)
    showToast('Skopiowano do schowka!')
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

defineExpose({
  openModal
})
</script>

<template>
  <Teleport to="#modalsContainer">
    <Transition name="fade">
      <div v-if="modalVisible" class="g-modal-overlay" role="dialog" aria-modal="true">
        <div class="g-card g-modal-card border-red-500/30">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box bg-red-500/20 text-red-500">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <h3 class="text-red-400">
                Wystąpił problem
              </h3>
            </div>
            <button class="g-close-btn" @click="handleExit">
              <i class="fa fa-times" />
            </button>
          </div>

          <div class="g-modal-content scrollable-content custom-scrollbar">
            <div class="flex flex-col gap-4 text-center items-center py-4">
              
              <!-- DISK SPACE ERROR -->
              <template v-if="errorType === 'DISK_SPACE'">
                <i class="fas fa-hdd text-5xl text-red-500/80 mb-2"></i>
                <h4 class="text-lg font-bold text-white">Brak miejsca na dysku</h4>
                <p class="text-gray-300 text-sm max-w-sm">
                  Pobieranie plików gry zostało przerwane, ponieważ na Twoim dysku brakuje miejsca.
                </p>
                <div class="bg-black/30 rounded-lg p-3 w-full border border-white/5 mt-2">
                  <p class="text-xs text-gray-400">Wymagane miejsce:</p>
                  <p class="text-sm font-bold text-white">{{ errorDetails?.requiredGB }} GB</p>
                  <p class="text-xs text-gray-400 mt-2">Dostępne miejsce:</p>
                  <p class="text-sm font-bold text-red-400">{{ errorDetails?.freeGB }} GB</p>
                </div>
                <p class="text-sm text-gray-400 mt-2">
                  Zwolnij miejsce na dysku i spróbuj ponownie uruchomić grę.
                </p>
              </template>

              <!-- RAM ERROR -->
              <template v-else-if="errorType === 'RAM_ERROR'">
                <i class="fas fa-memory text-5xl text-yellow-500/80 mb-2"></i>
                <h4 class="text-lg font-bold text-white">Problem z pamięcią RAM</h4>
                <p class="text-gray-300 text-sm max-w-sm">
                  Minecraft nie mógł się uruchomić, ponieważ system nie ma wystarczająco wolnej pamięci RAM.
                </p>
                <div class="bg-black/30 rounded-lg p-3 w-full border border-white/5 mt-2">
                  <ul class="text-sm text-left text-gray-300 list-disc list-inside">
                    <li>Zamknij inne zasobożerne programy (np. przeglądarkę).</li>
                    <li>Zmniejsz ilość przypisanego RAM-u w Ustawieniach launchera.</li>
                  </ul>
                </div>
              </template>

              <!-- GAME CRASH -->
              <template v-else-if="errorType === 'GAME_CRASH'">
                <i class="fas fa-skull-crossbones text-5xl text-red-500/80 mb-2"></i>
                <h4 class="text-lg font-bold text-white">Gra niespodziewanie zakończyła działanie</h4>
                <p class="text-gray-300 text-sm max-w-sm">
                  Minecraft uległ awarii podczas uruchamiania lub w trakcie gry.
                </p>
                <div v-if="errorDetails?.code" class="bg-black/30 rounded-lg p-3 w-full border border-white/5 mt-2">
                  <p class="text-xs text-gray-400">Kod błędu (Exit code):</p>
                  <p class="text-sm font-mono text-red-400 mt-1">{{ errorDetails.code }}</p>
                </div>
                <p class="text-sm text-gray-400 mt-2">
                  Sprawdź logi gry w celu poznania szczegółów lub skontaktuj się z administracją.
                </p>
              </template>

              <!-- DEFAULT ERROR -->
              <template v-else>
                <i class="fas fa-bug text-5xl text-red-500/80 mb-2"></i>
                <h4 class="text-lg font-bold text-white">Nieznany błąd</h4>
                <p class="text-gray-300 text-sm max-w-sm">
                  Wystąpił niespodziewany problem z uruchomieniem gry.
                </p>
                <p v-if="errorDetails?.message" class="text-xs font-mono text-red-400 mt-2 break-all bg-black/30 p-2 rounded w-full">
                  {{ errorDetails.message }}
                </p>
              </template>

            </div>
          </div>

          <div class="g-modal-footer flex gap-3">
            <button class="g-btn w-full" @click="handleExit">
              Zamknij
            </button>
            <button class="g-btn w-full" @click="copyError">
              <i class="fas fa-copy"></i> Kopiuj
            </button>
            <button v-if="errorType === 'GAME_CRASH'" class="g-btn primary w-full" @click="openLogs">
              <i class="fas fa-file-alt"></i> Pokaż logi
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scrollable-content {
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
