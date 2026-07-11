<script lang="ts" setup>
import { ref } from 'vue'
import { IUser } from '@ui/env'
import { removeUser } from '@ui/api/endpoints'
import { showToast } from '@ui/utils'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const modalVisible = ref(false)
const player = ref<IUser | null>(null)
const isSubmitting = ref(false)

const emit = defineEmits<{
  (e: 'refresh-data'): void
}>()

const openModal = (targetPlayer: IUser): void => {
  player.value = targetPlayer
  modalVisible.value = true
}

const closeModal = (): void => {
  if (isSubmitting.value) return
  modalVisible.value = false
  player.value = null
}

const confirmDelete = async (): Promise<void> => {
  if (!player.value || isSubmitting.value) return

  isSubmitting.value = true
  try {
    const res = await removeUser(player.value.uuid)
    if (res) {
      showToast(t('modals.userProfile.accountDeleted'), 'success')
      emit('refresh-data')
      closeModal()
    }
  } catch (err) {
    console.error('Delete account error:', err)
    showToast(t('modals.userProfile.accountDeleteFailed'), 'error')
  } finally {
    isSubmitting.value = false
  }
}

defineExpose({
  openModal
})
</script>

<template>
  <Teleport to="#modalsContainer">
    <Transition name="fade">
      <div
        v-if="modalVisible"
        class="g-modal-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="closeModal"
      >
        <div class="g-modal-content confirm-modal">
          <div class="modal-header">
            <h3>{{ t('modals.userProfile.deleteAccount') }}</h3>
            <button class="close-btn" :disabled="isSubmitting" @click="closeModal">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <p v-if="player">
              {{ t('modals.userProfile.confirmDeleteAccount', { name: player.nickname }) }}
            </p>
          </div>

          <div class="modal-footer">
            <button class="g-btn secondary" :disabled="isSubmitting" @click="closeModal">
              {{ t('common.cancel') }}
            </button>
            <button class="g-btn danger" :disabled="isSubmitting" @click="confirmDelete">
              <i v-if="isSubmitting" class="fas fa-spinner fa-spin"></i>
              {{ t('common.delete') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-modal {
  max-width: 400px;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  color: #ff4d4d;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 5px;
  transition: color 0.2s;
}

.close-btn:hover:not(:disabled) {
  color: #fff;
}

.modal-body {
  margin-bottom: 25px;
}

.modal-body p {
  line-height: 1.5;
  color: #ccc;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.g-btn.danger {
  background: #ff4d4d;
  color: white;
}

.g-btn.danger:hover:not(:disabled) {
  background: #ff3333;
  box-shadow: 0 0 15px rgba(255, 77, 77, 0.4);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
