/* eslint-disable @typescript-eslint/no-explicit-any */
import { app, type BrowserWindow, ipcMain } from 'electron'
import { installJava } from './installers/java-installer'
import { copyMCFiles } from './installers/mc-installer'
import { createMinecraftInstance, MinecraftInstance } from './mc-launcher'
import Logger from 'electron-log'
import { join } from 'path'
import { rm, unlink } from 'fs/promises'
import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

import { findMinecraftProcess } from '../utils/game-scanner'

export const useLaunchService = (win: BrowserWindow): void => {
  const minecraftInstances: MinecraftInstance[] = []
  let currentAbortController: AbortController | null = null
  let pendingInstance: MinecraftInstance | null = null

  ipcMain.handle('launch:game', async (_, data) => {
    // 1. Check if an instance for this mode is already running or being started
    const existingInstance = minecraftInstances.find(
      (i) =>
        // @ts-ignore - access to internal config might be needed or we use settings
        i.mcOpened
    )

    if (existingInstance) {
      Logger.log('LaunchService: Game already running. Bringing window to front or ignoring.')
      // Optionally stop it if the user wants "kill old if new started"
      // await existingInstance.stop()
      // return existingInstance.process
    }

    let currentInstance: MinecraftInstance | null = null

    if (currentAbortController) {
      currentAbortController.abort()
    }

    const flagPath = join(app.getPath('userData'), '.force_reinstall_pending')
    if (existsSync(flagPath)) {
      Logger.log('Pending force reinstall flag found. Trying to reinstall before launch.')
      try {
        const targetDir = join(app.getPath('userData'), 'instances')
        await rm(targetDir, { recursive: true, force: true })
        unlinkSync(flagPath)
        Logger.log('Successfully completed pending force reinstall.')
      } catch (err) {
        Logger.log('Still failed to force reinstall:', err)
      }
    }

    currentAbortController = new AbortController()
    const signal = currentAbortController.signal

    win.webContents.send('launch:change-state', JSON.stringify('java-install'))
    await installJava(data.javaVersion)

    if (signal.aborted) {
      Logger.log('Game launch aborted during java-install.')
      return null
    }

    win.webContents.send('launch:change-state', JSON.stringify('files-verify'))

    // We don't register launch:exit here anymore. It's global.
    const res = await copyMCFiles(data.isDev, data.settings.gameMode, win, signal)

    currentAbortController = null

    if (res === 'stop') {
      Logger.log('Game launch aborted during verification.')
      return null
    }

    if (res !== 'stop') {
      currentInstance = createMinecraftInstance({
        accessToken: data.accessToken,
        accountType: data.accountType,
        window: win,
        settings: data.settings,
        token: data.token
      })

      pendingInstance = currentInstance
      minecraftInstances.push(currentInstance)

      try {
        await currentInstance.start()
      } finally {
        pendingInstance = null
      }
    }

    return currentInstance?.process
  })

  // Global exit handler
  ipcMain.handle('launch:exit', async (_, pid: number | null) => {
    // 1. Abort verification/download
    if (currentAbortController) {
      currentAbortController.abort()
      currentAbortController = null
      Logger.log('Cancel process triggered via launch:exit')
    }

    // Abort any ongoing FTP sync/download operations
    ipcMain.emit('ftp:abort-all')

    // 2. Kill specific process if running or ALL if pid is null
    if (pid) {
      let instance = minecraftInstances.find((instance) => instance.process === pid)

      // Fallback: if we didn't find the exact PID but there's exactly one running instance, kill it
      if (!instance && minecraftInstances.length === 1) {
        Logger.log('launch:exit PID mismatch, falling back to the only running instance')
        instance = minecraftInstances[0]
      }

      if (instance) {
        await instance.stop()
        // Remove from list
        const index = minecraftInstances.indexOf(instance)
        if (index > -1) minecraftInstances.splice(index, 1)
      }
    } else {
      // 3. Kill ALL running instances (e.g. on BAN or forced close)
      Logger.log(`Killing all active Minecraft instances (${minecraftInstances.length})`)
      for (const instance of [...minecraftInstances]) {
        await instance.stop()
        const index = minecraftInstances.indexOf(instance)
        if (index > -1) minecraftInstances.splice(index, 1)
      }

      // 4. Fallback: Kill pending instance (stuck in start/launch phase)
      if (pendingInstance) {
        Logger.log('Killing pending instance via launch:exit fallback')
        await pendingInstance.stop()
        const index = minecraftInstances.indexOf(pendingInstance)
        if (index > -1) minecraftInstances.splice(index, 1)
        pendingInstance = null
      }
    }
  })

  // Listen for internal app events (like from before-quit)
  ipcMain.on('launch:exit', async () => {
    Logger.log('Launcher Service: Internal exit signal received. Cleaning up all instances.')
    for (const instance of [...minecraftInstances]) {
      await instance.stop()
      const index = minecraftInstances.indexOf(instance)
      if (index > -1) minecraftInstances.splice(index, 1)
    }
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
      return true
    } catch (err) {
      Logger.log(err)

      return false
    }
  })

  ipcMain.handle('launch:remove-mcfiles', async (_, gameMode: string): Promise<boolean> => {
    try {
      const targetDir = join(app.getPath('userData'), 'instances', gameMode.toLowerCase())

      // 1. Kill via tracked instance
      const instance = minecraftInstances.find(
        // @ts-ignore - Internal config access needed
        (i) => i.mcOpened || (i as any).settings?.gameMode?.toLowerCase() === gameMode.toLowerCase()
      )
      if (instance) {
        await instance.stop()
        const index = minecraftInstances.indexOf(instance)
        if (index > -1) minecraftInstances.splice(index, 1)
      }

      // 2. Kill via process scanner (in case it's orphaned)
      const pid = await findMinecraftProcess(targetDir)
      if (pid) {
        Logger.log(`Found orphaned game process ${pid} during verify. Killing it.`)
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
        } else {
          process.kill(pid, 'SIGTERM')
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      await rm(targetDir, {
        recursive: true,
        force: true
      })
      return true
    } catch (err) {
      Logger.log('Error removing mcfiles:', err)
      return false
    }
  })
  ipcMain.handle('launch:force-reinstall', async (): Promise<boolean> => {
    try {
      Logger.log(
        `Force reinstall: Killing all active Minecraft instances first (${minecraftInstances.length})`
      )
      for (const instance of [...minecraftInstances]) {
        await instance.stop()
        const index = minecraftInstances.indexOf(instance)
        if (index > -1) minecraftInstances.splice(index, 1)
      }

      if (pendingInstance) {
        await pendingInstance.stop()
        const index = minecraftInstances.indexOf(pendingInstance)
        if (index > -1) minecraftInstances.splice(index, 1)
        pendingInstance = null
      }

      // 2. Kill via process scanner (in case it's orphaned) to be 100% sure
      const targetDir = join(app.getPath('userData'), 'instances')
      const pid = await findMinecraftProcess(targetDir)
      if (pid) {
        Logger.log(`Found orphaned game process ${pid} during force-reinstall. Killing it.`)
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
        } else {
          process.kill(pid, 'SIGTERM')
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      Logger.log('Force reinstall: Proceeding to delete instances folder')
      await rm(targetDir, {
        recursive: true,
        force: true
      })

      const flagPath = join(app.getPath('userData'), '.force_reinstall_pending')
      if (existsSync(flagPath)) {
        unlinkSync(flagPath)
      }
      return true
    } catch (err) {
      Logger.log('Error removing instances for force reinstall:', err)
      const flagPath = join(app.getPath('userData'), '.force_reinstall_pending')
      writeFileSync(flagPath, '1')
      return false
    }
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

  // Ensure game processes are killed if the launcher dies or gets closed.
  app.on('will-quit', () => {
    minecraftInstances.forEach((instance) => {
      if (instance.process) {
        try {
          Logger.log(`Launcher quitting: Terminating orphaned Minecraft PID ${instance.process}`)
          if (process.platform === 'win32') {
            execSync(`taskkill /pid ${instance.process} /T /F`, { stdio: 'ignore' })
          } else {
            process.kill(instance.process, 'SIGTERM')
          }
        } catch (e) {
          Logger.error('Failed to kill stray minecraft process on app quit', e)
        }
      }
    })
  })
}
