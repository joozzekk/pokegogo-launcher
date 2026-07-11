<script lang="ts" setup>
import { ref } from 'vue'

const modalVisible = ref(false)

const openModal = (): void => {
  modalVisible.value = true
}

const handleExit = (): void => {
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
        <div class="g-card g-modal-card border-red-500/30" style="max-width: 400px">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box bg-red-500/20 text-red-500">
                <i class="fas fa-user-times"></i>
              </div>
              <h3 class="text-red-400">
                Nick jest zajęty
              </h3>
            </div>
            <button class="g-close-btn" @click="handleExit">
              <i class="fa fa-times" />
            </button>
          </div>

          <div class="g-modal-content text-center py-4">
            <p class="text-gray-300 text-sm">
              Twój nick z konta Microsoft jest już używany przez innego gracza na serwerze.
              Twój nick w grze <b>nie został zmieniony automatycznie</b>.
            </p>
          </div>

          <div class="g-modal-footer">
            <button class="g-btn w-full" @click="handleExit">
              Rozumiem
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
</style>
