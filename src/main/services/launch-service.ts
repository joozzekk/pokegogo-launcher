/* eslint-disable @typescript-eslint/no-explicit-any */
import { app, type BrowserWindow, ipcMain } from 'electron'
import { installJava } from './installers/java-installer'
import { copyMCFiles } from './installers/mc-installer'
import { createMinecraftInstance, MinecraftInstance } from './mc-launcher'
import Logger from 'electron-log'
import { join } from 'path'
import { rm, unlink } from 'fs/promises'

export const useLaunchService = (win: BrowserWindow): void => {
  const minecraftInstances: MinecraftInstance[] = []
  let currentAbortController: AbortController | null = null

  ipcMain.handle('launch:game', async (_, data) => {
    let currentInstance: MinecraftInstance | null = null

    if (currentAbortController) {
      currentAbortController.abort()
    }

    currentAbortController = new AbortController()
    const signal = currentAbortController.signal

    win.webContents.send('launch:change-state', JSON.stringify('java-install'))
    await installJava(data.javaVersion)
    win.webContents.send('launch:change-state', JSON.stringify('files-verify'))

    const res = await copyMCFiles(data.isDev, data.settings.gameMode, win, signal)

    currentAbortController = null

    if (res !== 'stop') {
      currentInstance = createMinecraftInstance({
        accessToken: data.accessToken,
        accountType: data.accountType,
        window: win,
        settings: data.settings,
        token: data.token
      })

      minecraftInstances.push(currentInstance)

      await currentInstance.start()
    }

    ipcMain.handle('launch:exit', async (_, pid: string) => {
      await minecraftInstances.find((instance) => instance.process === parseInt(pid))?.stop()
      ipcMain.removeHandler('launch:exit')
    })

    return currentInstance?.process
  })

  ipcMain.handle('launch:check-files', async (_, data): Promise<any> => {
    if (currentAbortController) {
      currentAbortController.abort()
    }

    currentAbortController = new AbortController()
    const signal = currentAbortController.signal

    try {
      const res = await copyMCFiles(data.isDev, data.gameMode, win, signal, data.event)
      currentAbortController = null

      if (res !== 'stop') {
        return true
      }

      return false
    } catch (err) {
      Logger.log(err)

      return false
    }
  })

  ipcMain.handle('launch:remove-markfile', async (_, gameMode: string): Promise<boolean> => {
    try {
      await unlink(
        join(app.getPath('userData'), 'instances', `.${gameMode.toLowerCase()}_installed`)
      )
    } catch (err) {
      Logger.log(err)

      return false
    }

    return false
  })

  ipcMain.handle('launch:remove-mcfiles', async (_, gameMode: string): Promise<boolean> => {
    try {
      await rm(join(app.getPath('userData'), 'instances', gameMode.toLowerCase()), {
        recursive: true,
        force: true
      })
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
      Logger.log('Cancel veryfing..')
      return Promise.resolve()
    }

    return Promise.resolve()
  })
}
