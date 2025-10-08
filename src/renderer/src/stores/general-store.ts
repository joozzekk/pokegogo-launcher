import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

const useGeneralStore = defineStore('general', () => {
  const appVersion = ref<string>('dev')
  const isUpdateAvailable = ref<boolean>(false)

  const settings = reactive({
    resolution: '1366x768',
    ram: 6,
    maxRAM: 16,
    version: 'PokemonGoGo.pl',
    displayMode: 'Okno',
    theme: 'Dark',
    autoUpdate: false
  })

  const isOpeningGame = ref<boolean>(false)
  const currentState = ref<string>('start')
  const currentLog = ref<string>('')

  // Funkcje do aktualizacji tych stanów
  const setIsOpeningGame = (value: boolean): void => {
    isOpeningGame.value = value
  }

  const setCurrentState = (value: string): void => {
    currentState.value = value
  }

  const setCurrentLog = (value: string): void => {
    currentLog.value = value
  }

  const changeVersion = (newVer: string): void => {
    appVersion.value = newVer
  }

  const changeMaxRAM = (maxRam: number): void => {
    settings.maxRAM = maxRam
  }

  const setUpdateAvailable = (update: boolean): void => {
    isUpdateAvailable.value = update
  }

  const loadSettings = (): void => {
    const savedSettings = localStorage.getItem('launcherSettings')
    if (!savedSettings) return
    try {
      const loaded = JSON.parse(savedSettings)
      if (loaded.resolution) settings.resolution = loaded.resolution
      if (loaded.ram) settings.ram = Number(loaded.ram)
      if (loaded.version) settings.version = loaded.version
      if (loaded.displayMode) settings.displayMode = loaded.displayMode
      if (loaded.theme) settings.theme = loaded.theme
      if (typeof loaded.autoUpdate === 'boolean') settings.autoUpdate = loaded.autoUpdate
    } catch {
      // brak obsługi błędu
    }
  }

  const saveSettings = (): void => {
    localStorage.setItem('launcherSettings', JSON.stringify(settings))
  }

  const resetSettings = (): void => {
    settings.ram = 6
    settings.version = 'PokemonGoGo.pl'
    settings.resolution = '1280x720'
    settings.displayMode = 'Okno'
    settings.theme = 'Dark'
    settings.autoUpdate = false
    saveSettings()
  }

  return {
    settings,
    appVersion,
    changeVersion,
    changeMaxRAM,
    isUpdateAvailable,
    setUpdateAvailable,
    loadSettings,
    saveSettings,
    resetSettings,
    isOpeningGame,
    currentState,
    currentLog,
    setIsOpeningGame,
    setCurrentState,
    setCurrentLog
  }
})

export default useGeneralStore
