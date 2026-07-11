<script lang="ts" setup>
import useUserStore from '@ui/stores/user-store'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const userStore = useUserStore()
const modalVisible = ref(false)

const emits = defineEmits<{
  (e: 'accept'): Promise<void>
}>()

const openModal = (): void => {
  modalVisible.value = true
}

const handleSubmit = async (): Promise<void> => {
  modalVisible.value = false
  localStorage.clear()
  userStore.logout()
  await emits('accept')
}

const closeModal = (): void => {
  modalVisible.value = false
}

defineExpose({
  openModal
})
</script>

<template>
  <Teleport to="#modalsContainer">
    <Transition name="fade">
      <div v-if="modalVisible" class="g-modal-overlay" role="dialog" aria-modal="true">
        <div class="g-card g-modal-card">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box primary">
                <i class="fas fa-cloud-download-alt"></i>
              </div>
              <h3>{{ t('modals.updateConfirm.title') }}</h3>
            </div>
            <button class="g-close-btn" @click="closeModal">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="g-modal-content">
            <p class="text-gray-300 text-center py-4 leading-relaxed">
              {{ t('modals.updateConfirm.desc') }}
            </p>
          </div>

          <div class="g-modal-footer">
            <button class="g-btn" @click="closeModal">
              {{ t('modals.updateConfirm.cancel') }}
            </button>
            <button class="g-btn primary flex-1" @click="handleSubmit">
              <i class="fas fa-sync-alt"></i>
              {{ t('modals.updateConfirm.update') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
