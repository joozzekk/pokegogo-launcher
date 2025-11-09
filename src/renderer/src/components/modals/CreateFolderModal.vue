<script lang="ts" setup>
import useVuelidate from '@vuelidate/core'
import { helpers, maxLength, minLength, required } from '@vuelidate/validators'
import { reactive, ref } from 'vue'

const modalVisible = ref(false)
const state = reactive({
  newFolder: ''
})

const openModal = (): void => {
  modalVisible.value = true
}

const v$ = useVuelidate(
  {
    newFolder: {
      required: helpers.withMessage('Nazwa jest wymagana', required),
      minLength: helpers.withMessage('Nazwa musi mieć co najmniej 3 znaki', minLength(3)),
      maxLength: helpers.withMessage('Nazwa może mieć maksymalnie 50 znaków', maxLength(50))
    }
  },
  state
)

const handleExit = async (): Promise<void> => {
  modalVisible.value = false
  state.newFolder = ''
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
              <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
            </div>
            <h2>Tworzenie folderu</h2>
          </div>
          <div>
            <button class="nav-icon" @click="handleExit">
              <i class="fa fa-x" />
            </button>
          </div>
        </div>
        <div class="modal-content">
          <div class="flex flex-col w-full">
            <label class="input-label mb-1">Nazwa folderu</label>
            <small class="mb-1 text-[var(--text-secondary)]">
              Podaj nazwę folderu (do 50 znaków). Nie używaj znaków specjalnych.
            </small>
            <div class="form-group h-full">
              <div class="input-wrapper flex">
                <input
                  v-model="state.newFolder"
                  type="text"
                  class="form-input !pl-[1rem]"
                  placeholder="Podaj nazwę"
                  :class="{ invalid: v$.newFolder.$error }"
                  aria-required="true"
                  required
                />
                <div class="input-line"></div>
              </div>
              <div class="error-message" :class="{ show: v$.newFolder.$error }">
                {{ v$.newFolder.$errors[0]?.$message }}
              </div>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn-primary" @click="handleSubmit">Utwórz</button>
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
