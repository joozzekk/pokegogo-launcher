<script lang="ts" setup>
import useUserStore from '@ui/stores/user-store'
import { differenceInMilliseconds, parseISO } from 'date-fns'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const modalVisible = ref(true)
const userStore = useUserStore()

const isBanned = computed(() => {
  // Use a local copy of state to prevent flickering during store updates
  const user = userStore.user
  if (!user && !userStore.hwidBanned) return false

  return (
    userStore.hwidBanned ||
    (user?.banEndDate
      ? differenceInMilliseconds(parseISO(user.banEndDate as string), new Date()) > 0
      : !!user?.isBanned)
  )
})

const banReason = computed(() => userStore.user?.banReason || t('modals.banned.noReason'))
const banExpires = computed(() => userStore.user?.banEndDate)

const acknowledgeBan = (): void => {
  modalVisible.value = false
}

const formatDate = (date: string | Date): string => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

const openDiscord = (): void => {
  window.electron?.ipcRenderer?.send('open-external', 'https://discord.gg/pokegogo')
}
</script>

<template>
  <Teleport to="#modalsContainer">
    <Transition name="fade">
      <div v-if="isBanned && modalVisible" class="g-modal-overlay" role="alert" aria-modal="true">
        <div class="g-card g-modal-card alert-theme !w-[440px] !max-w-[90%]">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box danger">
                <i class="fas fa-ban"></i>
              </div>
              <h3>{{ t('modals.banned.title') }}</h3>
            </div>
          </div>

          <div class="g-modal-content text-center">
            <div class="ban-icon-large">
              <i class="fas fa-exclamation-triangle"></i>
            </div>

            <h2 class="text-xl font-bold text-red-500 mb-2">
              {{ t('modals.banned.header', 'Konto Zbanowane') }}
            </h2>

            <p class="text-gray-300 mb-4">
              {{ t('modals.banned.desc') }}
            </p>

            <div v-if="banReason" class="ban-reason-box">
              <span class="label">{{ t('modals.banned.reason') }}:</span>
              <span class="reason">{{ banReason }}</span>
            </div>

            <div v-if="banExpires" class="ban-info-row">
              <span class="label">{{ t('modals.banned.expires') }}:</span>
              <span class="value">{{ formatDate(banExpires as string) }}</span>
            </div>
          </div>

          <div class="g-modal-footer">
            <button class="g-btn w-full" @click="openDiscord">
              <i class="fab fa-discord"></i>
              Discord
            </button>
            <button class="g-btn primary w-full" @click="acknowledgeBan">
              <i class="fas fa-check"></i>
              {{ t('modals.banned.understand') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Alert Theme Override */
.alert-theme {
  border-color: rgba(239, 68, 68, 0.3);
  box-shadow: 0 10px 40px rgba(239, 68, 68, 0.15);
}

.g-icon-box.danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.ban-icon-large {
  height: 5rem;
  margin-top: 1rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.ban-icon-large i {
  font-size: 3.5rem;
  color: #ef4444;
  opacity: 0.9;
  filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.4));
  animation: pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
  will-change: transform;
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

.ban-reason-box {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  min-height: 100px; /* Fixed height to prevent modal resizing */
  justify-content: center;
}

.ban-reason-box .label {
  font-size: 0.7rem;
  color: rgba(239, 68, 68, 0.8);
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 1px;
}

.ban-reason-box .reason {
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1.3;
  word-break: break-word;
}

.ban-info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 0.9rem;
  min-height: 2.5rem;
  align-items: center;
}

.ban-info-row .label {
  color: var(--text-secondary);
}

.ban-info-row .value {
  color: white;
  font-weight: 600;
}

@keyframes pulse {
  0% {
    transform: scale(1) translateZ(0);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05) translateZ(0);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateZ(0);
    opacity: 0.8;
  }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
