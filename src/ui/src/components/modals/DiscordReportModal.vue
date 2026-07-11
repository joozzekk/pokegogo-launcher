<script lang="ts" setup>
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import { FTPChannel } from '@ui/types/ftp'
import { showToast } from '@ui/utils'
import { useVuelidate } from '@vuelidate/core'
import { helpers, minLength, required } from '@vuelidate/validators'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const userStore = useUserStore()
const generalStore = useGeneralStore()

const webhookURL: string = import.meta.env.VITE_DISCORD_REPORT_URL as string

const modalVisible = ref(false)
const state = reactive({
  description: ''
})

const openModal = (): void => {
  modalVisible.value = true
}

const rules = computed(() => {
  return modalVisible.value
    ? {
        description: {
          required: helpers.withMessage(t('modals.discordReport.required'), required),
          minLength: helpers.withMessage(t('modals.discordReport.minLength'), minLength(2))
        }
      }
    : {}
})

const v$ = useVuelidate(rules, state)

const handleExit = async (): Promise<void> => {
  modalVisible.value = false
  state.description = ''
  v$.value.$reset()
}

defineExpose({
  openModal
})

const handleSubmit = async (): Promise<void> => {
  await v$.value.$validate()
  if (v$.value.$invalid) {
    return
  }

  const logsFile = await window?.electron?.ipcRenderer?.invoke(FTPChannel.GET_LOGS)
  const logsBlob = new Blob([logsFile], { type: 'text/plain' })

  const formData = new FormData()
  formData.append('files[0]', logsBlob, 'main.log')
  formData.append(
    'payload_json',
    JSON.stringify({
      content: `**Nickname**: ${userStore.user?.nickname ?? t('modals.discordReport.noNick')}\n**Wersja**: ${
        generalStore.appVersion
      }\n**${t('modals.discordReport.content')}**:\n${state.description}`
    })
  )

  const result = await fetch(webhookURL, {
    method: 'POST',
    body: formData
  })

  if (result.ok) {
    showToast(t('modals.discordReport.success'), 'success')
  }

  handleExit()
}
</script>

<template>
  <Teleport to="#modalsContainer">
    <Transition name="fade">
      <div v-if="modalVisible" class="g-modal-overlay" role="dialog" aria-modal="true">
        <div class="g-card g-modal-card">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div
                class="g-icon-box"
                style="
                  color: #5865f2;
                  background: rgba(88, 101, 242, 0.15);
                  border-color: rgba(88, 101, 242, 0.3);
                "
              >
                <i class="fab fa-discord"></i>
              </div>
              <h3>{{ t('modals.discordReport.title') }}</h3>
            </div>
            <button class="g-close-btn" @click="handleExit">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="g-modal-content">
            <div class="flex flex-col gap-1 w-full">
              <label class="text-sm font-semibold text-gray-400">{{
                t('modals.discordReport.content')
              }}</label>
              <textarea
                v-model="state.description"
                class="g-input !h-auto resize-none"
                :placeholder="t('modals.discordReport.placeholder')"
                :class="{ '!border-red-500': v$.description?.$error }"
                rows="5"
              ></textarea>
              <span v-if="v$.description?.$error" class="text-xs text-red-500">{{
                v$.description?.$errors[0]?.$message
              }}</span>
            </div>
          </div>

          <div class="g-modal-footer">
            <button class="g-btn" @click="handleExit">
              {{ t('modals.discordReport.cancel') }}
            </button>
            <button
              class="g-btn primary flex-1"
              style="background: #5865f2; border-color: #5865f2"
              @click="handleSubmit"
            >
              <i class="fab fa-discord"></i>
              {{ t('modals.discordReport.send') }}
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
