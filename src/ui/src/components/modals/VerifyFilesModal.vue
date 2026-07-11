<script lang="ts" setup>
import useGeneralStore from '@ui/stores/general-store'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const modalVisible = ref(false)
const isVerifying = ref(false)
const isEnd = ref<boolean>(false)
const currentLog = ref<string>('')
const generalStore = useGeneralStore()

// Otwieranie modala
const openModal = (): void => {
  modalVisible.value = true
  isEnd.value = false
  currentLog.value = t('modals.verifyFiles.ready', 'Gotowy do sprawdzania...')

  // Setup listener
  window.electron?.ipcRenderer?.on('verify:log', (_, data: string, ended: boolean) => {
    if (ended) {
      setTimeout(() => {
        currentLog.value = t('modals.verifyFiles.checkEnded', 'Sprawdzanie zakończone pomyślnie.')
        isVerifying.value = false
        isEnd.value = true
      }, 250)
      return
    }
    currentLog.value = data
    isVerifying.value = true
  })
}

const verifyFiles = async (): Promise<void> => {
  isVerifying.value = true
  currentLog.value = t('modals.verifyFiles.starting', 'Inicjalizacja...')

  await window.electron?.ipcRenderer?.invoke(
    'launch:remove-markfile',
    generalStore.settings.gameMode
  )
  const removeFilesRes = await window.electron?.ipcRenderer?.invoke(
    'launch:remove-mcfiles',
    generalStore.settings.gameMode
  )

  if (removeFilesRes === false) {
    currentLog.value = t(
      'modals.verifyFiles.deleteError',
      'Błąd: Nie można usunąć plików. Wyłącz grę.'
    )
    isVerifying.value = false
    isEnd.value = true
    return
  }

  await window.electron?.ipcRenderer?.invoke('launch:check-files', {
    isDev: generalStore.settings.updateChannel === 'dev',
    gameMode: generalStore.settings.gameMode,
    event: 'verify:log'
  })
}

const handleExit = async (): Promise<void> => {
  if (isVerifying.value) return

  // Remove listener to prevent memory leaks or duplicate listeners
  window.electron?.ipcRenderer?.removeAllListeners('verify:log')
  modalVisible.value = false
  isVerifying.value = false
}

defineExpose({
  openModal
})
</script>

<template>
  <Teleport to="#modalsContainer">
    <Transition name="fade">
      <div v-if="modalVisible" class="g-modal-overlay" role="dialog" aria-modal="true">
        <div class="g-card g-modal-card terminal-theme">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box">
                <i class="fas fa-terminal"></i>
              </div>
              <h3>{{ t('modals.verifyFiles.title') }}</h3>
            </div>
            <button v-if="!isVerifying && !isEnd" class="g-close-btn" @click="handleExit">
              <i class="fa fa-times" />
            </button>
          </div>

          <div class="g-modal-content">
            <div class="terminal-window">
              <div class="terminal-bar">
                <div class="dots">
                  <span class="dot red"></span>
                  <span class="dot yellow"></span>
                  <span class="dot green"></span>
                </div>
                <span class="terminal-title">system_integrity_check.exe</span>
              </div>
              <div class="terminal-body custom-scrollbar">
                <div class="log-line">
                  <span class="prompt">root@launcher:~$</span>
                  <span class="cmd">verify-integrity --force</span>
                </div>
                <div class="log-line">
                  <span class="msg" :class="{ 'text-green-400': isEnd }">{{ currentLog }}</span>
                  <span v-if="isVerifying" class="cursor">_</span>
                </div>
              </div>
            </div>

            <p class="description text-sm text-gray-400 mt-2">
              {{ t('modals.verifyFiles.warning') }}
            </p>
          </div>

          <div class="g-modal-footer">
            <button v-if="isEnd" class="g-btn primary w-full" @click="handleExit">
              <i class="fa fa-check"></i>
              {{ t('modals.verifyFiles.finish') }}
            </button>

            <button
              v-else-if="isVerifying"
              class="g-btn primary w-full opacity-50 cursor-not-allowed"
              disabled
            >
              <i class="fa fa-spinner fa-spin"></i>
              {{ t('modals.verifyFiles.verifying') }}
            </button>

            <button v-else class="g-btn primary w-full" @click="verifyFiles">
              <i class="fa fa-play"></i>
              {{ t('modals.verifyFiles.start') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Terminal Theme Override */
.terminal-window {
  background: #0d1117;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.terminal-bar {
  background: #161b22;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.red {
  background: #ef4444;
}
.dot.yellow {
  background: #fbbf24;
}
.dot.green {
  background: #10b981;
}

.terminal-title {
  width: 100%;
  text-align: center;
  font-size: 0.75rem;
  color: #8b949e;
  margin-right: 40px; /* Balance dots */
}

.terminal-body {
  padding: 1rem;
  height: 180px;
  overflow-y: auto;
  font-size: 0.85rem;
  color: #c9d1d9;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-line {
  display: flex;
  gap: 8px;
  line-height: 1.5;
  width: 100%;
}

.prompt {
  color: #7ee787; /* Green */
  font-weight: bold;
  flex-shrink: 0;
}

.cmd {
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msg {
  color: #8b949e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Cursor Animation */
.cursor {
  display: inline-block;
  width: 8px;
  height: 1.2em;
  background: #c9d1d9;
  animation: blink 1s step-end infinite;
  vertical-align: middle;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
