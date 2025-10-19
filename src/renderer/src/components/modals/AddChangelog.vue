<script lang="ts" setup>
import { createChangelog, updateChangelog } from '@renderer/api/endpoints'
import { showToast } from '@renderer/utils'
import useVuelidate from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'
import { parseISO } from 'date-fns'
import DatePicker from 'primevue/datepicker'
import { computed, reactive, ref } from 'vue'

const url = import.meta.env.RENDERER_VITE_API_URL
const modalVisible = ref(false)
const photoFile = ref<File | null>(null)
const uuid = ref<string>('')
const preview = ref<string>('')
const state = reactive({
  name: '',
  version: '',
  type: 'normal',
  photo: '',
  desc: '',
  src: '',
  startDate: null as Date | null,
  changes: [] as any[]
})

const fileInputRef = ref<HTMLInputElement | null>(null)

const rules = computed(() => {
  return {
    name: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    version: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    type: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    photo: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    startDate: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    changes: {
      required: helpers.withMessage('Pole jest wymagane', required)
    }
  }
})

const v$ = useVuelidate(rules, state)

const actionType = ref<string>('add')

const emits = defineEmits<{
  (e: 'refreshData'): Promise<void>
}>()

const openModal = async (changelog: any, type: 'add' | 'edit' = 'add'): Promise<void> => {
  modalVisible.value = true
  actionType.value = type
  if (changelog) {
    uuid.value = changelog.uuid
    state.type = changelog.type
    state.name = changelog.name
    state.version = changelog.version
    state.desc = changelog.desc
    state.startDate = parseISO(changelog.startDate)
    state.changes = changelog.changes
    state.photo = changelog.src
    photoFile.value = changelog.src
  }
}

const addChangelog = async (): Promise<void> => {
  const isValid = await v$.value.$validate()
  if (!isValid || !preview.value || !photoFile.value) return

  let uploadResult = true

  if (preview.value)
    uploadResult = await window.electron.ipcRenderer?.invoke(
      'ftp:upload-file',
      'items',
      await photoFile.value.arrayBuffer(),
      photoFile.value.name
    )

  if (uploadResult) {
    const res = await createChangelog({
      ...state,
      src: photoFile.value.name
    })

    if (res) {
      showToast('Pomyślnie dodano nowy changelog ' + state.name + '.')
      handleCancel()
      await emits('refreshData')
    }
  }
}
const editChangelog = async (): Promise<void> => {
  const isValid = await v$.value.$validate()
  if (!isValid || !photoFile.value) return

  let uploadResult = true
  if (preview.value)
    await window.electron.ipcRenderer?.invoke(
      'ftp:upload-file',
      'items',
      await photoFile.value.arrayBuffer(),
      photoFile.value.name
    )

  if (uploadResult) {
    const res = await updateChangelog({
      ...state,
      uuid: uuid.value,
      src: preview.value ? photoFile.value.name : state.photo
    })

    if (res) {
      showToast('Pomyślnie edytowano changelog ' + state.name + '.')
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
  state.version = ''
  state.photo = ''
  state.type = 'normal'
  state.src = ''
  state.startDate = null
  state.changes = []
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
              <h2 id="ban-title">{{ actionType === 'add' ? 'Dodaj' : 'Edytuj' }} changelog</h2>
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
                  :src="
                    preview?.length
                      ? preview
                      : state.photo.includes('https://')
                        ? state.photo
                        : `${url}/changelog/image/${uuid}`
                  "
                  class="h-[4rem]"
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
              <small class="mb-1 text-[var(--text-secondary)]"> Nazwa changeloga</small>
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
              <label class="input-label mb-1">Wersja</label>
              <small class="mb-1 text-[var(--text-secondary)]"> Wersja changeloga</small>
              <div class="form-group h-full">
                <div class="input-wrapper flex">
                  <input
                    v-model="state.version"
                    type="text"
                    class="form-input !pl-[1rem]"
                    placeholder="Podaj wersję"
                    :class="{ invalid: v$.version.$error }"
                    aria-required="true"
                    required
                  />
                  <div class="input-line"></div>
                </div>
                <div class="error-message" :class="{ show: v$.version.$error }">
                  {{ v$.version.$errors[0]?.$message }}
                </div>
              </div>
            </div>
            <div class="flex flex-col w-full">
              <label class="input-label mb-1">Data</label>
              <small class="mb-1 text-[var(--text-secondary)]"> Data wydania changeloga </small>
              <div class="form-group">
                <DatePicker
                  v-model="state.startDate"
                  placeholder="Wybierz datę"
                  class="w-full"
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
              <label class="input-label mb-1">Typ</label>
              <small class="mb-1 text-[var(--text-secondary)]"> Typ dodawanego changeloga </small>
              <div class="toggle-group">
                <button
                  class="toggle-option"
                  :class="{ active: state.type === 'launcher' }"
                  :disabled="actionType === 'edit'"
                  @click="state.type = 'launcher'"
                >
                  Launcher
                </button>
                <button
                  class="toggle-option"
                  :class="{ active: state.type === 'server' }"
                  :disabled="actionType === 'edit'"
                  @click="state.type = 'server'"
                >
                  Serwer
                </button>
              </div>
            </div>
          </div>

          <div class="flex flex-col">
            <label class="input-label mb-1">Lista zmian</label>
            <small class="mb-1 text-[var(--text-secondary)]">
              Lista zmian wykonanych w danym changelogu
            </small>
            <div class="logs-table-wrapper">
              <table class="logs-table">
                <thead>
                  <tr class="font-black text-[0.9rem]">
                    <th>Typ</th>
                    <th>Opis</th>
                    <th>
                      <div class="relative flex flex-row-reverse gap-2">
                        <button class="info-btn" @click="state.changes.push({})">
                          <i :class="'fas fa-plus'"></i>
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="state.changes.length">
                    <tr v-for="(change, i) in state.changes" :key="i">
                      <td>
                        <div class="flex items-start gap-2">
                          <button
                            class="toggle-option !py-1"
                            :class="{
                              active: change.type === 'new'
                            }"
                            @click="change.type = 'new'"
                          >
                            Nowość
                          </button>
                          <button
                            class="toggle-option !py-1"
                            :class="{ active: change.type === 'fix' }"
                            @click="change.type = 'fix'"
                          >
                            Poprawka
                          </button>
                          <button
                            class="toggle-option !py-1"
                            :class="{ active: change.type === 'improve' }"
                            @click="change.type = 'improve'"
                          >
                            Ulepszenie
                          </button>
                        </div>
                      </td>
                      <td>
                        <div class="input-wrapper">
                          <div class="form-group !my-0">
                            <div class="flex">
                              <input
                                v-model="change.desc"
                                type="text"
                                class="form-input !py-1 !pl-[1rem]"
                                placeholder="Co zmieniono?"
                                aria-required="true"
                                required
                              />
                              <div class="input-line"></div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="flex flex-row-reverse gap-2">
                          <button class="ban-btn" @click="state.changes.splice(i, 1)">
                            <i :class="'fas fa-trash'"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </template>
                  <tr v-else>
                    <td class="px-4 py-2 text-[var(--text-secondary)]" :colspan="3">Brak zmian</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-footer flex ml-auto max-w-1/3">
          <button
            type="button"
            class="btn-primary"
            @click="actionType === 'add' ? addChangelog() : editChangelog()"
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
  background: var(--bg-dark);
  box-shadow: 0 0 1rem var(--border);
}

.modal-header {
  position: sticky;
  z-index: 700;
  background: var(--bg-dark);
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

.logs-table-wrapper {
  width: 100%;
  max-height: 250px;
  overflow-y: auto;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  position: relative;
  overflow-y: auto;
  border: 1px dashed var(--border);
}
.logs-table {
  width: 100%;
  border-collapse: collapse;
}
.logs-table th {
  background: var(--primary-dark);
  padding: 0.5rem 1rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.logs-table td {
  padding: 0.25rem 1rem;
  border-bottom: 1px solid var(--border);
}

.logs-table tr {
  background: #0000004d;
}

.logs-table tr:hover {
  background: var(--bg-card);
}
</style>
