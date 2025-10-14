import { type BrowserWindow, ipcMain } from 'electron'
import { installJava } from './installers/java-installer'
import { copyMCFiles } from './installers/mc-installer'
import { launchMinecraft } from './mc-launcher'

export const useLaunchService = (win: BrowserWindow): void => {
  let currentAbortController: AbortController | null = null

  ipcMain.handle('launch:game', async (_, data) => {
    if (currentAbortController) {
      currentAbortController.abort()
    }

    currentAbortController = new AbortController()
    const signal = currentAbortController.signal

    await installJava(data.javaVersion)
    win.webContents.send('launch:change-state', JSON.stringify('files-verify'))

    const res = await copyMCFiles(win, signal)

    currentAbortController = null

    if (res !== 'stop') {
      await launchMinecraft(
        win,
        data.mcVersion,
        data.token,
        data.accessToken,
        data.settings,
        data.accountType
      )
    }
  })

  ipcMain.handle('launch:exit-verify', () => {
    if (currentAbortController) {
      currentAbortController.abort()
      win.webContents.send('launch:show-log', '', true)
      return Promise.resolve()
    }

    return Promise.resolve()
  })
}
