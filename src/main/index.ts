import { installExtension, VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import useWindowService from './services/window-service'
import { useAppUpdater } from './services/app-updater'
import { createTray } from './services/tray-service'

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('pl.pokemongogo')

    const { createMainWindow, createLoadingWindow } = useWindowService()
    mainWindow = createMainWindow()
    const { startApp } = createLoadingWindow()
    const appUpdater = useAppUpdater(mainWindow)

    createTray(mainWindow)
    await startApp(appUpdater, mainWindow)
    await installExtension(VUEJS_DEVTOOLS)

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })
  })

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (mainWindow) {
        await mainWindow.show()
      }
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
