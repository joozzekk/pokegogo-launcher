<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import { createItem, updateItem } from '@ui/api/endpoints'
import { FTPChannel } from '@ui/types/ftp'
import { showToast } from '@ui/utils'
import useVuelidate from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'
import { computed, reactive, ref } from 'vue'
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
  type: 'rank',
  photo: '',
  index: 0,
  price: 1.0,
  desc: '',
  src: '',
  command: '',
  item: '',
  rank: '',
  count: 1,
  days: 30,
  promotion: 0
})

const fileInputRef = ref<HTMLInputElement | null>(null)

const rules = computed(() => {
  return {
    name: {
      required: helpers.withMessage(t('general.required'), required)
    },
    desc: {
      required: helpers.withMessage(t('general.required'), required)
    },
    price: {
      required: helpers.withMessage(t('general.required'), required),
      isMoreThanZero: helpers.withMessage(
        t('addItem.errors.greaterThanZero'),
        (v: string | number) => {
          return typeof v === 'string' ? parseInt(v) !== 0 : v !== 0
        }
      )
    },
    photo: {
      required: helpers.withMessage(t('general.required'), required)
    },
    ...(state.type === 'rank'
      ? {
          rank: {
            required: helpers.withMessage(t('general.required'), required)
          },
          days: {
            required: helpers.withMessage(t('general.required'), required),
            isMoreThanZero: helpers.withMessage(
              t('addItem.errors.greaterThanZero'),
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
            required: helpers.withMessage(t('general.required'), required)
          }
        }
      : {}),
    ...(state.type === 'item' || state.type === 'key_item'
      ? {
          item: {
            required: helpers.withMessage(t('general.required'), required)
          },
          count: {
            required: helpers.withMessage(t('general.required'), required),
            isMoreThanZero: helpers.withMessage(
              t('addItem.errors.greaterThanZero'),
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
    state.index = item.index || 0
    state.price = item.price
    state.promotion = item.promotion
    state.count = item.count || 1
    state.days = item.days || 30
    state.type = getTypeByServiceName(item.serviceName)

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
  if (isSaving.value) return
  const isValid = await v$.value.$validate()
  if (!isValid || !preview.value || !photoFile.value) return

  isSaving.value = true
  try {
    let uploadResult = true

    if (preview.value)
      uploadResult = await window.electron.ipcRenderer?.invoke(
        FTPChannel.UPLOAD_FILE,
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
        showToast(`${t('addItem.success.add')} ${state.name}.`)
        handleCancel()
        await emits('refreshData')
      }
    }
  } finally {
    isSaving.value = false
  }
}

const editItem = async (): Promise<void> => {
  if (isSaving.value) return
  const isValid = await v$.value.$validate()
  if (!isValid || !photoFile.value) return

  isSaving.value = true
  try {
    let uploadResult = true
    if (preview.value)
      uploadResult = await window.electron.ipcRenderer?.invoke(
        FTPChannel.UPLOAD_FILE,
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
        src: preview.value ? photoFile.value.name : state.photo
      })

      if (res) {
        showToast(`${t('addItem.success.edit')} ${state.name}.`)
        await emits('refreshData')
        handleCancel()
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
  state.type = 'rank'
  state.index = 0
  state.price = 1.0
  state.src = ''
  state.command = ''
  state.item = ''
  state.rank = ''
  state.days = 30
  state.count = 1
  state.promotion = 0
  preview.value = ''
  photoFile.value = null
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
                <i class="fas fa-box-open"></i>
              </div>
              <h3>{{ actionType === 'add' ? t('addItem.title.add') : t('addItem.title.edit') }}</h3>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="text-gray-400 hover:text-white transition-colors cursor-help group relative flex items-center justify-center w-8 h-8 rounded-lg"
              >
                <i class="fas fa-info-circle text-lg"></i>
                <div
                  class="absolute right-0 top-full mt-2 w-64 p-3 bg-[#111111] border border-white/10 rounded-xl text-xs text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl"
                >
                  <h4 class="text-white font-semibold mb-2 text-sm">
                    {{ t('addItem.tooltips.placeholders.title') }}
                  </h4>
                  <ul class="list-disc pl-4 space-y-1 text-left">
                    <li>
                      <strong class="text-white">{player}</strong> -
                      {{ t('addItem.tooltips.placeholders.player') }}
                    </li>
                    <li>
                      <strong class="text-white">{amount}</strong> -
                      {{ t('addItem.tooltips.placeholders.amount') }}
                    </li>
                    <li>
                      <strong class="text-white">{item}</strong> -
                      {{ t('addItem.tooltips.placeholders.item') }}
                    </li>
                    <li>
                      <strong class="text-white">{rank}</strong> -
                      {{ t('addItem.tooltips.placeholders.rank') }}
                    </li>
                    <li>
                      <strong class="text-white">{days}</strong> -
                      {{ t('addItem.tooltips.placeholders.days') }}
                    </li>
                  </ul>
                </div>
              </div>
              <button class="g-close-btn" @click="handleCancel">
                <i class="fas fa-times"></i>
              </button>
            </div>
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
                    :src="
                      preview?.length
                        ? preview
                        : state.photo.includes('https://')
                          ? state.photo
                          : `${url}/items/image/${uuid}`
                    "
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
                <!-- Name & Index -->
                <div class="flex gap-2">
                  <div class="flex flex-col gap-1 w-full">
                    <label class="text-sm font-semibold text-gray-400">{{
                      t('addItem.labels.name')
                    }}</label>
                    <input
                      v-model="state.name"
                      type="text"
                      class="g-input"
                      :placeholder="t('addItem.placeholders.name')"
                      :class="{ '!border-red-500': v$.name.$error }"
                    />
                    <span v-if="v$.name.$error" class="text-xs text-red-500">{{
                      v$.name.$errors[0]?.$message
                    }}</span>
                  </div>
                  <div class="flex flex-col gap-1 min-w-[5rem]">
                    <label class="text-sm font-semibold text-gray-400">{{
                      t('addItem.labels.index')
                    }}</label>
                    <input v-model="state.index" type="number" class="g-input" placeholder="0" />
                  </div>
                </div>

                <!-- Price & Promotion -->
                <div class="flex gap-2">
                  <div class="flex flex-col gap-1 w-full">
                    <label class="text-sm font-semibold text-gray-400">{{
                      t('addItem.labels.price')
                    }}</label>
                    <input
                      v-model="state.price"
                      type="number"
                      step="0.01"
                      :min="0.01"
                      class="g-input"
                      :placeholder="t('addItem.placeholders.price')"
                      :class="{ '!border-red-500': v$.price.$error }"
                    />
                    <span v-if="v$.price.$error" class="text-xs text-red-500">{{
                      v$.price.$errors[0]?.$message
                    }}</span>
                  </div>
                  <div class="flex flex-col gap-1 w-full">
                    <label class="text-sm font-semibold text-gray-400">{{
                      t('addItem.labels.promotion')
                    }}</label>
                    <input
                      v-model="state.promotion"
                      type="number"
                      step="0.01"
                      class="g-input"
                      :placeholder="t('addItem.placeholders.number')"
                    />
                  </div>
                </div>

                <!-- Type Selector -->
                <div class="flex flex-col gap-1">
                  <label class="text-sm font-semibold text-gray-400">{{
                    t('addItem.labels.type')
                  }}</label>
                  <div class="flex bg-black/20 p-1 rounded-xl gap-1">
                    <button
                      v-for="type in ['rank', 'key_item', 'item', 'custom']"
                      :key="type"
                      class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize"
                      :class="
                        state.type === type
                          ? 'bg-[var(--bg-card)] text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      "
                      :disabled="actionType === 'edit'"
                      @click="state.type = type"
                    >
                      {{ t(`addItem.types.${type === 'key_item' ? 'key' : type}`) }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="flex flex-col gap-1 mt-3">
              <label class="text-sm font-semibold text-gray-400">{{
                t('addItem.labels.desc')
              }}</label>
              <textarea
                v-model="state.desc"
                class="g-input !h-auto resize-none"
                rows="4"
                :placeholder="t('addItem.placeholders.desc')"
                :class="{ '!border-red-500': v$.desc.$error }"
              ></textarea>
              <span v-if="v$.desc.$error" class="text-xs text-red-500">{{
                v$.desc.$errors[0]?.$message
              }}</span>
            </div>

            <!-- Dynamic Fields per Type -->
            <div class="flex gap-3 mt-3">
              <template v-if="state.type === 'rank' || state.type === 'custom'">
                <div class="flex flex-col gap-1 w-full">
                  <label class="text-sm font-semibold text-gray-400">{{
                    t('addItem.labels.rankName')
                  }}</label>
                  <input
                    v-model="state.rank"
                    type="text"
                    class="g-input"
                    :class="{ '!border-red-500': v$.rank?.$error }"
                  />
                  <span v-if="v$.rank?.$error" class="text-xs text-red-500">{{
                    v$.rank?.$errors[0]?.$message
                  }}</span>
                </div>
                <div class="flex flex-col gap-1 w-full">
                  <label class="text-sm font-semibold text-gray-400">{{
                    t('addItem.labels.duration')
                  }}</label>
                  <input
                    v-model="state.days"
                    type="number"
                    class="g-input"
                    :class="{ '!border-red-500': v$.days?.$error }"
                  />
                  <span v-if="v$.days?.$error" class="text-xs text-red-500">{{
                    v$.days?.$errors[0]?.$message
                  }}</span>
                </div>
              </template>

              <template
                v-if="state.type === 'item' || state.type === 'key_item' || state.type === 'custom'"
              >
                <div class="flex flex-col gap-1 w-full">
                  <label class="text-sm font-semibold text-gray-400">
                    {{
                      state.type === 'key_item'
                        ? t('addItem.labels.keyName')
                        : t('addItem.labels.itemId')
                    }}
                  </label>
                  <input
                    v-model="state.item"
                    type="text"
                    class="g-input"
                    :class="{ '!border-red-500': v$.item?.$error }"
                  />
                  <span v-if="v$.item?.$error" class="text-xs text-red-500">{{
                    v$.item?.$errors[0]?.$message
                  }}</span>
                </div>
                <div class="flex flex-col gap-1 w-full">
                  <label class="text-sm font-semibold text-gray-400">{{
                    t('addItem.labels.amount')
                  }}</label>
                  <input
                    v-model="state.count"
                    type="number"
                    class="g-input"
                    :class="{ '!border-red-500': v$.count?.$error }"
                  />
                  <span v-if="v$.count?.$error" class="text-xs text-red-500">{{
                    v$.count?.$errors[0]?.$message
                  }}</span>
                </div>
              </template>
            </div>

            <template v-if="state.type === 'custom'">
              <div class="flex flex-col gap-1 mt-3">
                <label class="text-sm font-semibold text-gray-400">{{
                  t('addItem.labels.command')
                }}</label>
                <input
                  v-model="state.command"
                  type="text"
                  class="g-input"
                  :placeholder="t('addItem.placeholders.command')"
                  :class="{ '!border-red-500': v$.command?.$error }"
                />
                <span v-if="v$.command?.$error" class="text-xs text-red-500">{{
                  v$.command?.$errors[0]?.$message
                }}</span>
              </div>
            </template>
          </div>

          <div class="g-modal-footer">
            <button class="g-btn" @click="handleCancel">Anuluj</button>
            <button
              class="g-btn primary flex-1"
              :disabled="isSaving"
              @click="actionType === 'add' ? addItem() : editItem()"
            >
              <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fa fa-save" />
              {{ isSaving ? 'Zapisywanie...' : 'Zapisz' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.g-modal-content {
  overflow-y: auto;
  max-height: 75vh;
  padding-right: 0.5rem;
}

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
