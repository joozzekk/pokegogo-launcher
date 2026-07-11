<script lang="ts" setup>
import useUserStore from '@ui/stores/user-store'
import { useVuelidate } from '@vuelidate/core'
import { computed, reactive, ref } from 'vue'
import SkinViewer from '../SkinViewer.vue'
import { changeCustomSkin } from '@ui/api/endpoints'
import { showToast } from '@ui/utils'
import { AxiosError } from 'axios'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
    showToast(t('modals.changeSkin.selectFile'), 'error')
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
      showToast(t('modals.changeSkin.success'), 'success')
      modalVisible.value = false
      v$.value.$reset()
      router.go(0)
    }
  } catch (err) {
    const axiosError = err as AxiosError

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    showToast((axiosError.response?.data as any)?.message, 'error')
    return
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
              <div class="g-icon-box">
                <i class="fas fa-tshirt"></i>
              </div>
              <h3>{{ t('modals.changeSkin.title') }}</h3>
            </div>
            <button class="g-close-btn" @click="handleExit">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="g-modal-content">
            <input
              ref="fileInputRef"
              class="hidden"
              type="file"
              accept=".png"
              @change="handleFileUpload"
            />

            <!-- Skin Type -->
            <div class="flex flex-col gap-1 mb-4">
              <label class="text-sm font-semibold text-gray-400">{{
                t('modals.changeSkin.type')
              }}</label>
              <div class="flex bg-black/20 p-1 rounded-xl">
                <button
                  class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all"
                  :class="
                    state.type === 'classic'
                      ? 'bg-[var(--bg-card)] text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  "
                  @click="state.type = 'classic'"
                >
                  {{ t('modals.changeSkin.steve') }}
                </button>
                <button
                  class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all"
                  :class="
                    state.type === 'slim'
                      ? 'bg-[var(--bg-card)] text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  "
                  @click="state.type = 'slim'"
                >
                  {{ t('modals.changeSkin.alex') }}
                </button>
              </div>
            </div>

            <!-- Skin Preview/Upload -->
            <div v-if="userStore.user" class="flex flex-col gap-2 mb-2 items-center">
              <label class="text-sm font-semibold text-gray-400">{{
                t('modals.changeSkin.custom')
              }}</label>
              <p class="text-[var(--text-secondary)] text-xs text-center">
                {{ t('modals.changeSkin.hint') }}
              </p>
              <div
                class="flex w-32 h-32 bg-black/20 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-white/30 transition-colors items-center justify-center overflow-hidden relative"
                @click="fileInputRef?.click()"
              >
                <!-- Replace with actual SkinViewer if available, or image preview -->
                <SkinViewer :skin="skinUrl" class="w-full h-full" />
                <div
                  class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <i class="fas fa-upload text-white text-xl"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="g-modal-footer">
            <button class="g-btn" @click="handleExit">
              {{ t('modals.changeSkin.cancel') }}
            </button>
            <button class="g-btn primary flex-1" @click="handleSubmit">
              <i class="fas fa-check"></i>
              {{ t('modals.changeSkin.confirm') }}
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
