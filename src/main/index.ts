import { installExtension, VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { app, BrowserWindow, ipcMain, Menu, Notification } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import useWindowService from './services/window-service'
import { useAppUpdater } from './services/app-updater'
import { createTray } from './services/tray-service'
import { ensureDir } from './utils'
import { useFTPService } from './services/ftp-service'
import { join } from 'path'
import discordRpc, { type RP } from 'discord-rich-presence'
import Logger from 'electron-log'
import { machineId } from 'node-machine-id'
import { address } from 'address/promises'
import { platform } from 'os'

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID
let rpc: RP | null = null

function initDiscord(): void {
  try {
    rpc = discordRpc(CLIENT_ID)

    rpc.on('error', (err: string) => {
      Logger.warn('Discord RPC Error (Discord is running?):', err)
    })

    rpc.on('connected', () => {
      Logger.log('Connected to Discord')
    })
  } catch (err) {
    Logger.warn('Discord IPC not connected: ', err)
  }
}

process.env.APPIMAGE = join(__dirname, 'dist', `pokemongogo-launcher-${app.getVersion()}.AppImage`)

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('pl.pokemongogo.launcher')
    const { createHandlers } = useFTPService()
    await installExtension(VUEJS_DEVTOOLS)

    initDiscord()
    ensureDir(process.cwd() + '/tmp')

    const { createMainWindow, createLoadingWindow } = useWindowService()
    mainWindow = createMainWindow()
    const { startApp } = createLoadingWindow()
    useAppUpdater(mainWindow)

    createTray(mainWindow)
    createHandlers(mainWindow)
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
        const hwid = await machineId()
        const addr = await address()
        return {
          machineId: hwid,
          macAddress: addr?.mac,
          ipAddress: addr?.ip
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
            win.hide()
            return
          }

          win.close()
          mainWindow = null
          if (ipcMain.listenerCount('launch:exit')) ipcMain.emit('launch:exit')
        }
      })

    ipcMain.on('discord:update-activity', (_, activity) => {
      if (rpc) {
        rpc.updatePresence({
          state: activity.state,
          details: activity.details,
          largeImageKey: 'logo',
          startTimestamp: Date.now(),
          instance: true
        })
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
      if (ipcMain.listenerCount('launch:exit')) mainWindow?.webContents.emit('launch:exit')
      app.quit()
    }
  })
}
