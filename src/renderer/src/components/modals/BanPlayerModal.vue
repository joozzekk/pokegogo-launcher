<script lang="ts" setup>
import { banPlayer, unbanPlayer } from '@renderer/api/endpoints'
import { IUser } from '@renderer/env'
import { showToast } from '@renderer/utils'
import { ref } from 'vue'

const modalVisible = ref(false)
const banReasonInput = ref('')
const playerData = ref<any>()
const actionType = ref<string>('')

const emits = defineEmits<{
  (e: 'refreshData'): Promise<void> | void
}>()

const openModal = async (player: IUser, type: 'unban' | 'ban' = 'ban'): Promise<void> => {
  modalVisible.value = true
  playerData.value = player
  actionType.value = type
}

const banUser = async (): Promise<void> => {
  const res = await banPlayer({
    nickname: playerData.value.nickname,
    machineId: playerData.value.machineId,
    macAddress: playerData.value.macAddress,
    reason: banReasonInput.value
  })

  if (res) {
    await emits('refreshData')
    modalVisible.value = false
    showToast('Pomyślnie zbanowano użytkownika ', 'error')
  }
}

const unbanUser = async (): Promise<void> => {
  const res = await unbanPlayer({
    nickname: playerData.value.nickname,
    machineId: playerData.value.machineId,
    macAddress: playerData.value.macAddress
  })

  if (res) {
    await emits('refreshData')
    showToast('Pomyślnie odbanowano użytkownika ')
    modalVisible.value = false
  }
}

const handleCancel = (): void => {
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="ban-title"
    >
      <div class="modal-card">
        <div class="modal-header">
          <div class="launch-title">
            <div class="nav-icon">
              <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
            </div>
            <h2 id="ban-title">{{ actionType === 'ban' ? 'Zbanuj' : 'Odbanuj' }} gracza</h2>
          </div>
        </div>
        <div v-if="actionType === 'ban'" class="modal-content">
          <label for="banReason" class="input-label">Powód bana</label>
          <textarea
            id="banReason"
            v-model="banReasonInput"
            placeholder="Wpisz powód bana"
            rows="4"
            class="jvm-args"
            aria-required="true"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn-primary"
            :disabled="actionType === 'ban' && !banReasonInput"
            aria-label="Zbanuj gracza"
            @click="actionType === 'ban' ? banUser() : unbanUser()"
          >
            {{ actionType === 'ban' ? 'Zbanuj' : 'Odbanuj' }}
          </button>
          <button type="button" class="btn-secondary" @click="handleCancel">Anuluj</button>
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

.modal-card {
  width: 90%;
  max-width: 420px;
  background: rgba(10, 12, 16, 0.95);
  border-radius: 1rem;
  padding: 1.5rem 2rem 1.25rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 1rem rgba(34, 145, 197, 0.2);
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
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.input-label {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-secondary);
}

.input-field,
.textarea-field {
  background: rgba(30, 35, 45, 0.85);
  border-radius: 0.5rem;
  border: none;
  color: white;
  padding: 0.5rem;
  font-size: 1rem;
  resize: vertical;
}

.input-field::placeholder,
.textarea-field::placeholder {
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn-primary {
  background-color: var(--primary);
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1.25rem;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--primary);
  border-radius: 0.5rem;
  padding: 0.5rem 1.25rem;
  color: var(--primary);
  font-weight: 700;
  cursor: pointer;
}
</style>
