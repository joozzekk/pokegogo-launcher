import { ElectronAPI } from '@electron-toolkit/preload'

interface DiscordAPI {
  setActivity: (details: string, state: string) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    discord: DiscordAPI
  }
}
