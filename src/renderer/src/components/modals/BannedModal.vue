<script lang="ts" setup>
import useUserStore from '@renderer/stores/user-store'
import { computed, ref } from 'vue'

const modalVisible = ref(true)
const userStore = useUserStore()

const isBanned = computed(() => {
  return userStore.user?.isBanned
})

// Przyjmuję, że userStore.user?.banReason przechowuje powód bana
const banReason = computed(() => userStore.user?.banReason || 'Brak szczegółowego powodu.')

const acknowledgeBan = (): void => {
  modalVisible.value = false
}
</script>

<template>
  <div
    v-if="isBanned && modalVisible"
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
          <h2 id="ban-title">Zostałeś zbanowany</h2>
        </div>
      </div>
      <div class="modal-content">
        <p class="ban-description">
          Twoje konto zostało zablokowane. Szczegóły dotyczące powodu blokady poniżej:
        </p>
        <p class="ban-reason">{{ banReason }}</p>
      </div>
      <button
        type="button"
        class="btn-primary"
        aria-label="Rozumiem i zamykam informację o banie"
        @click="acknowledgeBan"
      >
        Rozumiem
      </button>
    </div>
  </div>
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
  font-size: 1rem;
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
