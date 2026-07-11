<script lang="ts" setup>
import { useVuelidate } from '@vuelidate/core'
import { helpers, maxLength, minLength, required } from '@vuelidate/validators'
import { reactive, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const modalVisible = ref(false)
const state = reactive({
  newFolder: ''
})

const openModal = (): void => {
  modalVisible.value = true
}

const rules = computed(() => ({
  newFolder: {
    required: helpers.withMessage(t('createFolder.errors.required'), required),
    minLength: helpers.withMessage(t('createFolder.errors.minLength'), minLength(2)),
    maxLength: helpers.withMessage(t('createFolder.errors.maxLength'), maxLength(50))
  }
}))

const v$ = useVuelidate(rules, state)

const handleExit = async (): Promise<void> => {
  modalVisible.value = false
  state.newFolder = ''
  v$.value.$reset()
}

defineExpose({
  openModal
})

const emits = defineEmits<{
  (e: 'submit', newFolder: string): Promise<void> | void
}>()

const handleSubmit = async (): Promise<void> => {
  await v$.value.$validate()
  if (v$.value.$invalid) {
    return
  }

  await emits('submit', state.newFolder)
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
                <i class="fas fa-folder-plus"></i>
              </div>
              <h3>{{ t('createFolder.title') }}</h3>
            </div>
            <button class="g-close-btn" @click="handleExit">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="g-modal-content">
            <div class="flex flex-col gap-1 w-full">
              <label class="text-sm font-semibold text-gray-400">{{
                t('createFolder.label')
              }}</label>
              <input
                v-model="state.newFolder"
                type="text"
                class="g-input"
                :placeholder="t('createFolder.placeholder')"
                :class="{ '!border-red-500': v$.newFolder.$error }"
                @keyup.enter="handleSubmit"
              />
              <span v-if="v$.newFolder.$error" class="text-xs text-red-500">{{
                v$.newFolder.$errors[0]?.$message
              }}</span>
            </div>
          </div>

          <div class="g-modal-footer">
            <button class="g-btn" @click="handleExit">
              {{ t('createFolder.cancel') }}
            </button>
            <button class="g-btn primary flex-1" @click="handleSubmit">
              <i class="fas fa-check"></i>
              {{ t('createFolder.create') }}
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
