<script lang="ts" setup>
import { changeEmail, changePassword } from '@ui/api/endpoints'
import { applyTheme, themes } from '@ui/assets/theme/themes'
import VerifyFilesModal from '@ui/components/modals/VerifyFilesModal.vue'
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import { AccountType, UserRole } from '@ui/types/app'
import { calculateValueFromPercentage, checkUpdate, MIN_RAM, showToast } from '@ui/utils'
import useVuelidate from '@vuelidate/core'
import { helpers, required, sameAs } from '@vuelidate/validators'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import CustomTheme from '@ui/components/modals/CustomTheme.vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const userStore = useUserStore()
const generalStore = useGeneralStore()

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
    required: helpers.withMessage(t('general.required'), required)
  },
  new: {
    required: helpers.withMessage(t('general.required'), required),
    sameAs: helpers.withMessage(t('general.passwordMismatch'), sameAs(state.repeatNew))
  },
  repeatNew: {
    required: helpers.withMessage(t('general.required'), required),
    sameAs: helpers.withMessage(t('general.passwordMismatch'), sameAs(state.new))
  }
}))

const v$ = useVuelidate(rules, state)
const emailV$ = useVuelidate(
  {
    email: {
      required: helpers.withMessage(t('general.required'), required),
      email: helpers.withMessage(t('general.emailInvalid'), (value: string) => {
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
  await generalStore.loadHardwareAcceleration()
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
  showToast(t('settings.successSave'))
}

const resetSettings = (): void => {
  generalStore.resetSettings()
  showToast(t('settings.successReset'), 'success')
}

const handleChangePassword = async (): Promise<void> => {
  const isValid = await v$.value.$validate()
  if (!isValid || !userStore.user) return

  try {
    const res = await changePassword(userStore.user?.nickname, state.old, state.new)

    if (res) {
      showToast(t('settings.successPasswordChange'), 'success')
      state.old = ''
      state.new = ''
      state.repeatNew = ''
      v$.value.$reset()
    }
  } catch {
    showToast(t('settings.errorPasswordChange'), 'error')
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
      showToast(t('settings.successEmailChange'), 'success')
      emailV$.value.$reset()
      await userStore.logout()
    }
  } catch {
    showToast(t('settings.errorEmailChange'), 'error')
    return
  }
}

const handleChangeUpdateChannel = async (channel: string): Promise<void> => {
  generalStore.settings.updateChannel = channel
  generalStore.saveSettings()
  await checkUpdate()
  await window.electron?.ipcRenderer?.invoke('launch:remove-markfile')
  showToast(
    generalStore.isUpdateAvailable ? t('toasts.updateAvailable') : t('toasts.updateUpToDate')
  )
}

const verifyFilesModalRef = ref()
const openVerifyFilesModal = (): void => {
  verifyFilesModalRef.value?.openModal()
}

const setNewTheme = (newTheme: string): void => {
  applyTheme(newTheme)
  generalStore.setTheme(newTheme)
  saveSettings()
}

const changeLanguage = (lang: string): void => {
  generalStore.setLanguage(lang)
  locale.value = lang
}

const themeEditorModalRef = ref()

const openThemeEditor = (): void => {
  themeEditorModalRef.value?.open()
}

const openLauncherLogs = async (): Promise<void> => {
  await window.electron?.ipcRenderer?.invoke('logs:open-launcher')
}

const openGameLogs = async (): Promise<void> => {
  await window.electron?.ipcRenderer?.invoke(
    'logs:open-game',
    generalStore.settings.gameMode || 'main'
  )
}

// Funkcja obsługująca zapisanie customowego motywu
const handleCustomTheme = (customConfig: Record<string, string>): void => {
  // Możesz tutaj dodać logikę zapisu do localStorage lub bazy
  Object.entries(customConfig).forEach(([key, value]: [string, string]) => {
    if (value)
      document.documentElement.style.setProperty(
        `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`,
        value
      )
  })
  showToast(t('settings.customThemeApplied'), 'success')
}

onUnmounted(() => {
  generalStore.saveSettings()
})

const resolutions = [
  { value: '1920x1080', label: 'FHD', icon: 'fa-desktop' },
  { value: '1600x900', label: 'HD+', icon: 'fa-desktop' },
  { value: '1366x768', label: 'HD', icon: 'fa-laptop' },
  { value: '1280x720', label: 'HD-', icon: 'fa-laptop' }
]
</script>

<template>
  <div class="settings-container">
    <div class="settings-grid">
      <!-- Left Column: Display & Launcher Settings -->
      <div class="settings-column">
        <!-- Display Settings -->
        <div class="g-card">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box">
                <i class="fas fa-desktop"></i>
              </div>
              <h3>{{ t('settings.title') }}</h3>
            </div>
          </div>

          <div class="setting-item">
            <label>{{ t('settings.displayMode') }}</label>
            <div class="toggle-switch">
              <button
                :class="{ active: generalStore.settings.displayMode === 'Okno' }"
                @click="generalStore.settings.displayMode = 'Okno'"
              >
                {{ t('settings.window') }}
              </button>
              <button
                :class="{ active: generalStore.settings.displayMode === 'Pełny ekran' }"
                @click="generalStore.settings.displayMode = 'Pełny ekran'"
              >
                {{ t('settings.fullscreen') }}
              </button>
            </div>
          </div>

          <div class="setting-item">
            <label>{{ t('settings.resolution') }}</label>
            <div class="resolution-grid">
              <div
                v-for="res in resolutions"
                :key="res.value"
                class="res-card"
                :class="{ active: generalStore.settings.resolution === res.value }"
                @click="changeResolution(res.value)"
              >
                <div class="res-icon">
                  <i :class="['fas', res.icon]"></i>
                </div>
                <div class="res-info">
                  <span class="res-value">{{ res.value }}</span>
                  <span class="res-label">{{ res.label }}</span>
                </div>
                <div v-if="generalStore.settings.resolution === res.value" class="active-indicator">
                  <i class="fas fa-check-circle"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="setting-item">
            <div class="flex justify-between mb-2">
              <label>{{ t('settings.ram') }}</label>
              <span class="ram-value">{{ generalStore.settings.ram }} GB</span>
            </div>
            <template v-if="generalStore.settings.maxRAM > 5">
              <div class="ram-slider-wrapper">
                <input
                  id="ramSlider"
                  ref="sliderRef"
                  v-model="generalStore.settings.ram"
                  type="range"
                  :min="MIN_RAM"
                  :max="generalStore.settings.maxRAM"
                  :step="1"
                />
                <div class="slider-track" :style="{ width: percent + 'px' }"></div>
              </div>
              <div class="ram-markers">
                <span>{{ MIN_RAM }}GB</span>
                <span>{{ generalStore.settings.maxRAM }}GB</span>
              </div>
            </template>
            <div v-else class="text-xs text-[var(--text-secondary)] bg-white/5 p-2 rounded-lg border border-white/5">
              Twój system posiada 5GB lub mniej pamięci RAM. Więcej RAMu nie da się przydzielić.
            </div>
          </div>
        </div>

        <!-- Launcher Settings -->
        <div class="g-card">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box">
                <i class="fas fa-cogs"></i>
              </div>
              <h3>{{ t('settings.launcherSettings') }}</h3>
            </div>
          </div>

          <div class="setting-item row">
            <label>{{ t('settings.language') }}</label>
            <div class="lang-toggles">
              <button
                :class="{ active: generalStore.settings.language === 'pl' }"
                @click="changeLanguage('pl')"
              >
                PL
              </button>
              <div class="divider"></div>
              <button
                :class="{ active: generalStore.settings.language === 'en' }"
                @click="changeLanguage('en')"
              >
                EN
              </button>
            </div>
          </div>

          <div class="setting-item">
            <label>{{ t('settings.theme') }}</label>
            <div class="theme-grid">
              <button
                v-for="theme in themes"
                :key="theme.name"
                class="theme-btn"
                :class="{ active: generalStore.settings.theme === theme.name }"
                :style="{ '--theme-color': theme.primary }"
                @click="setNewTheme(theme.name)"
              >
                <div class="color-dot"></div>
                <span>{{ theme.name }}</span>
              </button>
              <button class="theme-btn add-theme" @click="openThemeEditor">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>

          <div class="setting-item row">
            <label>{{ t('settings.notifications') }}</label>
            <label class="switch">
              <input
                type="checkbox"
                :checked="generalStore.settings.showNotifications"
                @change="
                  generalStore.setShowNotifications(!generalStore.settings.showNotifications)
                "
              />
              <span class="slider round"></span>
            </label>
          </div>

          <div class="setting-item row">
            <label>{{ t('settings.hideToTray') }}</label>
            <label class="switch">
              <input
                type="checkbox"
                :checked="generalStore.settings.hideToTray"
                @change="generalStore.setHideToTray(!generalStore.settings.hideToTray)"
              />
              <span class="slider round"></span>
            </label>
          </div>

          <div class="setting-item row">
            <div>
              <label>Akceleracja sprzętowa (GPU)</label>
              <div class="text-xs text-[var(--text-secondary)] mt-1">Wymaga ponownego uruchomienia launchera.</div>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                :checked="generalStore.hardwareAcceleration"
                @change="generalStore.setHardwareAcceleration(!generalStore.hardwareAcceleration)"
              />
              <span class="slider round"></span>
            </label>
          </div>

          <div
            v-if="
              userStore.user?.enableUpdateChannel ||
              [
                UserRole.HELPER,
                UserRole.POMOCNIK,
                UserRole.MODERATOR,
                UserRole.MOD,
                UserRole.DEV, UserRole.DEV_EN,
                UserRole.ADMIN,
                UserRole.OWNER
              ].includes((userStore.user?.role as string)?.toLowerCase() as UserRole)
            "
            class="setting-item row"
          >
            <label>{{ t('settings.updateChannel') }}</label>
            <div class="toggle-switch small">
              <button
                :class="{ active: generalStore.settings.updateChannel === 'beta' }"
                @click="handleChangeUpdateChannel('beta')"
              >
                Beta
              </button>
              <button
                :class="{ active: generalStore.settings.updateChannel === 'dev' }"
                @click="handleChangeUpdateChannel('dev')"
              >
                Dev
              </button>
            </div>
          </div>

          <div class="setting-item row">
            <label>{{ t('settings.logs') }}</label>
            <div class="flex gap-2">
              <button
                class="g-btn small icon-only"
                :title="t('settings.openLauncherLogs')"
                @click="openLauncherLogs"
              >
                <i class="fas fa-file-alt"></i> Launcher
              </button>
              <button
                class="g-btn small icon-only"
                :title="t('settings.openGameLogs')"
                @click="openGameLogs"
              >
                <i class="fas fa-gamepad"></i> Game
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Account Settings -->
      <div class="settings-column">
        <div class="g-card">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box">
                <i class="fas fa-user-shield"></i>
              </div>
              <h3>{{ t('settings.accountSettings') }}</h3>
            </div>
            <div class="header-actions">
              <button class="icon-btn" title="Verify Files" @click="openVerifyFilesModal">
                <i class="fas fa-hammer"></i>
              </button>
              <button class="icon-btn" title="Save" @click="saveSettings">
                <i class="fas fa-save"></i>
              </button>
            </div>
          </div>

          <div class="account-forms">
            <!-- Email and Password Change -->
            <div class="form-section">
              <h4>{{ t('settings.changeEmail') }}</h4>
              <div class="input-group">
                <i class="fas fa-envelope"></i>
                <input
                  v-model="state.email"
                  type="email"
                  placeholder="New Email Address"
                  :class="{ error: emailV$.email.$error }"
                  class="glass-input"
                />
              </div>
              <button class="g-btn" @click="handleChangeEmail">
                {{ t('settings.changeEmail') }}
              </button>

              <!-- Password Change (Backend Only) -->
              <template v-if="userStore.user?.accountType !== AccountType.MICROSOFT">
                <h4 class="mt-6">{{ t('settings.changePassword') }}</h4>

                <div class="input-group">
                  <i class="fas fa-lock"></i>
                  <input
                    v-model="state.old"
                    :type="state.showedOld ? 'text' : 'password'"
                    :placeholder="t('settings.oldPassword')"
                    :class="{ error: v$.old.$error }"
                    class="glass-input"
                  />
                  <i
                    class="fas cursor-pointer"
                    :class="state.showedOld ? 'fa-eye-slash' : 'fa-eye'"
                    @click="state.showedOld = !state.showedOld"
                  ></i>
                </div>

                <div class="input-group">
                  <i class="fas fa-key"></i>
                  <input
                    v-model="state.new"
                    :type="state.showedNew ? 'text' : 'password'"
                    :placeholder="t('settings.newPassword')"
                    :class="{ error: v$.new.$error }"
                    class="glass-input"
                  />
                  <i
                    class="fas cursor-pointer"
                    :class="state.showedNew ? 'fa-eye-slash' : 'fa-eye'"
                    @click="state.showedNew = !state.showedNew"
                  ></i>
                </div>

                <div class="input-group">
                  <i class="fas fa-key"></i>
                  <input
                    v-model="state.repeatNew"
                    :type="state.showedRepeatNew ? 'text' : 'password'"
                    :placeholder="t('settings.repeatPassword')"
                    :class="{ error: v$.repeatNew.$error }"
                    class="glass-input"
                  />
                  <i
                    class="fas cursor-pointer"
                    :class="state.showedRepeatNew ? 'fa-eye-slash' : 'fa-eye'"
                    @click="state.showedRepeatNew = !state.showedRepeatNew"
                  ></i>
                </div>

                <button class="g-btn primary" @click="handleChangePassword">
                  {{ t('settings.changePassword') }}
                </button>
              </template>
            </div>
          </div>

          <div class="danger-zone mt-auto">
            <button class="text-btn danger" @click="resetSettings">
              <i class="fas fa-undo"></i>
              {{ t('settings.resetSettings') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <VerifyFilesModal ref="verifyFilesModalRef" />
    <CustomTheme ref="themeEditorModalRef" @apply="handleCustomTheme" />
  </div>
</template>

<style scoped>
.settings-container {
  width: 100%;
  height: calc(100vh - 60px);
  margin: 0;
  padding: 1rem 2rem 2rem 2rem;
  overflow-y: auto;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.settings-column {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Cards */
/* .settings-card removed in favor of .g-card */
/* .card-header removed in favor of .g-card-header */

.header-actions {
  margin-left: auto;
  display: flex;
  gap: 0.5rem;
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.icon-btn:hover {
  color: var(--primary);
  background: rgba(var(--primary-rgb), 0.1);
}

/* Form Items */
.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.setting-item.row {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.setting-item label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Custom Toggle Switch */
.toggle-switch {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  border-radius: 16px;
  width: fit-content;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.toggle-switch button {
  padding: 0.5rem 1.5rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.85rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-switch button.active {
  background: var(--bg-card);
  color: var(--primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toggle-switch.small button {
  padding: 0.3rem 1rem;
  font-size: 0.8rem;
}

/* Custom Select */
.select-wrapper {
  position: relative;
  width: 100%;
}

.select-wrapper select {
  width: 100%;
  padding: 0.8rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: var(--text-primary);
  font-size: 0.9rem;
  appearance: none;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
}

.select-wrapper select:focus {
  border-color: var(--primary);
  background: rgba(255, 255, 255, 0.07);
  box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
}

.select-wrapper i {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

/* Resolution Grid */
.resolution-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  width: 100%;
}

.res-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 0.8rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.res-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(var(--primary-rgb), 0.3);
  transform: translateY(-2px);
}

.res-card.active {
  background: rgba(var(--primary-rgb), 0.08);
  border-color: var(--primary);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.res-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  color: var(--text-muted);
  transition: all 0.3s;
  font-size: 1.1rem;
}

.res-card:hover .res-icon {
  color: var(--text-secondary);
}

.res-card.active .res-icon {
  background: var(--primary);
  color: white;
  box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.4);
}

.res-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.res-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.res-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.res-card.active .res-label {
  color: var(--primary);
}

.active-indicator {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  color: var(--primary);
  font-size: 0.9rem;
  animation: scaleIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Range Slider */
.ram-slider-wrapper {
  position: relative;
  width: 100%;
  height: 24px;
  display: flex;
  align-items: center;
}

input[type='range'] {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  z-index: 2;
}

input[type='range']::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.6);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid #fff;
}

input[type='range']::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.slider-track {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 0;
  height: 6px;
  background: var(--gradient-primary);
  border-radius: 3px;
  pointer-events: none;
  z-index: 1;
}

.ram-value {
  font-weight: 700;
  color: var(--primary);
}

.ram-markers {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: -0.5rem;
}

/* Theme Grid */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 1rem;
}

.theme-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: 1px solid transparent;
  padding: 0.8rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.theme-btn.active {
  background: rgba(var(--primary-rgb), 0.1);
  border-color: var(--primary);
}

.color-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--theme-color);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.theme-btn.active .color-dot {
  box-shadow: 0 0 15px var(--theme-color);
}

.theme-btn span {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.add-theme {
  border: 1px dashed var(--border);
}

.add-theme i {
  font-size: 1.2rem;
  color: var(--text-muted);
}

/* Global Input Styles */
/* .glass-input moved to base.css as .g-input */

/* .action-btn moved to base.css as .g-btn */

/* Switch Checkbox */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.1);
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 34px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.slider:before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 50%;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: var(--primary);
  border-color: var(--primary);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

/* Input Styles */
.input-group {
  position: relative;
  width: 100%;
  margin-bottom: 1rem;
}

.input-group input {
  width: 100%;
  padding: 1rem 1rem 1rem 2.8rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
}

.input-group input:focus {
  border-color: var(--primary);
  background: rgba(0, 0, 0, 0.3);
  box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
}

.input-group input.error {
  border-color: var(--toast-error);
}

.input-group i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 1rem;
}

/* Buttons */
.action-btn {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  transition: all 0.2s;
}

.action-btn.primary {
  background: var(--gradient-primary);
  box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3);
}

.action-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}

.text-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.text-btn:hover {
  color: var(--text-primary);
}

.text-btn.danger:hover {
  color: var(--toast-error);
}

.h-full {
  height: 100%;
}

.mt-auto {
  margin-top: auto;
}

.lang-toggles {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 2px;
}

.lang-toggles button {
  padding: 4px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.lang-toggles button.active {
  background: rgba(var(--primary-rgb), 0.15);
  color: var(--primary);
  border: 1px solid rgba(var(--primary-rgb), 0.3);
  box-shadow: 0 0 10px rgba(var(--primary-rgb), 0.2);
}

.divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}
</style>
