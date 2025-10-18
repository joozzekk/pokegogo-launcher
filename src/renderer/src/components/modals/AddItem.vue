<script lang="ts" setup>
import { createItem, updateItem } from '@renderer/api/endpoints'
import { showToast } from '@renderer/utils'
import useVuelidate from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'
import { computed, reactive, ref } from 'vue'

const url = import.meta.env.RENDERER_VITE_API_URL
const modalVisible = ref(false)
const photoFile = ref<File | null>(null)
const uuid = ref<string>('')
const state = reactive({
  name: '',
  type: 'rank',
  photo: '',
  price: 1.0,
  desc: '',
  src: '',
  command: '',
  item: '',
  rank: '',
  count: 1,
  days: 30
})

const fileInputRef = ref<HTMLInputElement | null>(null)

const rules = computed(() => {
  return {
    name: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    desc: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    price: {
      required: helpers.withMessage('Pole jest wymagane', required),
      isMoreThanZero: helpers.withMessage('Wartość musi być większa od 0', (v: string | number) => {
        return typeof v === 'string' ? parseInt(v) !== 0 : v !== 0
      })
    },
    photo: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    ...(state.type === 'rank'
      ? {
          rank: {
            required: helpers.withMessage('Pole jest wymagane', required)
          },
          days: {
            required: helpers.withMessage('Pole jest wymagane', required),
            isMoreThanZero: helpers.withMessage(
              'Wartość musi być większa od 0',
              (v: string | number) => {
                return typeof v === 'string' ? parseInt(v) !== 0 : v !== 0
              }
            )
          }
        }
      : {}),
    ...(state.type === 'custom'
      ? {
          command: {
            required: helpers.withMessage('Pole jest wymagane', required)
          }
        }
      : {}),
    ...(state.type === 'item' || state.type === 'key_item'
      ? {
          item: {
            required: helpers.withMessage('Pole jest wymagane', required)
          },
          count: {
            required: helpers.withMessage('Pole jest wymagane', required),
            isMoreThanZero: helpers.withMessage(
              'Wartość musi być większa od 0',
              (v: string | number) => {
                return typeof v === 'string' ? parseInt(v) !== 0 : v !== 0
              }
            )
          }
        }
      : {})
  }
})

const v$ = useVuelidate(rules, state)

const actionType = ref<string>('add')

const getTypeByServiceName = (name: string): string => {
  if (name.includes('key_item')) return 'key_item'
  if (name.includes('rank')) return 'rank'
  if (name.includes('item')) return 'item'
  return 'custom'
}

const emits = defineEmits<{
  (e: 'refreshData'): Promise<void>
}>()

const openModal = async (item: any, type: 'add' | 'edit' = 'add'): Promise<void> => {
  modalVisible.value = true
  actionType.value = type
  if (item) {
    uuid.value = item.uuid
    state.name = item.name
    state.desc = item.desc
    state.photo = item.src
    photoFile.value = item.src
    state.price = item.price
    state.type = getTypeByServiceName(item.serviceName)

    console.log(state.type)
    if (state.type === 'rank')
      state.rank = item.serviceName?.substring(0, item.serviceName.lastIndexOf('_rank'))
    if (state.type === 'item')
      state.item = item.serviceName?.substring(0, item.serviceName.lastIndexOf('_item'))
    if (state.type === 'key_item') {
      state.item = item.serviceName?.substring(0, item.serviceName.lastIndexOf('_key_item'))
      state.command = item.command
    }
    if (state.type === 'custom') {
      state.item = item.serviceName?.substring(0, item.serviceName.lastIndexOf('_custom'))
      state.command = item.command
    }
  }
}

const getServiceNameByType = (): string => {
  switch (state.type) {
    case 'key_item':
    case 'item':
      return state.item
    case 'rank':
      return state.rank
    default:
      return state.name
  }
}

const getCommandByType = (): string => {
  switch (state.type) {
    case 'key_item':
      return `crate key give {item} {amount} {player}`
    case 'item':
      return `give {player} {amount} {item}`
    case 'rank':
      return `lp user {player} parent set {rank} {days}d`
    default:
      return state.command
  }
}

const addItem = async (): Promise<void> => {
  const isValid = await v$.value.$validate()
  if (!isValid || !photoFile.value) return

  const uploadResult = await window.electron.ipcRenderer?.invoke(
    'ftp:upload-file',
    'items',
    await photoFile.value.arrayBuffer(),
    photoFile.value.name
  )

  if (uploadResult) {
    const res = await createItem({
      ...state,
      serviceName: getServiceNameByType(),
      command: getCommandByType(),
      src: photoFile.value.name
    })

    if (res) {
      showToast('Pomyślnie dodano nowy przedmiot ' + state.name + '.')
      handleCancel()
      await emits('refreshData')
    }
  }
}
const editItem = async (): Promise<void> => {
  const isValid = await v$.value.$validate()
  if (!isValid || !photoFile.value) return

  const uploadResult = await window.electron.ipcRenderer?.invoke(
    'ftp:upload-file',
    'items',
    await photoFile.value.arrayBuffer(),
    photoFile.value.name
  )

  if (uploadResult) {
    const res = await updateItem({
      ...state,
      uuid: uuid.value,
      serviceName: getServiceNameByType(),
      command: getCommandByType(),
      src: photoFile.value.name
    })

    if (res) {
      showToast('Pomyślnie edytowano przedmiot ' + state.name + '.')
      handleCancel()
      await emits('refreshData')
    }
  }
}

const handleUpdatePhoto = async (): Promise<void> => {
  if (!fileInputRef.value?.files?.length) return
  const files = Array.from(fileInputRef.value.files)
  photoFile.value = files[0]

  state.photo = URL.createObjectURL(photoFile.value)
}

const handleCancel = (): void => {
  v$.value.$reset()
  state.name = ''
  state.desc = ''
  state.photo = ''
  state.type = 'rank'
  state.price = 1.0
  state.src = ''
  state.command = ''
  state.item = ''
  state.rank = ''
  state.days = 30
  state.count = 1
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
              <h2 id="ban-title">{{ actionType === 'add' ? 'Dodaj' : 'Edytuj' }} przedmiot</h2>
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
                    state.photo.includes('https://') || state.photo.includes('blob')
                      ? state.photo
                      : `${url}/items/image/${uuid}`
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
              <small class="mb-1 text-[#5f5a41]"> Nazwa przedmiotu wyświetlana na stronie. </small>
              <div class="form-group h-full">
                <div class="input-wrapper flex">
                  <input
                    id="login-email"
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
              <label class="input-label mb-1">Cena</label>
              <small class="mb-1 text-[#5f5a41]"> Podaj cene przedmiotu. Minimalnie 1 </small>
              <div class="form-group h-full">
                <div class="input-wrapper flex">
                  <input
                    id="login-email"
                    v-model="state.price"
                    type="number"
                    :min="0.01"
                    :max="10000"
                    class="form-input !pl-[1rem]"
                    placeholder="Podaj nazwę"
                    :class="{ invalid: v$.price.$error }"
                    aria-required="true"
                    required
                  />
                  <div class="input-line"></div>
                </div>
                <div class="error-message" :class="{ show: v$.price.$error }">
                  {{ v$.price.$errors[0]?.$message }}
                </div>
              </div>
            </div>

            <div class="flex flex-col w-full">
              <label class="input-label mb-1">Typ</label>
              <small class="mb-1 text-[#5f5a41]"> Typ dodawanego przedmiotu </small>
              <div class="toggle-group">
                <button
                  class="toggle-option"
                  :class="{ active: state.type === 'rank' }"
                  :disabled="actionType === 'edit'"
                  @click="state.type = 'rank'"
                >
                  Ranga
                </button>
                <button
                  class="toggle-option"
                  :class="{ active: state.type === 'key_item' }"
                  :disabled="actionType === 'edit'"
                  @click="state.type = 'key_item'"
                >
                  Klucz
                </button>
                <button
                  class="toggle-option"
                  :class="{ active: state.type === 'item' }"
                  :disabled="actionType === 'edit'"
                  @click="state.type = 'item'"
                >
                  Item
                </button>
                <button
                  class="toggle-option"
                  :class="{ active: state.type === 'custom' }"
                  :disabled="actionType === 'edit'"
                  @click="state.type = 'custom'"
                >
                  Inny
                </button>
              </div>
            </div>
          </div>

          <div class="flex flex-col">
            <label class="input-label mb-1">Opis</label>
            <small class="mb-1 text-[#5f5a41]">
              Opis jest formatowany. Jeśli chcesz, aby wyświetlał się dobrze na stronie pamiętaj,
              aby pisać tekst w nowych liniach.
            </small>
            <div class="form-group">
              <textarea
                v-model="state.desc"
                placeholder="Podaj opis.."
                :rows="6"
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
        </div>

        <template v-if="state.type === 'rank' || state.type === 'custom'">
          <div class="flex gap-2">
            <div class="flex flex-col w-full">
              <label class="input-label">Nazwa rangi</label>
              <small class="mb-1 text-[#5f5a41]"
                >Nazwa rangi z LuckyPerms. Przykłady: vip, mvp, ultra, legend.</small
              >
              <div class="form-group !mt-0 !translate-y-[2px]">
                <div class="input-wrapper flex">
                  <input
                    id="login-email"
                    v-model="state.rank"
                    type="text"
                    class="form-input !pl-[1rem]"
                    placeholder="Podaj komendę"
                    :class="{ invalid: v$.rank?.$error }"
                    aria-required="true"
                    required
                  />
                  <div class="input-line"></div>
                </div>
                <div class="error-message" :class="{ show: v$.rank?.$error }">
                  {{ v$.rank?.$errors[0]?.$message }}
                </div>
              </div>
            </div>

            <div class="flex flex-col w-full">
              <label class="input-label">Długość trwania</label>
              <small class="mb-1 text-[#5f5a41]"
                >Podaj czas na jaki gracz otrzyma tę rangę. Domyślnie 30</small
              >
              <div class="form-group !mt-0 !translate-y-[2px]">
                <div class="input-wrapper flex">
                  <input
                    id="login-email"
                    v-model="state.days"
                    type="number"
                    class="form-input !pl-[1rem]"
                    placeholder="Podaj ilość dni"
                    :class="{ invalid: v$.days?.$error }"
                    aria-required="true"
                    required
                  />
                  <div class="input-line"></div>
                </div>
                <div class="error-message" :class="{ show: v$.days?.$error }">
                  {{ v$.days?.$errors[0]?.$message }}
                </div>
              </div>
            </div>
          </div>
        </template>

        <div
          v-if="state.type === 'item' || state.type === 'key_item' || state.type === 'custom'"
          class="flex gap-2"
        >
          <div class="flex flex-col w-full">
            <label class="input-label">{{
              state.type === 'key_item' ? 'Nazwa klucza' : 'ID Przedmiotu'
            }}</label>
            <small class="mb-1 text-[#5f5a41]">
              {{
                state.type === 'key_item'
                  ? 'Wpisz nazwę klucza z pluginu, np. legendary, mythic'
                  : 'Wpisz nazwę przedmiotu, np. cobblemon:master_ball'
              }}
            </small>
            <div class="form-group !mt-0 !translate-y-[2px]">
              <div class="input-wrapper flex">
                <input
                  id="login-email"
                  v-model="state.item"
                  type="text"
                  class="form-input !pl-[1rem]"
                  placeholder="Podaj komendę"
                  :class="{ invalid: v$.item?.$error }"
                  aria-required="true"
                  required
                />
                <div class="input-line"></div>
              </div>
              <div class="error-message" :class="{ show: v$.item?.$error }">
                {{ v$.item?.$errors[0]?.$message }}
              </div>
            </div>
          </div>

          <div class="flex flex-col w-full">
            <label class="input-label">Ilość do sprzedaży</label>
            <small class="mb-1 text-[#5f5a41]">
              Podaj ilość w jakiej będzie sprzedawany przedmiot. Domyślnie 1
            </small>
            <div class="form-group !mt-0 !translate-y-[2px]">
              <div class="input-wrapper flex">
                <input
                  id="login-email"
                  v-model="state.count"
                  type="number"
                  class="form-input !pl-[1rem]"
                  placeholder="Podaj ilość"
                  :class="{ invalid: v$.count?.$error }"
                  aria-required="true"
                  required
                />
                <div class="input-line"></div>
              </div>
              <div class="error-message" :class="{ show: v$.count?.$error }">
                {{ v$.count?.$errors[0]?.$message }}
              </div>
            </div>
          </div>
        </div>

        <template v-if="state.type === 'custom'">
          <label class="input-label">Komenda</label>
          <small class="mb-1 text-[#5f5a41]">
            Możesz wykorzystywać różne zmienne podane wyżej. {player} - nick gracza. Podane wyżej:
            {amount} - ilość przedmiotu, {item} - nazwa przedmiotu, {rank} - nazwa rangi, {days} -
            długość trwania.
          </small>
          <div class="form-group !mt-0 !translate-y-[2px]">
            <div class="input-wrapper flex">
              <input
                id="login-email"
                v-model="state.command"
                type="text"
                class="form-input !pl-[1rem]"
                placeholder="Podaj komendę"
                :class="{ invalid: v$.command?.$error }"
                aria-required="true"
                required
              />
              <div class="input-line"></div>
            </div>
            <div class="error-message" :class="{ show: v$.command?.$error }">
              {{ v$.command?.$errors[0]?.$message }}
            </div>
          </div>
        </template>

        <div class="modal-footer flex ml-auto max-w-1/3">
          <button
            type="button"
            class="btn-primary"
            @click="actionType === 'add' ? addItem() : editItem()"
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
  z-index: 1100;
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
  background: rgba(16, 14, 10, 0.95);
  box-shadow: 0 0 1rem rgba(52, 49, 35, 0.569);
}

.modal-header {
  position: sticky;
  z-index: 1100;
  background: rgba(16, 14, 10, 0.95);
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
