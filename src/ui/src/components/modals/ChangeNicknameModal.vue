<script lang="ts" setup>
import { changePlayerNickname } from '@ui/api/endpoints'
import { IUser } from '@ui/env'
import { showToast } from '@ui/utils'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const modalVisible = ref(false)
const newNicknameInput = ref('')
const playerData = ref<IUser>()

const emits = defineEmits<{
  (e: 'refreshData'): Promise<void> | void
}>()

const openModal = async (player: IUser): Promise<void> => {
  modalVisible.value = true
  playerData.value = player
  newNicknameInput.value = ''
}

const changeNickname = async (): Promise<void> => {
  if (!playerData.value) return

  const oldNickname = playerData.value.nickname
  const newNickname = newNicknameInput.value.trim()

  if (!newNickname || newNickname === oldNickname) {
    handleCancel()
    return
  }

  try {
    const res = await changePlayerNickname(oldNickname, newNickname)

    if (res) {
      await emits('refreshData')

      modalVisible.value = false
      showToast(
        t('modals.changeNickname.success', { old: oldNickname, new: newNickname }),
        'success'
      )
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } }
    showToast(err?.response?.data?.message || 'Nie udało się zmienić nicku', 'error')
  }
}

const handleCancel = (): void => {
  newNicknameInput.value = ''
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
        <div class="g-card g-modal-card ban-modal-compact">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box primary">
                <i class="fas fa-user-edit"></i>
              </div>
              <h3>
                {{ t('modals.changeNickname.title') }}
              </h3>
            </div>
            <button class="g-close-btn" @click="handleCancel">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="g-modal-content">
            <div
              v-if="playerData"
              class="flex flex-col gap-2 mb-3 bg-white/5 p-3 rounded-xl border border-white/10"
            >
              <p class="text-[11px] text-gray-400 uppercase font-semibold">
                {{ t('modals.changeNickname.info') }}
              </p>
              <div
                class="flex items-center justify-center gap-3 text-sm font-bold bg-black/20 py-2 rounded-lg"
              >
                <span class="text-blue-400">{{ playerData.nickname }}</span>
                <i class="fas fa-arrow-right text-gray-500 text-xs"></i>
                <span
                  :class="newNicknameInput.trim() ? 'text-green-400' : 'text-gray-500 italic'"
                  >{{ newNicknameInput.trim() || '?' }}</span
                >
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-gray-400">
                {{ t('modals.changeNickname.newNickname') }} <span class="text-red-500">*</span>
              </label>
              <input
                v-model="newNicknameInput"
                type="text"
                :placeholder="t('modals.changeNickname.newNicknamePlaceholder')"
                class="g-input !h-auto text-sm"
              />
            </div>
          </div>

          <div class="g-modal-footer">
            <button class="g-btn" @click="handleCancel">
              {{ t('modals.changeNickname.cancel') }}
            </button>
            <button
              class="g-btn primary flex-1"
              :disabled="!newNicknameInput.trim()"
              @click="changeNickname"
            >
              <i class="fas fa-check"></i>
              {{ t('modals.changeNickname.change') }}
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

.ban-modal-compact {
  max-width: 440px !important;
  gap: 0.75rem !important;
  padding: 1rem !important;
  overflow: visible !important;
}

.g-card-header {
  padding-bottom: 0.5rem !important;
}

.g-icon-box {
  width: 32px !important;
  height: 32px !important;
  font-size: 0.9rem !important;
}

label {
  font-size: 10px !important;
  margin-bottom: 2px !important;
}
</style>
