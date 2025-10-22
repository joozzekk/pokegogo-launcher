<script lang="ts" setup>
import { changeEmail, changePassword } from '@renderer/api/endpoints'
import { applyTheme, themes } from '@renderer/assets/theme/official'
import useGeneralStore from '@renderer/stores/general-store'
import useUserStore from '@renderer/stores/user-store'
import { calculateValueFromPercentage, checkUpdate, MIN_RAM, showToast } from '@renderer/utils'
import useVuelidate from '@vuelidate/core'
import { helpers, required, sameAs } from '@vuelidate/validators'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

const userStore = useUserStore()
const generalStore = useGeneralStore()
const accountType = localStorage.getItem('LOGIN_TYPE')

const state = reactive({
  email: userStore.user?.email ?? '',
  old: '',
  new: '',
  repeatNew: '',
  showedOld: false,
  showedNew: false,
  showedRepeatNew: false
})

const rules = computed(() => ({
  old: {
    required: helpers.withMessage('To pole jest wymagane', required)
  },
  new: {
    required: helpers.withMessage('To pole jest wymagane', required),
    sameAs: helpers.withMessage('Hasła muszą być identyczne', sameAs(state.repeatNew))
  },
  repeatNew: {
    required: helpers.withMessage('To pole jest wymagane', required),
    sameAs: helpers.withMessage('Hasła muszą być identyczne', sameAs(state.new))
  }
}))

const v$ = useVuelidate(rules, state)
const emailV$ = useVuelidate(
  {
    email: {
      required: helpers.withMessage('To pole jest wymagane', required),
      email: helpers.withMessage('Nieprawidłowy adres email', (value: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(value)
      })
    }
  },
  state
)

const sliderRef = ref<HTMLInputElement | null>(null)
const displayRef = ref<HTMLInputElement | null>(null)

const percent = ref(0)

const changeResolution = (resolution: string): void => {
  generalStore.settings.resolution = resolution
}

watch(
  () => generalStore.settings.ram,
  (newVal) => {
    if (sliderRef.value) {
      percent.value = calculateValueFromPercentage(
        newVal,
        sliderRef.value.offsetWidth,
        generalStore.settings.maxRAM
      )
    }
    if (displayRef.value) {
      displayRef.value.textContent = `${newVal}GB`
      displayRef.value.style.left = percent.value + 'px'
    }
  },
  { immediate: true }
)

onMounted(async () => {
  generalStore.loadSettings()
  if (sliderRef.value) {
    percent.value = calculateValueFromPercentage(
      generalStore.settings.ram,
      sliderRef.value.offsetWidth,
      generalStore.settings.maxRAM
    )
  }
  if (displayRef.value) {
    displayRef.value.textContent = `${generalStore.settings.ram}GB`
    displayRef.value.style.left = percent.value + 'px'
  }
})

const saveSettings = (): void => {
  generalStore.saveSettings()
  showToast('Zapisano ustawienia.')
}

const resetSettings = (): void => {
  generalStore.resetSettings()
  showToast('Przywrócono domyślne ustawienia', 'success')
}

const handleChangePassword = async (): Promise<void> => {
  const isValid = await v$.value.$validate()
  if (!isValid || !userStore.user) return

  try {
    const res = await changePassword(userStore.user?.nickname, state.old, state.new)

    if (res) {
      showToast('Pomyślnie zmieniono hasło', 'success')
      state.old = ''
      state.new = ''
      state.repeatNew = ''
      v$.value.$reset()
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    showToast('Nie udało się zmienić hasła', 'error')
    return
  }
}

watch(
  () => userStore.user,
  (newUser) => {
    state.email = newUser?.email ?? ''
  }
)

const handleChangeEmail = async (): Promise<void> => {
  const isValid = await emailV$.value.$validate()
  if (!isValid || !userStore.user) return

  try {
    const res = await changeEmail(userStore.user?.nickname, state.email)

    if (res) {
      showToast('Pomyślnie zmieniono email', 'success')
      emailV$.value.$reset()
      await userStore.logout()
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    showToast('Nie udało się zmienić email', 'error')
    return
  }
}

const handleChangeUpdateChannel = async (channel: string): Promise<void> => {
  generalStore.settings.updateChannel = channel
  generalStore.saveSettings()
  await checkUpdate()
  showToast(generalStore.isUpdateAvailable ? 'Update available.' : 'App is up-to-date.')
}

onUnmounted(() => {
  generalStore.saveSettings()
})
</script>

<template>
  <div class="settings-container">
    <div class="settings-grid card-panel min-h-full overflow-y-auto">
      <div>
        <div class="card-header">
          <div class="card-title">
            <div class="nav-icon">
              <i class="fas fa-cog"></i>
            </div>
            <h2>Ustawienia gry</h2>
            <span class="applogo-badge">{{ generalStore.appVersion?.split('-')[0] }}</span>
          </div>
        </div>

        <div class="setting-group">
          <label>Rozdzielczość</label>
          <div class="toggle-group">
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.resolution === '1920x1080' }"
              @click="changeResolution('1920x1080')"
            >
              1920x1080
            </button>
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.resolution === '1366x768' }"
              @click="changeResolution('1366x768')"
            >
              1366x768
            </button>
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.resolution === '1200x720' }"
              @click="changeResolution('1200x720')"
            >
              1200x720
            </button>
          </div>
        </div>

        <div class="setting-group">
          <label>Pamięć RAM</label>
          <div class="ram-slider-container">
            <input
              id="ramSlider"
              ref="sliderRef"
              v-model="generalStore.settings.ram"
              type="range"
              :min="MIN_RAM"
              :max="generalStore.settings.maxRAM"
              :step="1"
            />
            <div ref="displayRef" class="ram-display"></div>
            <div class="ram-markers">
              <span>{{ MIN_RAM }}GB</span>
              <span
                >{{
                  MIN_RAM + parseFloat(((generalStore.settings.maxRAM - MIN_RAM) / 2).toFixed(1))
                }}GB</span
              >
              <span>{{ generalStore.settings.maxRAM }}GB</span>
            </div>
          </div>
        </div>

        <div class="my-0 flex flex-row items-center justify-between mb-4">
          <div class="text-[var(--text-secondary)] w-full">Tryb wyświetlania gry</div>

          <div class="flex items-center gap-2 w-full">
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.displayMode === 'Okno' }"
              @click="generalStore.settings.displayMode = 'Okno'"
            >
              Okno
            </button>
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.displayMode === 'Pełny ekran' }"
              @click="generalStore.settings.displayMode = 'Pełny ekran'"
            >
              Pełny ekran
            </button>
          </div>
        </div>

        <div class="card-header !mb-0">
          <div class="card-title">
            <div class="nav-icon">
              <i class="fas fa-user"></i>
            </div>
            <h2>Ustawienia launchera</h2>
          </div>
        </div>

        <div
          v-if="userStore.user?.role === 'admin'"
          class="my-0 flex flex-row items-center justify-between"
        >
          <div class="text-[var(--text-secondary)]">Motyw</div>

          <div class="flex gap-2 my-4">
            <button
              v-for="theme in themes"
              :key="theme.primary"
              class="nav-icon !w-[2rem] !h-[2rem] !text-[1rem]"
              @click="applyTheme(theme)"
            >
              <i class="fa fa-home" :style="{ color: theme.primary }" />
            </button>
          </div>
        </div>

        <div
          class="my-0 flex flex-row items-center justify-between"
          :class="{ 'mt-4': userStore.user?.role !== 'admin' }"
        >
          <div class="text-[var(--text-secondary)]">Powiadomienia</div>

          <div class="flex items-center gap-2">
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.showNotifications === true }"
              @click="generalStore.setShowNotifications(true)"
            >
              Włączone
            </button>
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.showNotifications === false }"
              @click="generalStore.setShowNotifications(false)"
            >
              Wyłączone
            </button>
          </div>
        </div>

        <div class="my-0 mt-4 flex flex-row items-center justify-between">
          <div class="text-[var(--text-secondary)]">Ukrywanie w zasobniku</div>

          <div class="flex items-center gap-2">
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.hideToTray === true }"
              @click="generalStore.setHideToTray(true)"
            >
              Włączone
            </button>
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.hideToTray === false }"
              @click="generalStore.setHideToTray(false)"
            >
              Wyłączone
            </button>
          </div>
        </div>

        <div class="my-0 mt-4 flex flex-row items-center justify-between">
          <div class="text-[var(--text-secondary)] w-full">Automatyczne aktualizacje</div>

          <div class="flex items-center gap-2">
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.autoUpdate === true }"
              @click="generalStore.settings.autoUpdate = true"
            >
              Włączone
            </button>
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.autoUpdate === false }"
              @click="generalStore.settings.autoUpdate = false"
            >
              Wyłączone
            </button>
          </div>
        </div>

        <div
          v-if="userStore.user?.role === 'admin'"
          class="my-0 mt-4 flex flex-row items-center justify-between"
        >
          <div class="text-[var(--text-secondary)] w-full">Kanał aktualizacji</div>

          <div class="flex items-center gap-2">
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.updateChannel === 'beta' }"
              @click="handleChangeUpdateChannel('beta')"
            >
              Beta
            </button>
            <button
              class="toggle-option !py-[0.25rem]"
              :class="{ active: generalStore.settings.updateChannel === 'dev' }"
              @click="handleChangeUpdateChannel('dev')"
            >
              Dev
            </button>
          </div>
        </div>
      </div>

      <div>
        <div class="card-header">
          <div class="card-title">
            <div class="nav-icon">
              <i class="fas fa-user"></i>
            </div>
            <h2>Ustawienia Konta</h2>
          </div>

          <div class="settings-actions">
            <button id="saveSettings" class="nav-icon" @click="saveSettings">
              <i class="fas fa-save"></i>
            </button>
            <button id="resetSettings" class="nav-icon" @click="resetSettings">
              <i class="fas fa-undo"></i>
            </button>
          </div>
        </div>

        <div class="setting-group !w-full">
          <label>Zmiana emaila</label>
          <div class="flex gap-2 !w-full items-center">
            <div class="form-group !w-full">
              <div class="input-wrapper !w-full flex">
                <i class="fas fa-lock input-icon"></i>
                <input
                  id="login-email"
                  v-model="state.email"
                  type="email"
                  class="form-input"
                  placeholder="Adres email"
                  :class="{ invalid: emailV$.email.$error }"
                  required
                />
                <div class="input-line"></div>
              </div>
              <div class="error-message" :class="{ show: emailV$.email.$error }">
                {{ emailV$.email.$errors[0]?.$message }}
              </div>
            </div>
            <button class="btn-primary mb-4 max-w-1/3" @click="handleChangeEmail">
              <i class="fas fa-edit"></i>
              Zmień email
            </button>
          </div>

          <template v-if="accountType === 'backend'">
            <label class="mt-[11px]">Zmiana hasła</label>
            <div class="form-group" :class="{ '!mb-5': v$.old.$error }">
              <div class="input-wrapper">
                <i class="fas fa-lock input-icon"></i>
                <input
                  v-model="state.old"
                  :type="!state.showedOld ? 'password' : 'text'"
                  class="form-input"
                  placeholder="Stare hasło"
                  :class="{ invalid: v$.old.$error }"
                  required
                />
                <button
                  id="login-toggle"
                  type="button"
                  class="password-toggle"
                  @click="state.showedOld = !state.showedOld"
                >
                  <i v-if="state.showedOld" class="far fa-eye-slash"></i>
                  <i v-else class="far fa-eye"></i>
                </button>
                <div class="input-line"></div>
              </div>
              <div class="error-message" :class="{ show: v$.old.$error }">
                {{ v$.old.$errors[0]?.$message }}
              </div>
            </div>

            <div class="form-group" :class="{ '!mb-5': v$.new.$error }">
              <div class="input-wrapper">
                <i class="fas fa-lock input-icon"></i>
                <input
                  v-model="state.new"
                  :type="!state.showedNew ? 'password' : 'text'"
                  class="form-input"
                  placeholder="Hasło"
                  :class="{ invalid: v$.new.$error }"
                  required
                />
                <button
                  id="login-toggle"
                  type="button"
                  class="password-toggle"
                  @click="state.showedNew = !state.showedNew"
                >
                  <i v-if="state.showedNew" class="far fa-eye-slash"></i>
                  <i v-else class="far fa-eye"></i>
                </button>
                <div class="input-line"></div>
              </div>
              <div class="error-message" :class="{ show: v$.new.$error }">
                {{ v$.new.$errors[0]?.$message }}
              </div>
            </div>

            <div class="form-group" :class="{ '!mb-5': v$.repeatNew.$error }">
              <div class="input-wrapper">
                <i class="fas fa-lock input-icon"></i>
                <input
                  v-model="state.repeatNew"
                  :type="!state.showedRepeatNew ? 'password' : 'text'"
                  class="form-input"
                  placeholder="Potwórz hasło"
                  :class="{ invalid: v$.repeatNew.$error }"
                  required
                />
                <button
                  id="login-toggle"
                  type="button"
                  class="password-toggle"
                  @click="state.showedRepeatNew = !state.showedRepeatNew"
                >
                  <i v-if="state.showedRepeatNew" class="far fa-eye-slash"></i>
                  <i v-else class="far fa-eye"></i>
                </button>
                <div class="input-line"></div>
              </div>
              <div class="error-message" :class="{ show: v$.repeatNew.$error }">
                {{ v$.repeatNew.$errors[0]?.$message }}
              </div>
            </div>

            <button
              class="btn-primary max-w-1/2"
              :class="{ 'mt-2': v$.repeatNew.$error }"
              @click="handleChangePassword"
            >
              <i class="fas fa-edit"></i>
              Zmień hasło
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
