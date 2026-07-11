import { themes } from '@ui/assets/theme/themes'

import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

const useGeneralStore = defineStore('general', () => {
  const searchQuery = ref<string>('')
  const appVersion = ref<string>('dev')
  const isUpdateAvailable = ref<boolean>(false)
  const mcInstance = ref<number | null>(null)
  const hardwareAcceleration = ref<boolean>(false)

  const initialSettings = {
    showNotifications: true,
    hideToTray: true,
    machineId: '',
    macAddress: '',
    ipAddress: '',
    resolution: '1366x768',
    ram: 5,
    maxRAM: 16,
    javaVersion: 21,
    displayMode: 'Okno',
    theme: 'main',
    autoUpdate: true,
    updateChannel: 'beta',
    isSidebarCollapsed: false,
    gameMode: 'Pokemons',
    language: 'pl',
    customTheme: localStorage.getItem('customTheme')
      ? JSON.parse(localStorage.getItem('customTheme') || '')
      : null
  }

  const availableGameModes = [
    { label: 'Pokemony', value: 'Pokemons', icon: 'fas fa-ghost' },
    { label: 'Mecha', value: 'mecha-minigame', icon: 'fas fa-gamepad' }
  ]

  const savedSettings = localStorage.getItem('launcherSettings')

  const settings = reactive(
    savedSettings
      ? {
          ...initialSettings,
          ...JSON.parse(savedSettings)
        }
      : initialSettings
  )

  const isOpeningGame = ref<boolean>(false)
  const currentState = ref<string>('start')
  const currentLog = ref<string>('')

  const getTheme = (): string => {
    return themes.map(({ name }) => name).includes(settings.theme) ? settings.theme : 'main'
  }

  const setTheme = (newTheme: string): void => {
    settings.theme = newTheme
    saveSettings()
  }

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
    if (settings.ram > maxRam) {
      settings.ram = maxRam
    }
  }

  const setUpdateAvailable = (update: boolean): void => {
    isUpdateAvailable.value = update
  }

  const setHideToTray = (hide: boolean): void => {
    settings.hideToTray = hide
  }

  const loadHardwareAcceleration = async (): Promise<void> => {
    if (window.electron?.ipcRenderer) {
      hardwareAcceleration.value = await window.electron.ipcRenderer.invoke('settings:get-gpu')
    }
  }

  const setHardwareAcceleration = async (enabled: boolean): Promise<void> => {
    hardwareAcceleration.value = enabled
    if (window.electron?.ipcRenderer) {
      await window.electron.ipcRenderer.invoke('settings:set-gpu', enabled)
    }
  }

  const loadSettings = (): void => {
    const savedSettings = localStorage.getItem('launcherSettings')
    if (!savedSettings) return
    const loaded = JSON.parse(savedSettings)

    if (loaded.showNotifications) settings.showNotifications = loaded.showNotifications
    if (loaded.hideToTray) settings.hideToTray = loaded.hideToTray
    if (loaded.resolution) settings.resolution = loaded.resolution
    if (loaded.ram) settings.ram = Number(loaded.ram)
    if (loaded.version) settings.version = loaded.version
    if (loaded.displayMode) settings.displayMode = loaded.displayMode
    if (typeof loaded.autoUpdate === 'boolean') settings.autoUpdate = loaded.autoUpdate
    if (loaded.updateChannel) settings.updateChannel = loaded.updateChannel
    if (loaded.isSidebarCollapsed) settings.isSidebarCollapsed = loaded.isSidebarCollapsed
    if (loaded.gameMode) settings.gameMode = loaded.gameMode
    if (loaded.language) settings.language = loaded.language
  }

  const saveSettings = (): void => {
    localStorage.setItem('launcherSettings', JSON.stringify(settings))
  }

  const resetSettings = (): void => {
    settings.showNotifications = true
    settings.hideToTray = true
    settings.ram = 5
    settings.javaVersion = 21
    settings.version = 'PokemonGoGo.pl'
    settings.resolution = '1366x768'
    settings.displayMode = 'Okno'
    settings.theme = 'main'
    settings.autoUpdate = true
    settings.updateChannel = 'beta'
    settings.isSidebarCollapsed = false
    settings.language = 'pl'
    saveSettings()
  }

  const setMachineData = (machineId: string, macAdress: string, ipAddress: string): void => {
    settings.machineId = machineId
    settings.macAddress = macAdress
    settings.ipAddress = ipAddress
    saveSettings()
  }

  const setShowNotifications = (show: boolean): void => {
    settings.showNotifications = show
  }

  const setCustomTheme = (theme: Record<string, string>): void => {
    setTheme('custom')
    settings.customTheme = theme
    localStorage.setItem('customTheme', JSON.stringify(theme))
  }

  const setLanguage = (lang: string): void => {
    settings.language = lang
    saveSettings()
  }

  const setGameMode = (mode: string): void => {
    settings.gameMode = mode
    saveSettings()
  }

  return {
    availableGameModes,
    searchQuery,
    mcInstance,
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
    setCurrentLog,
    setMachineData,
    setHideToTray,
    setShowNotifications,
    getTheme,
    setTheme,
    setLanguage,
    setGameMode,
    setCustomTheme,
    hardwareAcceleration,
    loadHardwareAcceleration,
    setHardwareAcceleration
  }
})

export default useGeneralStore
