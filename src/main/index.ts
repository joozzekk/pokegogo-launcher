/* eslint-disable @typescript-eslint/no-explicit-any */
import { installExtension, VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { app, BrowserWindow, ipcMain, Menu, Notification, shell, protocol, net } from 'electron'

// Silence deprecation warnings from 3rd party libs
process.noDeprecation = true

import { electronApp } from '@electron-toolkit/utils'
import useWindowService from './services/window-service'
import { useAppUpdater } from './services/app-updater'
import { createTray } from './services/tray-service'
import { ensureDir, getPersistentMachineId, generateStrongHWID } from './utils'
import { useFTPService } from './services/ftp-service'
import { useImageCacheService } from './services/image-cache-service'
import { join } from 'path'
import DiscordRPC from 'discord-rpc'
import Logger from 'electron-log'
import { machineId } from 'node-machine-id'
import { address } from 'address/promises'
import { platform } from 'os'
import { writeFileSync, readFileSync, existsSync } from 'fs'

import { discordLogger } from './services/discord-logger'

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID
const appStartTime = Date.now()
let rpc: DiscordRPC.Client | null = null
let lastActivity: { details?: string; state?: string } = {
  details: 'W launcherze',
  state: 'Menu główne'
}
let isConnecting = false
let isReady = false

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', error)
  discordLogger.sendError('Main Process Uncaught Exception', error)
})

process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled Rejection:', reason)
  discordLogger.sendError('Main Process Unhandled Rejection', reason)

  // CRITICAL: Detect Discord connection death that escapes library events
  const message = String(reason)
  if (message.includes('connection closed') || message.includes('broken pipe')) {
    Logger.warn('Discord RPC: Detected closed connection via global handler. Resetting.')
    rpc = null
    isConnecting = false
  }
})

function initDiscord(): void {
  if (isConnecting || isReady) return
  isConnecting = true

  try {
    Logger.log('Discord RPC: Initializing official Client...')
    rpc = new DiscordRPC.Client({ transport: 'ipc' })

    rpc.on('ready', () => {
      Logger.log('Discord RPC: Connected and Ready')
      isReady = true
      isConnecting = false

      if (lastActivity && rpc) {
        rpc
          .setActivity({
            ...lastActivity,
            largeImageKey: 'logo',
            startTimestamp: appStartTime,
            instance: true
          })
          .catch((err) => Logger.warn('Discord RPC: Failed to set initial activity:', err))
      }
    })

    rpc.on('disconnected', () => {
      Logger.log('Discord RPC: Disconnected')
      isReady = false
      isConnecting = false
      rpc = null
    })

    rpc.login({ clientId: CLIENT_ID }).catch((err) => {
      Logger.warn('Discord RPC: Login failed:', err.message)
      isReady = false
      isConnecting = false
      rpc = null
    })
  } catch (err) {
    Logger.warn('Discord RPC: Setup exception:', err)
    isReady = false
    isConnecting = false
    rpc = null
  }
}

process.env.APPIMAGE = join(__dirname, 'dist', `pokemongogo-launcher-${app.getVersion()}.AppImage`)

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  const gpuConfigPath = join(app.getPath('userData'), 'gpu-config.json')
  let isHardwareAccelerationEnabled = true
  try {
    if (existsSync(gpuConfigPath)) {
      const gpuConfig = JSON.parse(readFileSync(gpuConfigPath, 'utf8'))
      if (typeof gpuConfig.hardwareAcceleration === 'boolean') {
        isHardwareAccelerationEnabled = gpuConfig.hardwareAcceleration
      }
    }
  } catch (err) {
    Logger.warn('Failed to read gpu-config.json:', err)
  }

  if (!isHardwareAccelerationEnabled) {
    // Disable hardware acceleration to save GPU resources for the game, especially on integrated GPUs
    app.disableHardwareAcceleration()
  }

  let mainWindow: BrowserWindow | null = null

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('pl.pokemongogo.launcher')

    // Suppress Autofill and other browser-internal console noise
    app.commandLine.appendSwitch('log-level', '3')

    // Register local-image protocol
    protocol.handle('local-image', (request) => {
      const uuidWithExt = request.url.replace('local-image://', '').split('?')[0]
      return net.fetch('file://' + join(app.getPath('userData'), 'cache', 'events', uuidWithExt))
    })

    const { createHandlers } = useFTPService()
    await installExtension(VUEJS_DEVTOOLS)

    initDiscord()
    // Heartbeat for Discord reconnection
    setInterval(() => {
      if (!isReady && !isConnecting) {
        Logger.log('Discord RPC Heartbeat: Not connected. Retrying...')
        initDiscord()
      } else if (isReady && rpc) {
        // Just verify activity is up to date
        rpc
          .setActivity({
            ...lastActivity,
            largeImageKey: 'logo',
            startTimestamp: appStartTime,
            instance: true
          })
          .catch(() => {
            Logger.warn('Discord RPC Heartbeat: Update failed. Resetting...')
            isReady = false
            rpc = null
          })
      }
    }, 15000)

    ensureDir(process.cwd() + '/tmp')

    const { createMainWindow, createLoadingWindow } = useWindowService()
    mainWindow = createMainWindow()
    const { startApp } = createLoadingWindow()
    useAppUpdater(mainWindow)

    createTray(mainWindow)
    createHandlers(mainWindow)
    useImageCacheService(mainWindow)
    await startApp(mainWindow)

    if (!ipcMain.listenerCount('notification:show'))
      ipcMain.handle(
        'notification:show',
        async (_, data: { title: string; body: string; icon: string }): Promise<void> => {
          Logger.log('Notification showed: ', data)

          const messageNotify = new Notification({
            icon: data.icon,
            title: data.title,
            body: data.body
          })

          messageNotify.on('click', () => {
            mainWindow?.show()
          })

          messageNotify.show()
        }
      )

    if (!ipcMain.listenerCount('data:machine'))
      ipcMain.handle('data:machine', async () => {
        let systemId = ''
        try {
          systemId = await generateStrongHWID()
        } catch (err: any) {
          Logger.log('[HWID] Nie udalo sie pobrac klucza sprzetowego WMIC. Uzywam zapasowego identyfikatora.')
          try {
            systemId = await machineId()
          } catch (machineIdErr) {
            Logger.warn('[HWID] Nie udalo sie pobrac zapasowego klucza sprzetowego.')
          }
        }

        // Priority: Persistent Files > System ID
        const hwid = getPersistentMachineId(systemId)

        let addr: any = null
        try {
          addr = await address()
        } catch (err) {
          Logger.warn('Failed to get address:', err)
        }
        return {
          machineId: hwid,
          macAddress: addr?.mac,
          ipAddress: addr?.ip
        }
      })

    if (!ipcMain.listenerCount('cart:save'))
      ipcMain.handle('cart:save', async (_, cartData: unknown) => {
        const cartPath = join(app.getPath('userData'), 'cart.json')
        try {
          writeFileSync(cartPath, JSON.stringify(cartData, null, 2), 'utf8')
          return true
        } catch (err) {
          Logger.error('Failed to save cart:', err)
          return false
        }
      })

    if (!ipcMain.listenerCount('cart:load'))
      ipcMain.handle('cart:load', async () => {
        const cartPath = join(app.getPath('userData'), 'cart.json')
        try {
          if (existsSync(cartPath)) {
            const data = readFileSync(cartPath, 'utf8')
            return JSON.parse(data)
          }
        } catch (err) {
          Logger.error('Failed to load cart:', err)
        }
        return []
      })

    if (!ipcMain.listenerCount('settings:get-gpu'))
      ipcMain.handle('settings:get-gpu', () => {
        const gpuConfigPath = join(app.getPath('userData'), 'gpu-config.json')
        try {
          if (existsSync(gpuConfigPath)) {
            const gpuConfig = JSON.parse(readFileSync(gpuConfigPath, 'utf8'))
            if (typeof gpuConfig.hardwareAcceleration === 'boolean') {
              return gpuConfig.hardwareAcceleration
            }
          }
        } catch (err) {
          Logger.warn('Failed to read gpu-config.json:', err)
        }
        return true
      })

    if (!ipcMain.listenerCount('settings:set-gpu'))
      ipcMain.handle('settings:set-gpu', (_, enabled: boolean) => {
        const gpuConfigPath = join(app.getPath('userData'), 'gpu-config.json')
        try {
          writeFileSync(gpuConfigPath, JSON.stringify({ hardwareAcceleration: enabled }, null, 2), 'utf8')
          return true
        } catch (err) {
          Logger.error('Failed to save gpu config:', err)
          return false
        }
      })

    if (!ipcMain.listenerCount('window:minimize'))
      ipcMain.on('window:minimize', () => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.minimize()
      })

    if (!ipcMain.listenerCount('window:close'))
      ipcMain.on('window:close', (_, isHideToTray: boolean = true) => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) {
          if (isHideToTray && platform() !== 'darwin') {
            Logger.log('PokeGoGo Launcher > Hidden in tray')
            win.webContents.send('window:tray-hidden')
            win.hide()
            return
          }

          win.close()
          mainWindow = null
          // Use invoke if we want to trigger the handler, but better to call service directly.
          // For now, we skip emitting to avoid listenerCount issues with handlers.
        }
      })

    ipcMain.handle('logs:open-launcher', async () => {
      const logPath = join(app.getPath('userData'), 'logs')
      await shell.openPath(logPath)
    })

    ipcMain.handle('logs:open-game', async (_, gameMode: string) => {
      const logPath = join(app.getPath('userData'), 'instances', gameMode.toLowerCase(), 'logs')
      await shell.openPath(logPath)
    })

    ipcMain.on('discord:update-activity', (_, activity) => {
      lastActivity = {
        state: activity.state,
        details: activity.details
      }

      if (isReady && rpc) {
        rpc
          .setActivity({
            ...lastActivity,
            largeImageKey: 'logo',
            startTimestamp: appStartTime,
            instance: true
          })
          .catch(() => {
            isReady = false
            rpc = null
            initDiscord()
          })
      } else if (!isConnecting) {
        initDiscord()
      }
    })

    app.on('activate', async () => {
      mainWindow?.show()
    })

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Quit app',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              try {
                app.quit()
              } catch (err) {
                console.error('[Menu] Failed to quit app:', err)
              }
            }
          },
          {
            label: 'Show window',
            accelerator: 'CmdOrCtrl+N',
            click: async () => {
              try {
                mainWindow?.show()
              } catch (err) {
                console.error('[Menu] Failed to open new window:', err)
              }
            }
          },
          {
            label: 'Hide window',
            accelerator: 'CmdOrCtrl+W',
            click: () => {
              try {
                mainWindow?.hide()
              } catch (err) {
                console.error('[Menu] Failed to close window:', err)
              }
            }
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }]
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  })

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  // Final emergency cleanup to ensure no game processes stay alive
  app.on('before-quit', () => {
    Logger.log('Launcher is quitting, triggering final cleanup...')
    if (ipcMain.listenerCount('launch:exit')) {
      // Trigger global exit without a specific PID to kill ALL instances
      ipcMain.emit('launch:exit', null, null)
    }
  })
}
