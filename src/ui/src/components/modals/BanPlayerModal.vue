<script lang="ts" setup>
import { banPlayer, unbanPlayer } from '@ui/api/endpoints'
import { IUser } from '@ui/env'
import useUserStore from '@ui/stores/user-store'
import { UserRole } from '@ui/types/app'
import { defaultDatePickerTime, showToast } from '@ui/utils'
import DatePicker from 'primevue/datepicker'
import { ref } from 'vue'

const modalVisible = ref(false)
const banReasonInput = ref('')
const banType = ref('nickname')
const banTime = ref<Date | null>(null)
const playerData = ref<IUser>()
const actionType = ref<string>('')

const userStore = useUserStore()

const emits = defineEmits<{
  (e: 'refreshData'): Promise<void> | void
}>()

const openModal = async (player: IUser, type: 'unban' | 'ban' = 'ban'): Promise<void> => {
  modalVisible.value = true
  playerData.value = player
  actionType.value = type
}

const banUser = async (): Promise<void> => {
  if (!playerData.value) return

  const res = await banPlayer({
    nickname: playerData.value.nickname,
    machineId: playerData.value.machineId,
    macAddress: playerData.value.macAddress,
    type: banType.value,
    banEndDate: banTime.value as Date,
    reason: banReasonInput.value
  })

  if (res) {
    await emits('refreshData')
    modalVisible.value = false
    showToast('Pomyślnie zbanowano użytkownika ', 'error')
  }
}

const unbanUser = async (): Promise<void> => {
  if (!playerData.value) return

  const res = await unbanPlayer({
    nickname: playerData.value.nickname,
    machineId: playerData.value.machineId,
    macAddress: playerData.value.macAddress,
    type: playerData.value.banType
  })

  if (res) {
    await emits('refreshData')
    showToast('Pomyślnie odbanowano użytkownika')
    handleCancel()
  }
}

const handleCancel = (): void => {
  banReasonInput.value = ''
  banTime.value = null
  banType.value = 'nickname'
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
        <div class="modal-content flex-col">
          <template v-if="actionType === 'ban'">
            <div v-if="userStore.user" class="flex gap-2">
              <button
                v-if="
                  [UserRole.ADMIN, UserRole.DEV, UserRole.MODERATOR].includes(
                    userStore.user.role
                  ) && !!playerData?.machineId
                "
                class="toggle-option !py-[0.25rem]"
                :class="{ active: banType === 'hwid' }"
                @click="banType = 'hwid'"
              >
                HWID
              </button>
              <button
                class="toggle-option !py-[0.25rem]"
                :class="{ active: banType === 'nickname' }"
                @click="banType = 'nickname'"
              >
                Nick
              </button>
            </div>
            <div class="flex gap-2 flex-col">
              <label for="banReason" class="input-label">Czas zakończenia bana</label>
              <DatePicker
                v-model="banTime"
                placeholder="Wybierz datę"
                :pt="defaultDatePickerTime"
                input-class="!w-full"
              />
              <DatePicker
                v-model="banTime"
                placeholder="Wybierz datę"
                :pt="defaultDatePickerTime"
                time-only
                inline
              />
            </div>
            <label for="banReason" class="input-label">Powód bana</label>
            <textarea
              v-model="banReasonInput"
              placeholder="Wpisz powód bana"
              rows="4"
              class="jvm-args !resize-none !outline-none"
            ></textarea>
          </template>
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
  z-index: 900;
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
