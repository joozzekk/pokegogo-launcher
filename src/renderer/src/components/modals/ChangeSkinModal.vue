<script lang="ts" setup>
import useUserStore from '@renderer/stores/user-store'
import useVuelidate from '@vuelidate/core'
import { computed, reactive, ref } from 'vue'
import SkinViewer from '../SkinViewer.vue'
import { changeCustomSkin } from '@renderer/api/endpoints'
import { showToast } from '@renderer/utils'
import { AxiosError } from 'axios'
import { useRouter } from 'vue-router'

const fileInputRef = ref<HTMLInputElement | null>(null)
const userStore = useUserStore()
const router = useRouter()
const modalVisible = ref(false)
const state = reactive({
  skinUrl: '',
  type: 'classic'
})

const apiURL = import.meta.env.RENDERER_VITE_API_URL

const skinUrl = computed({
  get: () => {
    return state.skinUrl || `${apiURL}/skins/image/${userStore.user?.nickname}`
  },
  set: (value: string) => {
    state.skinUrl = value
  }
})

const openModal = (): void => {
  modalVisible.value = true
}

const v$ = useVuelidate({}, state)

const handleExit = async (): Promise<void> => {
  modalVisible.value = false
}

defineExpose({
  openModal
})

const handleFileUpload = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const file = target.files ? target.files[0] : null

  if (file) {
    const objectUrl = URL.createObjectURL(file)
    skinUrl.value = objectUrl
  }
}

const handleSubmit = async (): Promise<void> => {
  await v$.value.$validate()
  if (v$.value.$invalid) {
    return
  }

  const skinFile = fileInputRef.value?.files ? fileInputRef.value.files[0] : null

  if (!skinFile) {
    showToast('Proszę wybrać plik skina.', 'error')
    return
  }

  const skinBlob = new Blob([skinFile], { type: 'image/png' })

  const formData = new FormData()
  formData.append('uuid', userStore.user!.uuid)
  formData.append('nickname', userStore.user!.nickname)
  formData.append('skinType', state.type)
  formData.append('file', skinBlob)

  try {
    const result = await changeCustomSkin(formData)

    if (result) {
      showToast('Skin został pomyślnie zmieniony!', 'success')
      modalVisible.value = false
      v$.value.$reset()
      router.go(0)
    }
  } catch (err) {
    const axiosError = err as AxiosError

    showToast(axiosError.response?.data?.message, 'error')
    return
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
              <i class="fas fa-pencil" aria-hidden="true"></i>
            </div>
            <h2>Custom skin</h2>
          </div>
          <div>
            <button class="nav-icon" @click="handleExit">
              <i class="fa fa-x" />
            </button>
          </div>
        </div>
        <input
          ref="fileInputRef"
          class="hidden"
          type="file"
          accept=".png"
          @change="handleFileUpload"
        />
        <div class="setting-group mb-2!">
          <label class="input-label mb-1">Typ skina</label>
          <div class="toggle-group">
            <button
              class="toggle-option"
              :class="{ active: state.type === 'classic' }"
              @click="state.type = 'classic'"
            >
              Steve
            </button>
            <button
              class="toggle-option"
              :class="{ active: state.type === 'slim' }"
              @click="state.type = 'slim'"
            >
              Alexa
            </button>
          </div>
        </div>

        <div v-if="userStore.user" class="setting-group mb-2!">
          <label>Customowy skin</label>
          <p class="text-[var(--text-secondary)] mb-2 text-[0.7rem]">
            Kliknij na podgląd skina, aby zmienić swój customowy skin w grze.
          </p>
          <div class="flex w-full items-center justify-center mb-4">
            <div
              class="flex w-[100px] h-[100px] player-profile rounded-2xl! hover:bg-[var(--bg-light)]/40! hover:cursor-pointer"
              @click="fileInputRef?.click()"
            >
              <SkinViewer :skin="skinUrl" />
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn-primary" @click="handleSubmit">Zatwierdź</button>
          <button class="btn-secondary" @click="handleExit">Anuluj</button>
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
