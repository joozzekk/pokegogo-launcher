<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSocketService } from '@ui/services/socket-service'
import { showToast } from '@ui/utils'
import useUserStore from '@ui/stores/user-store'
import { UserRole } from '@ui/types/app'

const { t } = useI18n()
const { emit: emitSocket } = useSocketService()
const userStore = useUserStore()
const router = useRouter()

onMounted(() => {
  if (userStore.user?.role?.toLowerCase() !== UserRole.DEV && userStore.user?.role?.toLowerCase() !== UserRole.DEV_EN && userStore.user?.role?.toLowerCase() !== UserRole.OWNER) {
    router.push('/app/home')
  }
})

const showConfirmModal = ref(false)
const isProcessing = ref(false)

const handleKillAllGames = (): void => {
  if (userStore.user?.role?.toLowerCase() !== UserRole.DEV && userStore.user?.role?.toLowerCase() !== UserRole.DEV_EN && userStore.user?.role?.toLowerCase() !== UserRole.OWNER) {
    showToast(t('general.error'), 'error')
    return
  }

  isProcessing.value = true
  try {
    emitSocket('admin:kill-all-games', {})
    showToast(t('gameControl.successToast'), 'success')
    showConfirmModal.value = false
  } catch {
    showToast(t('gameControl.errorToast'), 'error')
  } finally {
    isProcessing.value = false
  }
}

const showReinstallModal = ref(false)
const isProcessingReinstall = ref(false)

const handleForceReinstallAll = (): void => {
  if (
    userStore.user?.role?.toLowerCase() !== UserRole.DEV && userStore.user?.role?.toLowerCase() !== UserRole.DEV_EN &&
    userStore.user?.role?.toLowerCase() !== UserRole.OWNER &&
    userStore.user?.role?.toLowerCase() !== 'technik'
  ) {
    showToast(t('general.error'), 'error')
    return
  }

  isProcessingReinstall.value = true
  try {
    emitSocket('admin:force-reinstall-all', {})
    showToast('Wymuszono reinstalację u wszystkich graczy', 'success')
    showReinstallModal.value = false
  } catch {
    showToast(t('gameControl.errorToast'), 'error')
  } finally {
    isProcessingReinstall.value = false
  }
}
</script>

<template>
  <div class="game-control-page">
    <div class="page-header animate-fade-in">
      <h1 class="page-title">
        <i class="fas fa-gamepad mr-3"></i>
        {{ t('gameControl.title') }}
      </h1>
      <p class="page-subtitle">{{ t('gameControl.description') }}</p>
    </div>

    <div class="control-card animate-fade-in-up">
      <div class="card-content">
        <div class="warning-icon-wrapper">
          <i class="fas fa-exclamation-triangle warning-icon"></i>
        </div>

        <h2 class="warning-title">{{ t('gameControl.warning') }}</h2>

        <div class="actions">
          <button
            class="kill-btn primary-btn btn-glow"
            :disabled="isProcessing"
            @click="showConfirmModal = true"
          >
            <i class="fas fa-power-off mr-2"></i>
            {{ t('gameControl.actionButton') }}
          </button>

          <button
            class="reinstall-btn btn-glow mt-4"
            :disabled="isProcessingReinstall"
            @click="showReinstallModal = true"
          >
            <i class="fas fa-download mr-2"></i>
            Wymuś Reinstalację (Wszystkim)
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
        <div class="modal-container animate-fade-in">
          <div class="modal-header">
            <h3>{{ t('gameControl.confirmTitle') }}</h3>
            <button class="close-btn" @click="showConfirmModal = false">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="modal-alert">
              <i class="fas fa-triangle-exclamation mr-3 text-red"></i>
              <span>{{ t('gameControl.warning') }}</span>
            </div>
            <p class="modal-info-text text-muted text-sm mt-4">
              {{ t('gameControl.description') }}
            </p>
          </div>

          <div class="modal-footer">
            <button
              class="btn-secondary"
              :disabled="isProcessing"
              @click="showConfirmModal = false"
            >
              {{ t('general.abort') }}
            </button>
            <button
              class="btn-danger btn-glow"
              :disabled="isProcessing"
              @click="handleKillAllGames"
            >
              <span v-if="isProcessing" class="spinner mr-2"></span>
              {{ t('gameControl.actionButton') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Reinstall Modal -->
      <div v-if="showReinstallModal" class="modal-overlay" @click.self="showReinstallModal = false">
        <div class="modal-container animate-fade-in">
          <div class="modal-header">
            <h3>Potwierdź Wymuszenie Reinstalacji</h3>
            <button class="close-btn" @click="showReinstallModal = false">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div
              class="modal-alert"
              style="
                background: rgba(255, 165, 2, 0.1);
                border-color: rgba(255, 165, 2, 0.3);
                color: #ffa502;
              "
            >
              <i class="fas fa-exclamation-circle mr-3" style="color: #ffa502"></i>
              <span>Uwaga: Ta akcja wymusi pobranie wszystkich plików u wszystkich graczy!</span>
            </div>
            <p class="modal-info-text text-muted text-sm mt-4">
              To spowoduje usunięcie folderu "instances" u wszystkich połączonych obecnie klientów,
              oraz wymusi to przy ich kolejnym uruchomieniu gry, jeśli są obecnie offline.
            </p>
          </div>

          <div class="modal-footer">
            <button
              class="btn-secondary"
              :disabled="isProcessingReinstall"
              @click="showReinstallModal = false"
            >
              {{ t('general.abort') }}
            </button>
            <button
              class="btn-warning btn-glow"
              :disabled="isProcessingReinstall"
              @click="handleForceReinstallAll"
            >
              <span v-if="isProcessingReinstall" class="spinner mr-2"></span>
              Wymuś Reinstalację
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.game-control-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
}

.page-header {
  margin-bottom: 3rem;
  text-align: center;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-subtitle {
  color: var(--text-muted);
  font-size: 1.1rem;
  max-width: 600px;
  line-height: 1.6;
}

.control-card {
  background: var(--bg-card);
  backdrop-filter: blur(14px);
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  padding: 4rem;
  text-align: center;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
}

.control-card:hover {
  transform: translateY(-5px);
  border-color: rgba(255, 71, 87, 0.5);
  box-shadow: 0 20px 45px rgba(255, 71, 87, 0.15);
}

.warning-icon-wrapper {
  margin-bottom: 2rem;
}

.warning-icon {
  font-size: 5rem;
  color: #ff4757;
  filter: drop-shadow(0 0 15px rgba(255, 71, 87, 0.4));
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.warning-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2.5rem;
}

.kill-btn {
  padding: 1.25rem 3rem;
  font-size: 1.3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%);
  border: none;
  border-radius: var(--border-radius-small);
  color: white;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.kill-btn:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.02);
  filter: brightness(1.1);
  box-shadow: 0 10px 25px rgba(255, 71, 87, 0.5);
}

.kill-btn:active:not(:disabled) {
  transform: translateY(-1px);
}

.kill-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reinstall-btn {
  padding: 1.25rem 3rem;
  font-size: 1.3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ff9f43 0%, #ff7b00 100%);
  border: none;
  border-radius: var(--border-radius-small);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 1px;
  width: 100%;
}

.reinstall-btn:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.02);
  filter: brightness(1.1);
  box-shadow: 0 10px 25px rgba(255, 159, 67, 0.5);
}

.reinstall-btn:active:not(:disabled) {
  transform: translateY(-1px);
}

.reinstall-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-container {
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  width: 90%;
  max-width: 550px;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
}

.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-body {
  padding: 2rem;
  color: var(--text-primary);
}

.modal-alert {
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid rgba(255, 71, 87, 0.3);
  padding: 1rem 1.5rem;
  border-radius: var(--border-radius-small);
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #ff4757;
}

.modal-info-text {
  line-height: 1.6;
}

.modal-footer {
  padding: 1.5rem 2rem;
  background: rgba(255, 255, 255, 0.03);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 1.25rem;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  border: 1px solid var(--border);
  padding: 0.85rem 1.75rem;
  border-radius: var(--border-radius-small);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-danger {
  background: #ff4757;
  color: white;
  border: none;
  padding: 0.85rem 1.75rem;
  border-radius: var(--border-radius-small);
  cursor: pointer;
  font-weight: 700;
  transition: all 0.2s;
}

.btn-danger:hover {
  filter: brightness(1.1);
}

.btn-warning {
  background: #ffa502;
  color: white;
  border: none;
  padding: 0.85rem 1.75rem;
  border-radius: var(--border-radius-small);
  cursor: pointer;
  font-weight: 700;
  transition: all 0.2s;
}

.btn-warning:hover {
  filter: brightness(1.1);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.4rem;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--text-primary);
}

/* Animations */
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.text-muted {
  color: var(--text-muted);
}
.text-sm {
  font-size: 0.95rem;
}
.text-red {
  color: #ff4757;
}
.mr-2 {
  margin-right: 0.6rem;
}
.mr-3 {
  margin-right: 1rem;
}
.mt-4 {
  margin-top: 1.5rem;
}

.spinner {
  width: 1.2rem;
  height: 1.2rem;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
