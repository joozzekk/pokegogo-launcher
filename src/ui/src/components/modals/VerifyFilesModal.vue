<script lang="ts" setup>
import useGeneralStore from '@ui/stores/general-store'
import { ref } from 'vue'

const modalVisible = ref(false)
const isVerifying = ref(false)
const isEnd = ref<boolean>(false)
const currentLog = ref<string>('')
const generalStore = useGeneralStore()

const openModal = (): void => {
  modalVisible.value = true
  isEnd.value = false
  currentLog.value = ''
  window.electron?.ipcRenderer?.on('verify:log', (_, data: string, ended: boolean) => {
    if (ended) {
      setTimeout(() => {
        currentLog.value = 'Sprawdzanie zakończone'
        isVerifying.value = false
        isEnd.value = true
      }, 250)
      return
    }
    currentLog.value = data
    isVerifying.value = true
  })
}

const cancelVerifying = async (): Promise<void> => {
  await window.electron?.ipcRenderer?.invoke('launch:exit-verify', 'verify:log')
}

const verifyFiles = async (): Promise<void> => {
  isVerifying.value = true
  await window.electron?.ipcRenderer?.invoke(
    'launch:remove-markfile',
    generalStore.settings.gameMode
  )
  await window.electron?.ipcRenderer?.invoke(
    'launch:remove-mcfiles',
    generalStore.settings.gameMode
  )
  await window.electron?.ipcRenderer?.invoke('launch:check-files', {
    isDev: generalStore.settings.updateChannel === 'dev',
    gameMode: generalStore.settings.gameMode,
    event: 'verify:log'
  })
}

const handleExit = async (): Promise<void> => {
  await cancelVerifying()
  modalVisible.value = false
  isVerifying.value = false
}

defineExpose({
  openModal
})
</script>

<template>
  <Teleport to="#modalsContainer">
    <div
      v-if="modalVisible"
      class="modal-container"
      role="alert"
      aria-modal="true"
      aria-labelledby="ban-title"
      aria-describedby="ban-desc"
    >
      <div class="modal-card">
        <div class="modal-header flex justify-between">
          <div class="launch-title">
            <div class="nav-icon">
              <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
            </div>
            <h2>Naprawianie plików</h2>
          </div>
          <div>
            <button class="nav-icon" @click="handleExit">
              <i class="fa fa-x" />
            </button>
          </div>
        </div>
        <div class="modal-content">
          <p class="text-[var(--text-secondary)] mb-4">
            Pamiętaj, aby nie zamykać launchera podczas weryfikacji plików.
          </p>

          <p v-if="currentLog.length" class="log-description">
            {{ currentLog }}
          </p>
        </div>
        <button v-if="isEnd" class="btn-primary" @click="handleExit">Zakończ</button>
        <button v-else class="btn-primary" @click="isVerifying ? cancelVerifying() : verifyFiles()">
          {{ isVerifying ? 'Przerwij weryfikowanie' : 'Rozpocznij weryfikacje' }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.75);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.modal-card {
  width: 90%;
  max-width: 420px;
  padding: 1.5rem 2rem 1.25rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 1rem var(--border-2);
  background: var(--bg-card);
  border-radius: 1rem;
  border: 1px dashed var(--border-2);
  backdrop-filter: blur(10px);
}

.modal-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.launch-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-weight: 700;
  font-size: 1rem;
  color: var(--primary);
}

.nav-icon {
  width: 36px;
  height: 36px;
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  flex: 1;
}

.log-description {
  font-size: 0.7rem;
  width: 100%;
  min-height: 7vh;
  border-radius: 0.5rem;
  background-color: var(--bg-light);
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
  text-align: center;
  justify-content: center;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.ban-reason {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary);
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
}
</style>
