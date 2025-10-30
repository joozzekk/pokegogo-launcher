import { type BrowserWindow, ipcMain } from 'electron'
import { installJava } from './installers/java-installer'
import { copyMCFiles } from './installers/mc-installer'
import { launchMinecraft } from './mc-launcher'
import Logger from 'electron-log'

export const useLaunchService = (win: BrowserWindow): void => {
  let currentAbortController: AbortController | null = null

  ipcMain.handle('launch:game', async (_, data) => {
    if (currentAbortController) {
      currentAbortController.abort()
    }

    currentAbortController = new AbortController()
    const signal = currentAbortController.signal

    win.webContents.send('launch:change-state', JSON.stringify('java-install'))
    await installJava(data.javaVersion)
    win.webContents.send('launch:change-state', JSON.stringify('files-verify'))

    const res = await copyMCFiles(data.isDev, win, signal)

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

  ipcMain.handle('launch:check-files', async (_, data): Promise<boolean> => {
    if (currentAbortController) {
      currentAbortController.abort()
    }

    currentAbortController = new AbortController()
    const signal = currentAbortController.signal

    try {
      const res = await copyMCFiles(data.isDev, win, signal, data.event)

      if (res) {
        return true
      }
    } catch (err) {
      Logger.log(err)

      return false
    }

    return false
  })

  ipcMain.handle('launch:exit-verify', (_, event = 'launch:show-log') => {
    if (currentAbortController) {
      currentAbortController.abort()
      win.webContents.send(event, '', true)
      return Promise.resolve()
    }

    return Promise.resolve()
  })
}
