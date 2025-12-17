<script lang="ts" setup>
import useGeneralStore from '@renderer/stores/general-store'
import useUserStore from '@renderer/stores/user-store'
import { showToast } from '@renderer/utils'
import { useVuelidate } from '@vuelidate/core'
import { helpers, maxLength, minLength, required } from '@vuelidate/validators'
import { computed, reactive, ref } from 'vue'

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
          required: helpers.withMessage('Nazwa jest wymagana', required),
          minLength: helpers.withMessage('Nazwa musi mieć co najmniej 2 znaki', minLength(2)),
          maxLength: helpers.withMessage('Nazwa może mieć maksymalnie 50 znaków', maxLength(50))
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

  const logsFile = await window?.electron?.ipcRenderer?.invoke('ftp:get-logs')
  const logsBlob = new Blob([logsFile], { type: 'text/plain' })

  let mcLogsFile, mcLogsBlob

  try {
    mcLogsFile = await window?.electron?.ipcRenderer?.invoke('ftp:get-logs', 'minecraft')
    mcLogsBlob = new Blob([mcLogsFile], { type: 'text/plain' })
  } catch {
    /* ignore */
  } finally {
    const formData = new FormData()
    formData.append('files[0]', logsBlob, 'main.log')
    if (mcLogsFile) {
      formData.append('files[1]', mcLogsBlob, 'minecraft.log')
    }
    formData.append(
      'payload_json',
      JSON.stringify({
        content: `**Nickname**: ${userStore.user?.nickname ?? 'Brak Nicku'}\n**Wersja**: ${
          generalStore.appVersion
        }\n**Treść zgłoszenia**:\n${state.description}`
      })
    )

    const result = await fetch(webhookURL, {
      method: 'POST',
      body: formData
    })

    if (result.ok) {
      showToast('Zgłoszenie zostało wysłane', 'success')
    }
  }

  handleExit()
}
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
        <div class="modal-header flex justify-between">
          <div class="launch-title">
            <div class="nav-icon">
              <i class="fa fa-warning" aria-hidden="true"></i>
            </div>
            <h2>Zgłoszenie</h2>
          </div>
          <div>
            <button class="nav-icon" @click="handleExit">
              <i class="fa fa-x" />
            </button>
          </div>
        </div>
        <div class="modal-content">
          <div class="flex flex-col w-full">
            <label class="input-label mb-1 text-[var(--text-secondary))]">Treść zgłoszenia</label>
            <div class="form-group h-full">
              <div class="input-wrapper flex">
                <textarea
                  v-model="state.description"
                  class="form-input !pl-[1rem] resize-none"
                  placeholder="Treść zgłoszenia.."
                  :class="{ invalid: v$.description?.$error }"
                  rows="5"
                  aria-required="true"
                  required
                />
                <div class="input-line"></div>
              </div>
              <div class="error-message" :class="{ show: v$.description?.$error }">
                {{ v$.description?.$errors[0]?.$message }}
              </div>
            </div>
          </div>
        </div>
        <div class="flex gap-2 mt-2">
          <button class="btn-secondary" @click="handleExit">Anuluj</button>
          <button class="btn-primary" @click="handleSubmit">Wyślij</button>
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
  padding: 1.5rem 2rem 1.25rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 1rem var(--border-2);
  background: var(--bg-card);
  border-radius: 1rem;
  border: 1px dashed var(--border-2);
  backdrop-filter: blur(10px);
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
  font-size: 1rem;
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
}

.log-description {
  font-size: 0.7rem;
  width: 100%;
  min-height: 7vh;
  border-radius: 0.5rem;
  background-color: var(--bg-light);
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
  text-align: center;
  justify-content: center;
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
