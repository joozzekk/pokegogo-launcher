<script lang="ts" setup>
import { resetPassword } from '@renderer/api/endpoints'
import { IUser } from '@renderer/env'
import { reactive, ref } from 'vue'

const modalVisible = ref(false)
const state = reactive({
  nickname: '',
  generatedPass: ''
})

const openModal = (player: IUser): void => {
  modalVisible.value = true

  state.nickname = player.nickname
}

const handleSubmit = async (): Promise<void> => {
  if (state.generatedPass.length) {
    closeModal()
    return
  }

  if (!state.nickname) return

  const res = await resetPassword(state.nickname)

  if (res) {
    state.generatedPass = res.generatedPass
  }
}

const copyToClipboard = (text: string): void => {
  navigator.clipboard.writeText(text)
}

const closeModal = (): void => {
  state.nickname = ''
  state.generatedPass = ''
  modalVisible.value = false
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
        <div class="modal-header">
          <div class="launch-title">
            <div class="nav-icon">
              <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
            </div>
            <h2 id="ban-title">Reset hasła</h2>
          </div>
        </div>
        <div class="modal-content">
          <p v-if="!state.generatedPass" class="ban-description">
            Czy napewno chcesz zresetować hasło użytkownika {{ state.nickname }}?
          </p>
          <p v-else class="ban-description">
            Wygenerowane hasło: {{ state.generatedPass }}
            <span class="copy-btn" @click="copyToClipboard(state.generatedPass)">
              <i class="fa fa-copy" />
            </span>
          </p>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn-primary" @click="handleSubmit">
            {{ state.generatedPass.length ? 'OK' : 'Zresetuj' }}
          </button>
          <button type="button" class="btn-secondary" @click="closeModal">Anuluj</button>
        </div>
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

.copy-btn {
  margin-left: 0.4rem;
  font-size: 0.7rem;
  padding: 0.2rem 0.3rem;
  border-radius: 0.3rem;
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.4);
}

.copy-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  color: rgba(255, 255, 255, 0.2);
}

.modal-card {
  width: 90%;
  max-width: 420px;
  min-height: 200px;
  background: rgba(16, 14, 10, 0.95);
  box-shadow: 0 0 1rem rgba(51, 48, 35, 0.568);
  border-radius: 1rem;
  padding: 1.5rem 2rem 1.25rem;
  display: flex;
  flex-direction: column;
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
  font-size: 1.4rem;
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

.ban-description {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
</style>
