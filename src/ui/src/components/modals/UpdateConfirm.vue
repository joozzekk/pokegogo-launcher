<script lang="ts" setup>
import useUserStore from '@ui/stores/user-store'
import { ref } from 'vue'

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
            <h2 id="ban-title">Aktualizacja launchera</h2>
          </div>
        </div>
        <div class="modal-content">
          <p class="ban-description">
            Czy napewno chcesz aktualizować launcher? Spowoduje to wyłączenie minecrafta oraz
            wylogowanie z konta.
          </p>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn-primary" @click="handleSubmit">Aktualizuj</button>
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

.modal-card {
  width: 90%;
  max-width: 420px;
  min-height: 220px;
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
  margin-bottom: 1.5rem;
}

.ban-description {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}
</style>
