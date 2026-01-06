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

const url = import.meta.env.RENDERER_VITE_API_URL
const modalVisible = ref(false)
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
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    type: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    desc: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    photo: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    startDate: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    ...(state.type !== 'mega'
      ? {
          endDate: {
            required: helpers.withMessage('Pole jest wymagane', required)
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
    state.startDate = parseISO(event.startDate)
    state.endDate = parseISO(event.endDate)
    state.photo = event.src
    photoFile.value = event.src
  }
}

const addEvent = async (): Promise<void> => {
  const isValid = await v$.value.$validate()
  if (!isValid || !preview.value || !photoFile.value) return

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
      showToast('Pomyślnie dodano nowe wydarzenie ' + state.name + '.')
      handleCancel()
      await emits('refreshData')
    }
  }
}
const editEvent = async (): Promise<void> => {
  const isValid = await v$.value.$validate()
  if (!isValid || !photoFile.value) return

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
      showToast('Pomyślnie edytowano wydarzenie ' + state.name + '.')
      handleCancel()
      await emits('refreshData')
    }
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
    <div
      v-if="modalVisible"
      class="modal-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ban-title"
    >
      <div class="modal-card">
        <div class="modal-header">
          <div class="launch-title">
            <div class="flex gap-4 items-center">
              <div class="nav-icon">
                <i class="fas fa-plus"></i>
              </div>
              <h2 id="ban-title">{{ actionType === 'add' ? 'Dodaj' : 'Edytuj' }} wydarzenie</h2>
            </div>
          </div>
          <div class="nav-icon ml-auto" @click="handleCancel">
            <i class="fas fa-x"></i>
          </div>
        </div>
        <div class="modal-content">
          <div class="flex gap-3 w-full">
            <div class="flex flex-col min-w-[5.5rem] mr-2">
              <input ref="fileInputRef" type="file" hidden @change="handleUpdatePhoto" />
              <div
                v-if="state.photo"
                class="nav-icon !w-full !h-[5.5rem]"
                :class="{ 'border border-red-500': v$.photo.$error }"
                @click="fileInputRef?.click()"
              >
                <img
                  :src="preview?.length ? preview : `${url}/events/image/${uuid}`"
                  class="h-[4rem]"
                  @dragstart.prevent="null"
                />
              </div>
              <button
                v-else
                class="nav-icon !w-full !h-[5.5rem]"
                :class="{ 'border border-red-500': v$.photo.$error }"
                @click="fileInputRef?.click()"
              >
                <i class="fa fa-image text-[3rem]" />
              </button>
            </div>
            <div class="flex flex-col w-full">
              <label class="input-label mb-1">Nazwa</label>
              <small class="mb-1 text-[var(--text-secondary)]">
                Nazwa wydarzenia wyświetlana na stronie głównej launchera.
              </small>
              <div class="form-group h-full">
                <div class="input-wrapper flex">
                  <input
                    v-model="state.name"
                    type="text"
                    class="form-input !pl-[1rem]"
                    placeholder="Podaj nazwę"
                    :class="{ invalid: v$.name.$error }"
                    aria-required="true"
                    required
                  />
                  <div class="input-line"></div>
                </div>
                <div class="error-message" :class="{ show: v$.name.$error }">
                  {{ v$.name.$errors[0]?.$message }}
                </div>
              </div>
            </div>

            <div class="flex flex-col w-full">
              <label class="input-label mb-1">Typ</label>
              <small class="mb-1 text-[var(--text-secondary)]"> Typ dodawanego wydarzenia </small>
              <div class="toggle-group">
                <button
                  v-if="actionType === 'edit'"
                  class="toggle-option"
                  :class="{ active: state.type === 'mega' }"
                  :disabled="actionType === 'edit'"
                  @click="state.type = 'mega'"
                >
                  MEGA
                </button>
                <button
                  class="toggle-option"
                  :class="{ active: state.type === 'normal' }"
                  :disabled="actionType === 'edit'"
                  @click="state.type = 'normal'"
                >
                  Normalny
                </button>
              </div>
            </div>
          </div>

          <div class="flex flex-col">
            <label class="input-label mb-1">Opis</label>
            <small class="mb-1 text-[var(--text-secondary)]">
              Opis wydarzenia wyświetlany na stronie głównej launchera.
            </small>
            <div class="form-group">
              <textarea
                v-model="state.desc"
                placeholder="Podaj opis.."
                :rows="3"
                class="form-input !pl-[1rem] !resize-none !outline-none"
                :class="{ invalid: v$.desc.$error }"
                required
                aria-required="true"
              ></textarea>
              <div class="error-message" :class="{ show: v$.desc.$error }">
                {{ v$.desc.$errors[0]?.$message }}
              </div>
            </div>
          </div>

          <div class="flex gap-2 w-full">
            <div class="flex flex-col w-full">
              <label class="input-label mb-1">Data początkowa</label>
              <small class="mb-1 text-[var(--text-secondary)]"> Data początku wydarzenia </small>
              <div class="form-group">
                <DatePicker
                  v-model="state.startDate"
                  placeholder="Wybierz datę"
                  class="w-full my-app-dark"
                  input-class="!text-[0.8rem] w-full"
                  :class="{ invalid: v$.startDate.$error }"
                  required
                  aria-required="true"
                />
                <div class="error-message" :class="{ show: v$.startDate.$error }">
                  {{ v$.startDate.$errors[0]?.$message }}
                </div>
              </div>
            </div>
            <div class="flex flex-col w-full">
              <label class="input-label mb-1">Data końcowa</label>
              <small class="mb-1 text-[var(--text-secondary)]"> Data końca wydarzenia </small>
              <div class="form-group">
                <DatePicker
                  v-model="state.endDate"
                  placeholder="Wybierz datę"
                  class="w-full"
                  input-class="!text-[0.8rem] w-full"
                  :class="{ invalid: v$.endDate?.$error }"
                  required
                  show-clear
                  aria-required="true"
                />
                <div class="error-message" :class="{ show: v$.endDate?.$error }">
                  {{ v$.endDate?.$errors[0]?.$message }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer flex ml-auto max-w-1/3">
          <button
            type="button"
            class="btn-primary"
            @click="actionType === 'add' ? addEvent() : editEvent()"
          >
            <i class="fa fa-save" />
            Zapisz
          </button>
          <button type="button" class="btn-secondary" @click="handleCancel">Anuluj</button>
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
  z-index: 800;
}

.modal-card {
  width: 90%;
  max-width: 80vw;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: 1rem;
  padding: 0 2rem;
  padding-bottom: 1rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 1rem var(--border-2);
  background: var(--bg-card);
  border-radius: 1rem;
  border: 1px dashed var(--border-2);
  backdrop-filter: blur(10px);
}

.modal-header {
  position: sticky;
  z-index: 700;
  padding: 1rem 0;
  top: 0;
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
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.input-label {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-secondary);
}

.input-field,
.textarea-field {
  background: rgba(30, 35, 45, 0.85);
  border-radius: 0.5rem;
  border: none;
  color: white;
  padding: 0.5rem;
  font-size: 1rem;
  resize: vertical;
}

.input-field::placeholder,
.textarea-field::placeholder {
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn-primary {
  background-color: var(--primary);
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1.25rem;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--primary);
  border-radius: 0.5rem;
  padding: 0.5rem 1.25rem;
  color: var(--primary);
  font-weight: 700;
  cursor: pointer;
}
</style>
