<script lang="ts" setup>
import { ref, reactive, computed } from 'vue'
import { themes, main } from '@ui/assets/theme/themes'
import useGeneralStore from '@ui/stores/general-store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const generalStore = useGeneralStore()

// --- KONFIGURACJA UI ---
const categories = computed(() => ({
  colors: { label: t('theme.categories.colors'), icon: 'fas fa-palette' },
  backgrounds: { label: t('theme.categories.backgrounds'), icon: 'fas fa-image' },
  ui: { label: t('theme.categories.ui'), icon: 'fas fa-layer-group' },
  text: { label: t('theme.categories.text'), icon: 'fas fa-font' },
  login: { label: t('theme.categories.login'), icon: 'fas fa-sign-in-alt' },
  effects: { label: t('theme.categories.effects'), icon: 'fas fa-magic' }
}))

// Mapowanie kluczy (skrócone dla czytelności - to samo co u Ciebie)
const propertyConfig = computed<
  Record<
    string,
    { label: string; category: keyof typeof categories.value; type?: 'textarea' | 'text' }
  >
>(() => ({
  // ... (Tu wklej całą Twoją konfigurację propertyConfig z poprzedniego kodu)
  // Paleta Główna
  name: { label: t('theme.labels.name'), category: 'effects', type: 'text' },
  primary: { label: t('theme.labels.primary'), category: 'colors' },
  primaryShop: { label: t('theme.labels.primaryShop'), category: 'colors' },
  primaryDark: { label: t('theme.labels.primaryDark'), category: 'colors' },
  primaryLight: { label: t('theme.labels.primaryLight'), category: 'colors' },
  // Tła
  bgDark: { label: t('theme.labels.bgDark'), category: 'backgrounds' },
  bgCard: { label: t('theme.labels.bgCard'), category: 'backgrounds' },
  bgLight: { label: t('theme.labels.bgLight'), category: 'backgrounds' },
  bgBody: { label: t('theme.labels.bgBody'), category: 'backgrounds' },
  bgPrimary: { label: t('theme.labels.bgPrimary'), category: 'backgrounds' },
  bgInput: { label: t('theme.labels.bgInput'), category: 'backgrounds' },
  loadingOverlay: { label: t('theme.labels.loadingOverlay'), category: 'backgrounds' },
  vignetteColor: { label: t('theme.labels.vignetteColor'), category: 'backgrounds' },
  backgroundImage: {
    label: t('theme.labels.backgroundImage'),
    category: 'backgrounds',
    type: 'text'
  },
  // Tekst
  textPrimary: { label: t('theme.labels.textPrimary'), category: 'text' },
  textSecondary: { label: t('theme.labels.textSecondary'), category: 'text' },
  textSecondaryAlt: { label: t('theme.labels.textSecondaryAlt'), category: 'text' },
  textMuted: { label: t('theme.labels.textMuted'), category: 'text' },
  breadcrumbsText: { label: t('theme.labels.breadcrumbsText'), category: 'text' },
  errorMessage: { label: t('theme.labels.errorMessage'), category: 'text' },
  // UI Elements
  border: { label: t('theme.labels.border'), category: 'ui' },
  border2: { label: t('theme.labels.border2'), category: 'ui' },
  borderPrimary: { label: t('theme.labels.borderPrimary'), category: 'ui' },
  borderRadius: { label: t('theme.labels.borderRadius'), category: 'ui', type: 'text' },
  borderRadiusSmall: { label: t('theme.labels.borderRadiusSmall'), category: 'ui', type: 'text' },
  newsItem: { label: t('theme.labels.newsItem'), category: 'ui' },
  newsItemHover: { label: t('theme.labels.newsItemHover'), category: 'ui' },
  btnHover: { label: t('theme.labels.btnHover'), category: 'ui' },
  btnGlow: { label: t('theme.labels.btnGlow'), category: 'ui' },
  footerHover: { label: t('theme.labels.footerHover'), category: 'ui' },
  shopItem: { label: t('theme.labels.shopItem'), category: 'ui', type: 'textarea' },
  navIcon: { label: t('theme.labels.navIcon'), category: 'ui' },
  navItem: { label: t('theme.labels.navItem'), category: 'ui' },
  navItemHoverNavIcon: { label: t('theme.labels.navItemHoverNavIcon'), category: 'ui' },
  navItemActive: { label: t('theme.labels.navItemActive'), category: 'ui' },
  tagDark: { label: t('theme.labels.tagDark'), category: 'ui' },
  statusPulse: { label: t('theme.labels.statusPulse'), category: 'ui' },
  banBtn: { label: t('theme.labels.banBtn'), category: 'ui' },
  banBtnText: { label: t('theme.labels.banBtnText'), category: 'ui' },
  toastError: { label: t('theme.labels.toastError'), category: 'ui' },
  toastWarning: { label: t('theme.labels.toastWarning'), category: 'ui' },
  // Login & Form
  loginTabBtnBg: { label: t('theme.labels.loginTabBtnBg'), category: 'login' },
  loginTabBtnHover: { label: t('theme.labels.loginTabBtnHover'), category: 'login' },
  loginInvalidBg: { label: t('theme.labels.loginInvalidBg'), category: 'login' },
  loginInvalidBorder: { label: t('theme.labels.loginInvalidBorder'), category: 'login' },
  btnMicrosoft: { label: t('theme.labels.btnMicrosoft'), category: 'login', type: 'textarea' },
  playerLogout: { label: t('theme.labels.playerLogout'), category: 'login' },
  // Efekty
  gradientPrimary: {
    label: t('theme.labels.gradientPrimary'),
    category: 'effects',
    type: 'textarea'
  },
  gradientBanned: {
    label: t('theme.labels.gradientBanned'),
    category: 'effects',
    type: 'textarea'
  },
  gradientOverlay: {
    label: t('theme.labels.gradientOverlay'),
    category: 'effects',
    type: 'textarea'
  },
  shadowGlow: { label: t('theme.labels.shadowGlow'), category: 'effects', type: 'text' },
  shadowCard: { label: t('theme.labels.shadowCard'), category: 'effects', type: 'text' },
  transition: { label: t('theme.labels.transition'), category: 'effects', type: 'text' },
  firstFloating: { label: t('theme.labels.firstFloating'), category: 'effects', type: 'text' },
  secondFloating: { label: t('theme.labels.secondFloating'), category: 'effects', type: 'text' }
}))

// --- STATE ---
const isVisible = ref(false)
const activeTab = ref<string>('colors')
const customTheme = ref<Record<string, string> | null>(
  localStorage.getItem('customTheme') ? JSON.parse(localStorage.getItem('customTheme')!) : null
)

const editingTheme = reactive<Record<string, string>>({
  ...(customTheme.value ?? main),
  name: 'custom'
} as Record<string, string>)

const categorizedFields = computed(() => {
  const groups: Record<string, Array<{ key: string; label: string; type: string }>> = {}
  Object.keys(categories.value).forEach((k) => (groups[k] = []))

  Object.keys(editingTheme).forEach((key): void => {
    const config = propertyConfig.value[key]
    const category = config?.category || 'effects'
    const label = config?.label || key
    let type: string | undefined = config?.type

    if (!type) {
      const val = editingTheme[key]
      if (typeof val === 'string' && (val.includes('gradient') || val.length > 50))
        type = 'textarea'
      else if (isColor(val)) type = 'color'
      else type = 'text'
    }

    if (groups[category]) {
      groups[category].push({ key, label, type })
    }
  })
  return groups
})

// --- ACTIONS ---
const open = (): void => {
  isVisible.value = true
}
const close = (): void => {
  isVisible.value = false
}

const copyVarName = (key: string): void => {
  navigator.clipboard.writeText(`var(--${key})`)
  // Opcjonalnie: showToast('Skopiowano nazwę zmiennej')
}

// Helpers kolorów (te same co wcześniej)
const isColor = (val: string): boolean => {
  if (typeof val !== 'string') return false
  return val.startsWith('#') || val.startsWith('rgb') || val.startsWith('rgba')
}

const getHexPart = (color: string): string => {
  if (!color || typeof color !== 'string') return '#000000'
  if (color.startsWith('#')) return color.substring(0, 7)
  if (color.startsWith('rgb')) {
    const parts = color.match(/\d+/g)
    if (parts && parts.length >= 3) {
      const r = parseInt(parts[0]).toString(16).padStart(2, '0')
      const g = parseInt(parts[1]).toString(16).padStart(2, '0')
      const b = parseInt(parts[2]).toString(16).padStart(2, '0')
      return `#${r}${g}${b}`
    }
  }
  return '#000000'
}

const getAlphaPart = (color: string): number => {
  if (!color || typeof color !== 'string') return 100
  if (color.startsWith('#') && color.length === 9) {
    const alphaHex = color.substring(7, 9)
    return Math.round((parseInt(alphaHex, 16) / 255) * 100)
  }
  if (color.startsWith('rgba')) {
    const parts = color.match(/[\d.]+/g)
    if (parts && parts.length >= 4) return Math.round(parseFloat(parts[3]) * 100)
  }
  return 100
}

const setAlphaInHex = (hex: string, alphaPercent: number): string => {
  const alphaVal = Math.round((alphaPercent / 100) * 255)
  const alphaHex = alphaVal.toString(16).padStart(2, '0')
  return `${hex}${alphaHex}`
}

const updateFromPicker = (key: string, newHex: string): void => {
  const currentVal = editingTheme[key]
  const currentAlpha = getAlphaPart(currentVal)
  const finalColor = setAlphaInHex(newHex, currentAlpha)
  editingTheme[key] = finalColor
  updateLivePreview(key, finalColor)
}

const updateFromSlider = (key: string, newAlpha: string): void => {
  const currentVal = editingTheme[key]
  const hexPart = getHexPart(currentVal)
  const finalColor = setAlphaInHex(hexPart, parseInt(newAlpha))
  editingTheme[key] = finalColor
  updateLivePreview(key, finalColor)
}

const updateLivePreview = (key: string, value: string): void => {
  if (value === null || value === undefined) return
  document.documentElement.style.setProperty(
    `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`,
    value
  )
}

const loadBaseTheme = (themeName: string): void => {
  const base = themes.find((t) => t.name === themeName) || main
  Object.assign(editingTheme, JSON.parse(JSON.stringify(base)))
  editingTheme.name = 'custom'
  Object.entries(editingTheme).forEach(([k, v]): void => {
    if (typeof v === 'string') updateLivePreview(k, v)
  })
}

const emit = defineEmits(['apply'])

const saveAndClose = (): void => {
  generalStore.setCustomTheme(editingTheme)
  emit('apply', editingTheme)
  close()
}

// Import / Export
const exportTheme = (): void => {
  try {
    const dataStr = JSON.stringify(editingTheme, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `theme-${editingTheme.name || 'custom'}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error(t('theme.exportError'), error)
  }
}

const importTheme = (): void => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const parsedTheme = JSON.parse(content)
        if (typeof parsedTheme !== 'object' || parsedTheme === null) {
          alert(t('theme.importErrorFmt'))
          return
        }
        Object.assign(editingTheme, parsedTheme)
        Object.entries(parsedTheme).forEach(([key, value]) => {
          if (typeof value === 'string') updateLivePreview(key, value)
        })
      } catch (err) {
        console.error('JSON Error:', err)
        alert(t('theme.importErrorJson'))
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

defineExpose({ open })
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-in">
      <div v-if="isVisible" class="theme-editor-container">
        <div class="backdrop" @click="close"></div>

        <div class="editor-panel">
          <div class="panel-header">
            <div class="title-group">
              <div class="icon-box">
                <i class="fas fa-paint-roller"></i>
              </div>
              <div>
                <h3>{{ t('theme.title') }}</h3>
                <span class="subtitle">{{ t('theme.subtitle', 'Dostosuj wygląd') }}</span>
              </div>
            </div>

            <div class="header-actions">
              <button class="action-btn" :title="t('theme.import')" @click="importTheme">
                <i class="fas fa-file-arrow-up"></i>
              </button>
              <button class="action-btn" :title="t('theme.export')" @click="exportTheme">
                <i class="fas fa-file-arrow-down"></i>
              </button>
              <div class="divider"></div>
              <button class="action-btn close" @click="close">
                <i class="fas fa-xmark"></i>
              </button>
            </div>
          </div>

          <div class="presets-section">
            <span class="section-label">{{ t('theme.presets', 'Szablony') }}</span>
            <div class="presets-list custom-scrollbar">
              <button
                v-for="themeItem in themes"
                :key="themeItem.name"
                class="preset-chip"
                :class="{ active: false }"
                @click="loadBaseTheme(themeItem.name)"
              >
                <span class="color-dot" :style="{ background: themeItem.primary }"></span>
                {{ themeItem.name }}
              </button>
            </div>
          </div>

          <div class="tabs-container">
            <button
              v-for="(cat, key) in categories"
              :key="key"
              class="tab-btn"
              :class="{ active: activeTab === key }"
              @click="activeTab = key"
            >
              <i :class="cat.icon"></i>
              <span>{{ cat.label.split(' ')[0] }}</span>
            </button>
          </div>

          <div class="content-area custom-scrollbar">
            <div v-if="categorizedFields[activeTab]?.length === 0" class="empty-state">
              <i class="fas fa-ghost"></i>
              <p>{{ t('theme.noOptions') }}</p>
            </div>

            <div v-for="field in categorizedFields[activeTab]" :key="field.key" class="control-row">
              <div class="control-header">
                <label>{{ field.label }}</label>
                <span
                  class="var-code"
                  title="Kopiuj nazwę zmiennej"
                  @click="copyVarName(field.key)"
                >
                  --{{ field.key }}
                </span>
              </div>

              <div v-if="field.type === 'color'" class="color-control-wrapper">
                <div class="color-preview" :style="{ backgroundColor: editingTheme[field.key] }">
                  <input
                    type="color"
                    :value="getHexPart(editingTheme[field.key])"
                    @input="
                      (e) => updateFromPicker(field.key, (e.target as HTMLInputElement).value)
                    "
                  />
                </div>
                <div class="slider-container">
                  <span class="slider-label">Alpha</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    :value="getAlphaPart(editingTheme[field.key])"
                    @input="
                      (e) => updateFromSlider(field.key, (e.target as HTMLInputElement).value)
                    "
                  />
                </div>
                <div class="hex-value">{{ getHexPart(editingTheme[field.key]) }}</div>
              </div>

              <textarea
                v-else-if="field.type === 'textarea'"
                v-model="editingTheme[field.key]"
                class="glass-input textarea"
                spellcheck="false"
                rows="2"
                @input="updateLivePreview(field.key, editingTheme[field.key])"
              ></textarea>

              <input
                v-else
                v-model="editingTheme[field.key]"
                type="text"
                class="glass-input"
                spellcheck="false"
                @input="updateLivePreview(field.key, editingTheme[field.key])"
              />
            </div>
          </div>

          <div class="panel-footer">
            <button class="save-btn" @click="saveAndClose">
              <i class="fas fa-check"></i> {{ t('theme.saveClose') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* === Layout === */
.theme-editor-container {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  justify-content: flex-end; /* Panel po prawej */
}

.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 0;
}

.editor-panel {
  position: relative;
  z-index: 1;
  width: 420px;
  max-width: 100vw;
  height: 100%;
  background: var(--bg-card); /* Ciemne tło */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

/* === Header === */
.panel-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-box {
  width: 40px;
  height: 40px;
  background: rgba(var(--primary-rgb), 0.15);
  color: var(--primary);
  border: 1px solid rgba(var(--primary-rgb), 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
  line-height: 1.2;
}

.subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: block;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}
.action-btn.close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 0.2rem;
}

/* === Presets === */
.presets-section {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  font-weight: 700;
  letter-spacing: 0.5px;
}

.presets-list {
  display: flex;
  gap: 0.6rem;
  overflow-x: auto;
  padding-bottom: 0.5rem; /* miejsce na scrollbar */
}

.preset-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.preset-chip:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

/* === Tabs === */
.tabs-container {
  display: flex;
  padding: 0 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  overflow-x: auto;
}

.tab-btn {
  flex: 1;
  min-width: 60px;
  padding: 1rem 0.5rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  transition: all 0.2s;
}

.tab-btn i {
  font-size: 1rem;
  margin-bottom: 2px;
}

.tab-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.03);
}
.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

/* === Content Area === */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  gap: 1rem;
  font-size: 0.9rem;
}
.empty-state i {
  font-size: 2rem;
  opacity: 0.5;
}

.control-row {
  margin-bottom: 1.5rem;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.6rem;
}

.control-header label {
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
}

.var-code {
  font-family: monospace;
  font-size: 0.7rem;
  color: var(--text-secondary);
  opacity: 0.6;
  cursor: pointer;
}
.var-code:hover {
  opacity: 1;
  color: var(--primary);
}

/* Inputs */
.glass-input {
  width: 100%;
  padding: 0.8rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: var(--text-primary);
  font-family: monospace;
  font-size: 0.85rem;
  outline: none;
  transition: all 0.2s;
}

.glass-input:focus {
  border-color: var(--primary);
  background: rgba(255, 255, 255, 0.07);
  box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
}
.glass-input.textarea {
  resize: vertical;
  min-height: 60px;
}

/* Color Control */
.color-control-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.color-preview {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  /* Checkerboard for alpha */
  background-image:
    linear-gradient(45deg, #333 25%, transparent 25%),
    linear-gradient(-45deg, #333 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #333 75%),
    linear-gradient(-45deg, transparent 75%, #333 75%);
  background-size: 10px 10px;
  background-position:
    0 0,
    0 5px,
    5px -5px,
    -5px 0px;
}
.color-preview input[type='color'] {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  cursor: pointer;
  opacity: 0;
}

.slider-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.slider-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.slider-container input[type='range'] {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  appearance: none;
  -webkit-appearance: none;
  outline: none;
}
.slider-container input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

.hex-value {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 8px;
  border-radius: 6px;
}

/* === Footer === */
.panel-footer {
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.2);
}

.save-btn {
  width: 100%;
  padding: 14px;
  background: var(--gradient-primary);
  border: none;
  border-radius: 16px;
  color: white;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3);
}

.save-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
  box-shadow: 0 6px 20px rgba(var(--primary-rgb), 0.4);
}

/* === Animations === */
.slide-in-enter-active,
.slide-in-leave-active {
  transition: opacity 0.3s ease;
}

.slide-in-enter-from,
.slide-in-leave-to {
  opacity: 0;
}

.slide-in-enter-active .editor-panel,
.slide-in-leave-active .editor-panel {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-in-enter-from .editor-panel,
.slide-in-leave-to .editor-panel {
  transform: translateX(100%);
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
