import { halloween } from '@renderer/assets/theme/official'
import { MIN_RAM } from '@renderer/utils'
import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

const useGeneralStore = defineStore('general', () => {
  const appVersion = ref<string>('dev')
  const isUpdateAvailable = ref<boolean>(false)

  const initialSettings = {
    showNotifications: true,
    hideToTray: true,
    machineId: '',
    macAddress: '',
    ipAddress: '',
    resolution: '1366x768',
    ram: MIN_RAM,
    maxRAM: 16,
    javaVersion: 21,
    version: 'PokemonGoGo.pl',
    displayMode: 'Okno',
    theme: halloween,
    autoUpdate: true,
    updateChannel: 'beta',
    isSidebarCollapsed: false
  }

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

  const setHideToTray = (hide: boolean): void => {
    settings.hideToTray = hide
  }

  const loadSettings = (): void => {
    const savedSettings = localStorage.getItem('launcherSettings')
    if (!savedSettings) return
    try {
      const loaded = JSON.parse(savedSettings)

      if (loaded.showNotifications) settings.showNotifications = loaded.showNotifications
      if (loaded.hideToTray) settings.hideToTray = loaded.hideToTray
      if (loaded.resolution) settings.resolution = loaded.resolution
      if (loaded.ram) settings.ram = Number(loaded.ram)
      if (loaded.version) settings.version = loaded.version
      if (loaded.displayMode) settings.displayMode = loaded.displayMode
      if (loaded.theme) settings.theme = loaded.theme
      if (typeof loaded.autoUpdate === 'boolean') settings.autoUpdate = loaded.autoUpdate
      if (loaded.updateChannel) settings.updateChannel = loaded.updateChannel
      if (loaded.isSidebarCollapsed) settings.isSidebarCollapsed = loaded.isSidebarCollapsed
    } catch {
      // brak obsługi błędu
    }
  }

  const saveSettings = (): void => {
    localStorage.setItem('launcherSettings', JSON.stringify(settings))
  }

  const resetSettings = (): void => {
    settings.showNotifications = true
    settings.hideToTray = true
    settings.ram = MIN_RAM
    settings.javaVersion = 21
    settings.version = 'PokemonGoGo.pl'
    settings.resolution = '1366x768'
    settings.displayMode = 'Okno'
    settings.theme = 'Dark'
    settings.autoUpdate = true
    settings.updateChannel = 'beta'
    settings.isSidebarCollapsed = false
    saveSettings()
  }

  const setMachineData = (machineId: string, macAdress: string, ipAddress: string): void => {
    settings.machineId = machineId
    settings.macAddress = macAdress
    settings.ipAddress = ipAddress
  }

  const setShowNotifications = (show: boolean): void => {
    settings.showNotifications = show
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
    setCurrentLog,
    setMachineData,
    setHideToTray,
    setShowNotifications
  }
})

export default useGeneralStore
