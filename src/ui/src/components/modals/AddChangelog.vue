<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import { createChangelog, updateChangelog } from '@ui/api/endpoints'
import { FTPChannel } from '@ui/types/ftp'
import { showToast } from '@ui/utils'
import useVuelidate from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'
import { parseISO } from 'date-fns'
import DatePicker from 'primevue/datepicker'

import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
      required: helpers.withMessage(t('general.required'), required)
    },
    version: {
      required: helpers.withMessage(t('general.required'), required)
    },
    type: {
      required: helpers.withMessage(t('general.required'), required)
    },
    photo: {
      required: helpers.withMessage(t('general.required'), required)
    },
    startDate: {
      required: helpers.withMessage(t('general.required'), required)
    },
    changes: {
      required: helpers.withMessage(t('general.required'), required)
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
      FTPChannel.UPLOAD_FILE,
      'changelog',
      await photoFile.value.arrayBuffer(),
      photoFile.value.name
    )

  if (uploadResult) {
    const res = await createChangelog({
      ...state,
      src: photoFile.value.name
    })

    if (res) {
      showToast(`${t('changelog.addSuccess')} ${state.name}.`)
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
    uploadResult = await window.electron.ipcRenderer?.invoke(
      FTPChannel.UPLOAD_FILE,
      'changelog',
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
      showToast(`${t('changelog.editSuccess')} ${state.name}.`)
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

const getBadgeColor = (type: string): string => {
  switch (type) {
    case 'new':
      return 'bg-green-500/20 text-green-400'
    case 'fix':
      return 'bg-red-500/20 text-red-400'
    case 'improve':
      return 'bg-blue-500/20 text-blue-400'
    default:
      return 'bg-gray-500/20 text-gray-400'
  }
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
                <i class="fas fa-edit"></i>
              </div>
              <h3>
                {{ actionType === 'add' ? t('changelog.addTitle') : t('changelog.editTitle') }}
              </h3>
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
                    :src="preview?.length > 0 ? preview : `${url}/changelog/image/${uuid}`"
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
                    t('changelog.labels.name')
                  }}</label>
                  <input
                    v-model="state.name"
                    type="text"
                    class="g-input"
                    :placeholder="t('changelog.placeholders.name')"
                    :class="{ '!border-red-500': v$.name.$error }"
                  />
                  <span v-if="v$.name.$error" class="text-xs text-red-500">{{
                    v$.name.$errors[0]?.$message
                  }}</span>
                </div>

                <!-- Version & Date -->
                <div class="flex gap-2">
                  <div class="flex flex-col gap-1 w-full">
                    <label class="text-sm font-semibold text-gray-400">{{
                      t('changelog.labels.version')
                    }}</label>
                    <input
                      v-model="state.version"
                      type="text"
                      class="g-input"
                      :placeholder="t('changelog.placeholders.version')"
                      :class="{ '!border-red-500': v$.version.$error }"
                    />
                    <span v-if="v$.version.$error" class="text-xs text-red-500">{{
                      v$.version.$errors[0]?.$message
                    }}</span>
                  </div>
                  <div class="flex flex-col gap-1 w-full">
                    <label class="text-sm font-semibold text-gray-400">{{
                      t('changelog.labels.date')
                    }}</label>
                    <DatePicker
                      v-model="state.startDate"
                      :placeholder="t('changelog.placeholders.date')"
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
                </div>

                <!-- Type Toggle -->
                <div class="flex flex-col gap-1">
                  <label class="text-sm font-semibold text-gray-400">{{
                    t('changelog.labels.type')
                  }}</label>
                  <div class="flex bg-black/20 p-1 rounded-xl">
                    <button
                      class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all"
                      :class="
                        state.type === 'launcher'
                          ? 'bg-[var(--bg-card)] text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      "
                      :disabled="actionType === 'edit'"
                      @click="state.type = 'launcher'"
                    >
                      {{ t('changelog.types.launcher') }}
                    </button>
                    <button
                      class="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all"
                      :class="
                        state.type === 'server'
                          ? 'bg-[var(--bg-card)] text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      "
                      :disabled="actionType === 'edit'"
                      @click="state.type = 'server'"
                    >
                      {{ t('changelog.types.server') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Changes Table -->
            <div class="flex flex-col gap-2 mt-4">
              <div class="flex justify-between items-center">
                <label class="text-sm font-semibold text-gray-400">{{
                  t('changelog.labels.changes')
                }}</label>
                <button class="g-btn text-xs !py-1 !px-2" @click="state.changes.push({})">
                  <i class="fas fa-plus mr-1"></i> {{ t('general.add') }}
                </button>
              </div>

              <div class="g-card bg-black/20 overflow-hidden !p-0 border border-white/5 rounded-xl">
                <table class="w-full text-sm text-left text-gray-400">
                  <thead class="text-xs uppercase bg-black/40 text-gray-300">
                    <tr>
                      <th class="px-4 py-3">{{ t('changelog.table.type') }}</th>
                      <th class="px-4 py-3">{{ t('changelog.table.desc') }}</th>
                      <th class="px-4 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/5">
                    <tr v-for="(change, i) in state.changes" :key="i" class="hover:bg-white/5">
                      <td class="px-4 py-2 w-48">
                        <div class="flex bg-black/20 p-0.5 rounded-lg gap-1">
                          <button
                            v-for="ctype in ['new', 'fix', 'improve']"
                            :key="ctype"
                            class="flex-1 py-1 text-[10px] font-bold uppercase rounded transition-all text-center"
                            :class="
                              change.type === ctype
                                ? getBadgeColor(ctype)
                                : 'text-gray-500 hover:text-gray-300'
                            "
                            @click="change.type = ctype"
                          >
                            {{ ctype[0] }}
                          </button>
                        </div>
                      </td>
                      <td class="px-4 py-2">
                        <input
                          v-model="change.desc"
                          type="text"
                          class="bg-transparent border-none text-white w-full focus:ring-0 placeholder-gray-600 text-sm"
                          :placeholder="t('changelog.placeholders.desc')"
                        />
                      </td>
                      <td class="px-4 py-2 text-right">
                        <button
                          class="text-red-400 hover:text-red-300 transition-colors"
                          @click="state.changes.splice(i, 1)"
                        >
                          <i class="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                    <tr v-if="state.changes.length === 0">
                      <td colspan="3" class="px-4 py-8 text-center text-gray-500 italic">
                        {{ t('changelog.noChanges', 'No changes added yet.') }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="g-modal-footer">
            <button class="g-btn" @click="handleCancel">
              {{ t('changelog.cancel') }}
            </button>
            <button
              class="g-btn primary flex-1"
              @click="actionType === 'add' ? addChangelog() : editChangelog()"
            >
              <i class="fa fa-save" />
              {{ t('changelog.save') }}
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
