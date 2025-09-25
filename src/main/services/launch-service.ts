import { type BrowserWindow, ipcMain } from 'electron'
import { installJava } from './installers/java-installer'
import { copyMCFiles } from './installers/mc-installer'
import { launchMinecraft } from './mc-launcher'

export const useLaunchService = (win: BrowserWindow): void => {
  ipcMain.handle(
    'launch-game',
    async (
      _event,
      data: {
        javaVersion: string
        mcVersion: string
        token: string
        resolution: string
        accountType: string
      }
    ) => {
      try {
        await installJava(data.javaVersion)
        await copyMCFiles(win)
        await launchMinecraft(data.mcVersion, data.token, data.resolution, data.accountType)
        return 'Pomyślnie zainstalowno wszystkie pakiety!'
      } catch (error) {
        return `${error}`
      }
    }
  )
}
