<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import { createEvent, updateEvent } from '@ui/api/endpoints'
import { showToast } from '@ui/utils'
import useVuelidate from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'
import { parseISO } from 'date-fns'
import DatePicker from 'primevue/datepicker'
import { computed, reactive, ref } from 'vue'
import { FTPChannel } from '@ui/types/ftp'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const url = import.meta.env.RENDERER_VITE_API_URL
const modalVisible = ref(false)
const isSaving = ref(false)
const photoFile = ref<File | null>(null)
const uuid = ref<string>('')
const preview = ref<string>('')
const state = reactive({
  name: '',
  type: 'normal',
  photo: '',
  desc: '',
  src: '',
  startDate: null as Date | null,
  endDate: null as Date | null
})

const fileInputRef = ref<HTMLInputElement | null>(null)

const rules = computed(() => {
  return {
    name: {
      required: helpers.withMessage(t('general.required'), required)
    },
    type: {
      required: helpers.withMessage(t('general.required'), required)
    },
    desc: {
      required: helpers.withMessage(t('general.required'), required)
    },
    photo: {
      required: helpers.withMessage(t('general.required'), required)
    },
    startDate: {
      required: helpers.withMessage(t('general.required'), required)
    },
    ...(state.type !== 'mega'
      ? {
          endDate: {
            required: helpers.withMessage(t('general.required'), required)
          }
        }
      : {})
  }
})

const v$ = useVuelidate(rules, state)

const actionType = ref<string>('add')

const emits = defineEmits<{
  (e: 'refreshData'): Promise<void>
}>()

const openModal = async (event: any, type: 'add' | 'edit' = 'add'): Promise<void> => {
  modalVisible.value = true
  actionType.value = type
  if (event) {
    uuid.value = event.uuid
    state.type = event.type
    state.name = event.name
    state.desc = event.desc
    state.startDate = event.startDate ? parseISO(event.startDate) : null
    state.endDate = event.endDate ? parseISO(event.endDate) : null
    state.photo = event.src
    photoFile.value = event.src
  }
}

const addEvent = async (): Promise<void> => {
  if (isSaving.value) return
  const isValid = await v$.value.$validate()
  if (!isValid || !preview.value || !photoFile.value) return

  isSaving.value = true
  try {
    let uploadResult = true

    if (preview.value)
      uploadResult = await window.electron.ipcRenderer?.invoke(
        FTPChannel.UPLOAD_FILE,
        'events',
        await photoFile.value.arrayBuffer(),
        photoFile.value.name
      )

    if (uploadResult) {
      const res = await createEvent({
        ...state,
        src: photoFile.value.name
      })

      if (res) {
        showToast(`${t('events.addSuccess')} ${state.name}.`)
        handleCancel()
        await emits('refreshData')
      }
    }
  } finally {
    isSaving.value = false
  }
}
const editEvent = async (): Promise<void> => {
  if (isSaving.value) return
  const isValid = await v$.value.$validate()
  if (!isValid || !photoFile.value) return

  isSaving.value = true
  try {
    let uploadResult = true
    if (preview.value)
      uploadResult = await window.electron.ipcRenderer?.invoke(
        FTPChannel.UPLOAD_FILE,
        'events',
        await photoFile.value.arrayBuffer(),
        photoFile.value.name
      )

    if (uploadResult) {
      const res = await updateEvent({
        ...state,
        uuid: uuid.value,
        src: preview.value ? photoFile.value.name : state.photo
      })

      if (res) {
        showToast(`${t('events.editSuccess')} ${state.name}.`)
        handleCancel()
        await emits('refreshData')
      }
    }
  } finally {
    isSaving.value = false
  }
}

const handleUpdatePhoto = async (): Promise<void> => {
  if (!fileInputRef.value?.files?.length) return
  const files = Array.from(fileInputRef.value.files)
  photoFile.value = files[0]

  state.photo = photoFile.value.name
  preview.value = URL.createObjectURL(photoFile.value)
  fileInputRef.value.value = ''
}

const handleCancel = (): void => {
  v$.value.$reset()
  state.name = ''
  state.desc = ''
  state.photo = ''
  state.type = 'normal'
  state.src = ''
  state.startDate = null
  state.endDate = null
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
              <div class="g-icon-box">
                <i class="fas fa-calendar-plus"></i>
              </div>
              <h3>{{ actionType === 'add' ? t('events.addTitle') : t('events.editTitle') }}</h3>
            </div>
            <button class="g-close-btn" @click="handleCancel">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="g-modal-content custom-scrollbar">
            <div class="flex gap-4 w-full">
              <!-- Photo Upload -->
              <div class="flex flex-col min-w-[5.5rem]">
                <input ref="fileInputRef" type="file" hidden @change="handleUpdatePhoto" />
                <div
                  v-if="state.photo"
                  class="g-input flex items-center justify-center !p-0 cursor-pointer overflow-hidden text-center relative hover:opacity-80 transition-opacity"
                  style="height: 5.5rem; width: 5.5rem"
                  :class="{ '!border-red-500': v$.photo.$error }"
                  @click="fileInputRef?.click()"
                >
                  <img
                    :src="preview?.length ? preview : `${url}/events/image/${uuid}`"
                    class="w-full h-full object-cover"
                    @dragstart.prevent="null"
                  />
                </div>
                <button
                  v-else
                  class="g-input flex items-center justify-center !p-0 cursor-pointer hover:bg-white/5 transition-colors"
                  style="height: 5.5rem; width: 5.5rem"
                  :class="{ '!border-red-500': v$.photo.$error }"
                  @click="fileInputRef?.click()"
                >
                  <i class="fa fa-image text-2xl text-gray-400" />
                </button>
              </div>

              <!-- Main Fields -->
              <div class="flex flex-col gap-3 w-full">
                <!-- Name -->
                <div class="flex flex-col gap-1">
                  <label class="text-sm font-semibold text-gray-400">{{
                    t('events.labels.name')
                  }}</label>
                  <input
                    v-model="state.name"
                    type="text"
                    class="g-input"
                    :placeholder="t('events.placeholders.name')"
                    :class="{ '!border-red-500': v$.name.$error }"
                  />
                  <span v-if="v$.name.$error" class="text-xs text-red-500">{{
                    v$.name.$errors[0]?.$message
                  }}</span>
                </div>

                <!-- Type Toggle -->
                <div class="flex flex-col gap-1">
                  <label class="text-sm font-semibold text-gray-400">{{
                    t('events.labels.type')
                  }}</label>
                  <div class="flex bg-black/20 p-1 rounded-xl">
                    <button
                      class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all"
                      :class="
                        state.type === 'mega'
                          ? 'bg-[var(--bg-card)] text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      "
                      @click="state.type = 'mega'"
                    >
                      {{ t('events.types.mega') }}
                    </button>
                    <button
                      class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all"
                      :class="
                        state.type === 'normal'
                          ? 'bg-[var(--bg-card)] text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      "
                      @click="state.type = 'normal'"
                    >
                      {{ t('events.types.normal') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-400">{{
                t('events.labels.desc')
              }}</label>
              <textarea
                v-model="state.desc"
                class="g-input !h-auto resize-none"
                rows="3"
                :placeholder="t('events.placeholders.desc')"
                :class="{ '!border-red-500': v$.desc.$error }"
              ></textarea>
              <span v-if="v$.desc.$error" class="text-xs text-red-500">{{
                v$.desc.$errors[0]?.$message
              }}</span>
            </div>

            <!-- Dates -->
            <div class="grid grid-cols-2 pt-2 gap-4 w-full">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold text-gray-400">{{
                  t('events.labels.startDate')
                }}</label>
                <DatePicker
                  v-model="state.startDate"
                  :placeholder="t('events.placeholders.date')"
                  class="w-full"
                  fluid
                  :pt="{
                    root: { class: 'w-full' },
                    input: {
                      class: 'g-input w-full ' + (v$.startDate.$error ? '!border-red-500' : '')
                    },
                    pcPanel: {
                      root: { class: '!w-full' }
                    }
                  }"
                />
                <span v-if="v$.startDate.$error" class="text-xs text-red-500">{{
                  v$.startDate.$errors[0]?.$message
                }}</span>
              </div>
              <div class="flex flex-col gap-1 w-full">
                <label class="text-sm font-semibold text-gray-400">{{
                  t('events.labels.endDate')
                }}</label>
                <DatePicker
                  v-model="state.endDate"
                  :placeholder="t('events.placeholders.date')"
                  class="w-full"
                  fluid
                  :pt="{
                    root: { class: 'w-full' },
                    input: {
                      class: 'g-input w-full ' + (v$.endDate?.$error ? '!border-red-500' : '')
                    },
                    pcPanel: {
                      root: { class: '!w-full' }
                    }
                  }"
                  show-clear
                />
                <span v-if="v$.endDate?.$error" class="text-xs text-red-500">{{
                  v$.endDate?.$errors[0]?.$message
                }}</span>
              </div>
            </div>
          </div>

          <div class="g-modal-footer">
            <button class="g-btn" @click="handleCancel">
              {{ t('events.cancel') }}
            </button>
            <button
              class="g-btn primary flex-1"
              :disabled="isSaving"
              @click="actionType === 'add' ? addEvent() : editEvent()"
            >
              <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fa fa-save" />
              {{ isSaving ? 'Zapisywanie...' : t('events.save') }}
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
