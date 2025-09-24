<script lang="ts" setup>
import useGeneralStore from '@renderer/stores/general-store'
import { calculateValueFromPercentage, showToast } from '@renderer/utils'
import { onMounted, ref, watch } from 'vue'

const generalStore = useGeneralStore()

const changeResolution = (e: Event): void => {
  const target = e.target as HTMLSelectElement

  window.electron.ipcRenderer.invoke('change-resolution', target.value)
}

const sliderRef = ref<HTMLInputElement | null>(null)
const displayRef = ref<HTMLInputElement | null>(null)

const ram = ref<number>(11)
const version = ref<string>('PokemonGoGo.pl')
const resolution = ref<string>(generalStore.settings.resolution)
const displayMode = ref<string>('')
const theme = ref<string>('')
const autoUpdate = ref<boolean>(false)

const percent = ref(0)

const quickRam = ref('6GB')

const saveSettings = (): void => {
  const settings = {
    ram: ram.value,
    version: version.value,
    resolution: resolution.value,
    displayMode: displayMode.value,
    theme: theme.value,
    autoUpdate: autoUpdate.value
  }
  localStorage.setItem('launcherSettings', JSON.stringify(settings))
  showToast('Zapisano ustawienia.')
}

const loadSettings = (): void => {
  const savedSettings = localStorage.getItem('launcherSettings')
  if (!savedSettings) return
  try {
    const settings = JSON.parse(savedSettings) as {
      ram?: number | string
      version?: string
      resolution?: string
      displayMode?: string
      theme?: string
      autoUpdate?: boolean
    }
    if (settings.ram) {
      ram.value = Number(settings.ram)
      quickRam.value = `${settings.ram}GB`
    }
    if (settings.version) version.value = settings.version || ''
    if (settings.resolution) resolution.value = settings.resolution || ''
    if (settings.displayMode) displayMode.value = settings.displayMode || ''
    if (settings.theme) theme.value = settings.theme || ''
    if (typeof settings.autoUpdate === 'boolean') autoUpdate.value = settings.autoUpdate
  } catch {
    // ignore parse errors
  }
}

const resetSettings = (): void => {
  localStorage.removeItem('launcherSettings')
  ram.value = 6
  version.value = 'PokemonGoGo.pl'
  resolution.value = ''
  displayMode.value = ''
  theme.value = ''
  autoUpdate.value = false
  quickRam.value = '6GB'
  showToast('Przywrócono domyślne ustawienia', 'success')
}

watch(
  () => ram.value,
  (newVal) => {
    if (sliderRef.value) {
      percent.value = calculateValueFromPercentage(newVal, sliderRef.value?.offsetWidth)
    }
    quickRam.value = `${newVal}GB`
    if (displayRef.value) {
      displayRef.value.textContent = `${newVal}GB`
      displayRef.value.style.left = percent.value + 'px'
    }
  }
)

onMounted(() => {
  loadSettings()
  if (sliderRef.value) {
    percent.value = calculateValueFromPercentage(ram.value, sliderRef.value?.offsetWidth)
  }
  quickRam.value = `${ram.value}GB`

  if (displayRef.value) {
    displayRef.value.textContent = `${ram.value}GB`
    displayRef.value.style.left = percent.value + 'px'
  }
})
</script>

<template>
  <div id="settingsPage" class="page">
    <div class="settings-container">
      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header">
            <i class="fas fa-gamepad"></i>
            <h3>Ustawienia Gry</h3>
          </div>

          <div class="setting-group">
            <label>Pamięć RAM</label>
            <div class="ram-slider-container">
              <input
                id="ramSlider"
                ref="sliderRef"
                v-model="ram"
                type="range"
                :min="6"
                :max="16"
                :step="1"
              />
              <div id="ramDisplay" ref="displayRef" class="ram-display">6 GB</div>
              <div class="ram-markers">
                <span>6GB</span>
                <span>11GB</span>
                <span>16GB</span>
              </div>
            </div>
          </div>

          <div class="setting-group">
            <label>Rozdzielczość</label>
            <select v-model="resolution" class="setting-select" @change="changeResolution">
              <!-- <option value="1920x1080">1280x768 (4K UHD)</option> -->
              <!-- <option value="1920x1080">2560x1440 (QHD)</option> -->
              <option value="1920x1080">1920x1080 (Full HD)</option>
              <option value="1366x768">1366x768</option>
              <option value="1280x720">1280x720</option>
            </select>
          </div>

          <div class="setting-group">
            <label>Tryb wyświetlania gry</label>
            <div class="toggle-group">
              <button class="toggle-option active">Okno</button>
              <button class="toggle-option">Pełny ekran</button>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-card-header">
            <i class="fas fa-coffee"></i>
            <h3>Ustawienia Java</h3>
          </div>

          <div class="setting-group">
            <label>Wersja Java</label>
            <select class="setting-select">
              <option value="21">Java 21 (Zalecana)</option>
            </select>
          </div>

          <div class="setting-group">
            <label>Argumenty JVM</label>
            <textarea class="jvm-args" disabled style="resize: none !important; color: #787878">
-XX:+UnlockExperimentalVMOptions -XX:+UseG1GC
            </textarea>
          </div>

          <!-- <div class="setting-group">
            <label>Optymalizacja</label>
            <div class="checkbox-group">
              <label class="checkbox">
                <input type="checkbox" checked />
                <span>Użyj G1GC</span>
              </label>
              <label class="checkbox">
                <input type="checkbox" checked />
                <span>Optymalizacja CPU</span>
              </label>
            </div>
          </div> -->
        </div>

        <!-- <div class="settings-card">
          <div class="settings-card-header">
            <i class="fas fa-rocket"></i>
            <h3>Ustawienia Launchera</h3>
          </div>

          <div class="setting-group">
            <label>Motywy</label>
            <div class="theme-selector">
              <div class="theme-option active" data-theme="dark">
                <div class="theme-preview dark"></div>
                <span>Ciemny</span>
              </div>
            </div>
          </div>

          <div class="setting-group">
            <label>Opcje</label>
            <div class="checkbox-group">
              <label class="checkbox">
                <input type="checkbox" checked />
                <span>Automatyczne aktualizacje</span>
              </label>
              <label class="checkbox">
                <input type="checkbox" />
                <span>Minimalizuj po uruchomieniu</span>
              </label>
              <label class="checkbox">
                <input type="checkbox" checked />
                <span>Powiadomienia Discord</span>
              </label>
            </div>
          </div>
        </div> -->
      </div>

      <div class="settings-actions">
        <button id="saveSettings" class="btn-primary" @click="saveSettings">
          <i class="fas fa-save"></i>
          Zapisz zmiany
        </button>
        <button id="resetSettings" class="btn-secondary" @click="resetSettings">
          <i class="fas fa-undo"></i>
          Przywróć domyślne
        </button>
      </div>
    </div>
  </div>
</template>
