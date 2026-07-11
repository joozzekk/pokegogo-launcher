<script lang="ts" setup>
import { resetPassword } from '@ui/api/endpoints'
import { IUser } from '@ui/env'
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
    <Transition name="fade">
      <div v-if="modalVisible" class="g-modal-overlay" role="dialog" aria-modal="true">
        <div class="g-card g-modal-card">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box warning">
                <i class="fas fa-key"></i>
              </div>
              <h3>{{ t('modals.passwordReset.title') }}</h3>
            </div>
            <button class="g-close-btn" @click="closeModal">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="g-modal-content">
            <div v-if="!state.generatedPass" class="text-gray-300 text-center py-4">
              {{ t('modals.passwordReset.confirm', { nickname: state.nickname }) }}
            </div>
            <div v-else class="flex flex-col items-center gap-3 py-2">
              <p class="text-gray-400 text-sm">{{ t('modals.passwordReset.generated') }}</p>
              <div
                class="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/10 w-full justify-between group cursor-pointer hover:border-white/20 transition-colors"
                @click="copyToClipboard(state.generatedPass)"
              >
                <code class="text-primary font-mono text-lg font-bold tracking-wider">{{
                  state.generatedPass
                }}</code>
                <i class="fas fa-copy text-gray-500 group-hover:text-white transition-colors"></i>
              </div>
            </div>
          </div>

          <div class="g-modal-footer">
            <button class="g-btn" @click="closeModal">
              {{ t('modals.passwordReset.cancel') }}
            </button>
            <button class="g-btn primary flex-1" @click="handleSubmit">
              <i class="fas" :class="state.generatedPass.length ? 'fa-check' : 'fa-refresh'"></i>
              {{
                state.generatedPass.length
                  ? t('modals.passwordReset.ok')
                  : t('modals.passwordReset.reset')
              }}
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
