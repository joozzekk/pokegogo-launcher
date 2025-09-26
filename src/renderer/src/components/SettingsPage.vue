<script lang="ts" setup>
import useGeneralStore from '@renderer/stores/general-store'
import { calculateValueFromPercentage, showToast } from '@renderer/utils'
import { onMounted, ref, watch } from 'vue'

const generalStore = useGeneralStore()

const sliderRef = ref<HTMLInputElement | null>(null)
const displayRef = ref<HTMLInputElement | null>(null)

const percent = ref(0)

const changeResolution = (e: Event): void => {
  const target = e.target as HTMLSelectElement
  window.electron.ipcRenderer.invoke('change-resolution', target.value)
}

watch(
  () => generalStore.settings.ram,
  (newVal) => {
    if (sliderRef.value) {
      percent.value = calculateValueFromPercentage(newVal, sliderRef.value.offsetWidth)
    }
    if (displayRef.value) {
      displayRef.value.textContent = `${newVal}GB`
      displayRef.value.style.left = percent.value + 'px'
    }
  },
  { immediate: true }
)

onMounted(() => {
  generalStore.loadSettings()
  if (sliderRef.value) {
    percent.value = calculateValueFromPercentage(
      generalStore.settings.ram,
      sliderRef.value.offsetWidth
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
</script>

<template>
  <div id="settingsPage" class="page">
    <div class="settings-container">
      <div class="settings-grid">
        <div class="settings-card">
          <div class="settings-card-header">
            <div class="settings-card-title">
              <div class="nav-icon">
                <i class="fas fa-cog"></i>
              </div>
              <h2>Ustawienia gry</h2>
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
            <select
              v-model="generalStore.settings.resolution"
              class="setting-select"
              @change="changeResolution"
            >
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
        </div>

        <div class="settings-card">
          <div class="settings-card-header">
            <div class="settings-card-title">
              <div class="nav-icon">
                <i class="fas fa-coffee"></i>
              </div>
              <h2>Ustawienia Javy</h2>
            </div>
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
