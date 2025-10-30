<script lang="ts" setup>
import useGeneralStore from '@renderer/stores/general-store'
import { ref } from 'vue'

const modalVisible = ref(false)
const isVerifying = ref(false)
const isEnd = ref<boolean>(false)
const currentLog = ref<string>('')
const generalStore = useGeneralStore()

const openModal = (): void => {
  modalVisible.value = true
  window.electron?.ipcRenderer?.on('verify:log', (_, data: string, ended: boolean) => {
    currentLog.value = data

    if (ended) {
      currentLog.value = 'Sprawdzanie zakończone'
      isEnd.value = true
      isVerifying.value = false
    }
  })
}

const cancelVerifying = async (): Promise<void> => {
  if (isVerifying.value) {
    await window.electron?.ipcRenderer?.invoke('launch:exit-verify', 'verify:log')
    isVerifying.value = false
  }
}

const verifyFiles = async (): Promise<void> => {
  await cancelVerifying()

  isVerifying.value = true
  await window.electron?.ipcRenderer?.invoke('launch:check-files', {
    isDev: generalStore.settings.updateChannel === 'dev',
    event: 'verify:log'
  })
}

const handleExit = async (): Promise<void> => {
  await cancelVerifying()

  modalVisible.value = false
  isEnd.value = false
  currentLog.value = ''
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
            <h2>Naprawianie plików...</h2>
          </div>
          <div>
            <button class="nav-icon" @click="handleExit">
              <i class="fa fa-x" />
            </button>
          </div>
        </div>
        <div class="modal-content">
          <p v-if="currentLog.length" class="log-description">
            {{ currentLog }}
          </p>
        </div>
        <button v-if="isEnd" class="btn-primary" @click="handleExit">Zakończ</button>
        <button v-else class="btn-primary" @click="verifyFiles">
          {{ currentLog.length ? 'Przerwij weryfikowanie' : 'Rozpocznij weryfikacje' }}
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
  font-size: 0.8rem;
  width: 100%;
  border-radius: 0.5rem;
  background-color: var(--bg-light);
  padding: 0.25rem 0.5rem;
  text-align: center;
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
