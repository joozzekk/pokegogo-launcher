import { themes } from '@ui/assets/theme/themes'
import { MIN_RAM } from '@ui/utils'
import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

const useGeneralStore = defineStore('general', () => {
  const appVersion = ref<string>('dev')
  const isUpdateAvailable = ref<boolean>(false)
  const mcInstance = ref<number | null>(null)

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
    displayMode: 'Okno',
    theme: 'main',
    autoUpdate: true,
    updateChannel: 'beta',
    isSidebarCollapsed: false,
    gameMode: 'Pokemons'
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
    settings.theme = 'main'
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
    setTheme
  }
})

export default useGeneralStore
