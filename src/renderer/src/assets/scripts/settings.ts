import { calculateValueFromPercentage, showToast } from '@renderer/utils'

export function initSettings(): void {
  const ramSlider = document.getElementById('ramSlider') as HTMLInputElement | null
  const ramDisplay = document.getElementById('ramDisplay')
  const quickRam = document.getElementById('quickRam')

  if (ramSlider && ramDisplay) {
    ramSlider.addEventListener('input', () => {
      const value = Number(ramSlider.value)
      ramDisplay.textContent = `${value} GB`
      if (quickRam) {
        quickRam.textContent = `${value}GB`
      }

      const percent = calculateValueFromPercentage(value, ramSlider.offsetWidth)
      ramDisplay.style.left = `${percent}px`
    })
  }

  document.querySelectorAll<HTMLElement>('.toggle-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.parentElement
      if (group) {
        group.querySelectorAll<HTMLElement>('.toggle-option').forEach((opt) => {
          opt.classList.remove('active')
        })
      }
      btn.classList.add('active')
    })
  })

  const saveBtn = document.getElementById('saveSettings')
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      saveSettings()
      showToast('Ustawienia zostały zapisane!', 'success')

      this.innerHTML = '<i class="fas fa-check"></i> Zapisano!'
      setTimeout(() => {
        this.innerHTML = '<i class="fas fa-save"></i> Zapisz zmiany'
      }, 2000)
    })
  }

  const resetBtn = document.getElementById('resetSettings')
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Czy na pewno chcesz przywrócić domyślne ustawienia?')) {
        resetSettings()
        showToast('Przywrócono domyślne ustawienia', 'success')
      }
    })
  }
}

export function saveSettings(): void {
  const ramSlider = document.getElementById('ramSlider') as HTMLInputElement | null
  const versionSelect = document.getElementById('versionSelect') as HTMLSelectElement | null
  const displayMode = document.querySelector<HTMLElement>('.toggle-option.active')
  const themeOption = document.querySelector<HTMLElement>('.theme-option.active')
  const resolution = document.querySelector<HTMLSelectElement>('.setting-select')
  const autoUpdateCheckbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]')

  const settings = {
    ram: ramSlider ? ramSlider.value : '6',
    version: versionSelect ? versionSelect.value : 'PokemonGoGo.pl',
    resolution: resolution?.value ?? '',
    displayMode: displayMode?.textContent?.trim() ?? '',
    theme: themeOption?.getAttribute('data-theme') ?? '',
    autoUpdate: autoUpdateCheckbox?.checked ?? false
  }

  localStorage.setItem('launcherSettings', JSON.stringify(settings))
}

export function loadSettings(): void {
  const savedSettings = localStorage.getItem('launcherSettings')

  if (!savedSettings) return

  try {
    const settings = JSON.parse(savedSettings) as {
      ram?: string | number
      version?: string
      resolution?: string
      displayMode?: string
      theme?: string
      autoUpdate?: boolean
    }

    if (settings.ram) {
      const ramSlider = document.getElementById('ramSlider') as HTMLInputElement | null
      const ramDisplay = document.getElementById('ramDisplay')
      const quickRam = document.getElementById('quickRam')

      if (ramSlider) {
        ramSlider.value = settings.ram.toString()
      }
      if (ramDisplay) {
        ramDisplay.textContent = `${settings.ram}GB`
      }

      if (quickRam) {
        quickRam.textContent = `${settings.ram}GB`
      }
    }

    if (settings.version) {
      const versionSelect = document.getElementById('versionSelect') as HTMLSelectElement | null
      if (versionSelect) {
        versionSelect.value = settings.version
      }
    }
  } catch {
    // ignore parsing errors
  }
}

export function resetSettings(): void {
  localStorage.removeItem('launcherSettings')

  const ramSlider = document.getElementById('ramSlider') as HTMLInputElement | null
  const ramDisplay = document.getElementById('ramDisplay')
  const quickRam = document.getElementById('quickRam')

  if (ramSlider) {
    ramSlider.value = '6'
  }
  if (ramDisplay) {
    ramDisplay.textContent = '6 GB'
  }
  if (quickRam) {
    quickRam.textContent = '6GB'
  }

  const versionSelect = document.getElementById('versionSelect') as HTMLSelectElement | null
  if (versionSelect) {
    versionSelect.value = 'PokemonGoGo.pl'
  }
}
