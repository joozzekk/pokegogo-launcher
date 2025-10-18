<script lang="ts" setup>
import { changeEmail, changePassword } from '@renderer/api/endpoints'
import Select from '@renderer/components/Select.vue'
import useGeneralStore from '@renderer/stores/general-store'
import useUserStore from '@renderer/stores/user-store'
import { calculateValueFromPercentage, MIN_RAM, showToast } from '@renderer/utils'
import useVuelidate from '@vuelidate/core'
import { helpers, required, sameAs } from '@vuelidate/validators'
import { computed, onMounted, reactive, ref, watch } from 'vue'

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
const javaVersions = [
  {
    label: 'Java 21 (Zalecana)',
    value: 21
  }
]

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
</script>

<template>
  <div class="settings-container">
    <div class="settings-grid card-panel">
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
          <label>Pamięć RAM</label>
          <div class="ram-slider-container">
            <input
              id="ramSlider"
              ref="sliderRef"
              v-model="generalStore.settings.ram"
              type="range"
              :min="MIN_RAM"
              :max="generalStore.settings.maxRAM"
              :step="0.5"
            />
            <div id="ramDisplay" ref="displayRef" class="ram-display">6 GB</div>
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

        <div class="setting-group">
          <label>Tryb wyświetlania gry</label>
          <div class="toggle-group">
            <button
              class="toggle-option"
              :class="{ active: generalStore.settings.displayMode === 'Okno' }"
              @click="generalStore.settings.displayMode = 'Okno'"
            >
              Okno
            </button>
            <button
              class="toggle-option"
              :class="{ active: generalStore.settings.displayMode === 'Pełny ekran' }"
              @click="generalStore.settings.displayMode = 'Pełny ekran'"
            >
              Pełny ekran
            </button>
          </div>
        </div>

        <div class="setting-group">
          <label>Rozdzielczość</label>
          <div class="toggle-group">
            <button
              class="toggle-option"
              :class="{ active: generalStore.settings.resolution === '1920x1080' }"
              @click="changeResolution('1920x1080')"
            >
              1920x1080
            </button>
            <button
              class="toggle-option"
              :class="{ active: generalStore.settings.resolution === '1366x768' }"
              @click="changeResolution('1366x768')"
            >
              1366x768
            </button>
            <button
              class="toggle-option"
              :class="{ active: generalStore.settings.resolution === '1200x720' }"
              @click="changeResolution('1200x720')"
            >
              1200x720
            </button>
          </div>

          <div class="card-header mt-5">
            <div class="card-title">
              <div class="nav-icon">
                <i class="fas fa-user"></i>
              </div>
              <h2>Ustawienia launchera</h2>
            </div>
          </div>

          <div class="setting-group">
            <label>Otrzymywanie powiadmień</label>
            <div class="toggle-group">
              <button
                class="toggle-option"
                :class="{ active: generalStore.settings.showNotifications === true }"
                @click="generalStore.setShowNotifications(true)"
              >
                Otrzymuj
              </button>
              <button
                class="toggle-option"
                :class="{ active: generalStore.settings.showNotifications === false }"
                @click="generalStore.setShowNotifications(false)"
              >
                Nie powiadamiaj
              </button>
            </div>
          </div>

          <div class="setting-group">
            <label>Wyłączanie launchera</label>
            <div class="toggle-group">
              <button
                class="toggle-option"
                :class="{ active: generalStore.settings.hideToTray === true }"
                @click="generalStore.setHideToTray(true)"
              >
                Do zasobnika
              </button>
              <button
                class="toggle-option"
                :class="{ active: generalStore.settings.hideToTray === false }"
                @click="generalStore.setHideToTray(false)"
              >
                Całkowite wyłączanie
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="card-header">
          <div class="card-title">
            <div class="nav-icon">
              <i class="fas fa-coffee"></i>
            </div>
            <h2>Ustawienia Javy</h2>
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

        <div class="setting-group">
          <label>Wersja Java</label>
          <Select v-model="generalStore.settings.javaVersion" :options="javaVersions" disabled />
        </div>

        <div class="card-header">
          <div class="card-title">
            <div class="nav-icon">
              <i class="fas fa-user"></i>
            </div>
            <h2>Ustawienia Konta</h2>
          </div>
        </div>

        <div class="flex gap-2 items-center">
          <div class="form-group">
            <div class="input-wrapper flex">
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

        <div v-if="accountType === 'backend'" class="flex flex-col gap-2">
          <div class="form-group">
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

          <div class="form-group">
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

          <div class="form-group">
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

          <button class="btn-primary max-w-1/2" @click="handleChangePassword">
            <i class="fas fa-edit"></i>
            Zmień hasło
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
