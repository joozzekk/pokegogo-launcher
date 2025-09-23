<script lang="ts" setup>
import { reactive } from 'vue'

const state = reactive({
  javaVersion: '21',
  selectedRAM: 6,
  selectedResolution: '1280x720'
})

const changeResolution = (e: Event): void => {
  const target = e.target as HTMLSelectElement

  window.electron.ipcRenderer.invoke('change-resolution', target.value)
}
</script>

<template>
  <div id="settingsPage" class="page">
    <div class="settings-container">
      <h2>Ustawienia</h2>

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
                v-model="state.selectedRAM"
                type="range"
                min="6"
                max="16"
                step="1"
              />
              <div id="ramDisplay" class="ram-display">6 GB</div>
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
              v-model="state.selectedResolution"
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
            <select v-model="state.javaVersion" class="setting-select">
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
        <button id="saveSettings" class="btn-primary">
          <i class="fas fa-save"></i>
          Zapisz zmiany
        </button>
        <button id="resetSettings" class="btn-secondary">
          <i class="fas fa-undo"></i>
          Przywróć domyślne
        </button>
      </div>
    </div>
  </div>
</template>
