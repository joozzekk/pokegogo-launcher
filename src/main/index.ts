import { installExtension, VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import useWindowService from './services/window-service'
import { useAppUpdater } from './services/app-updater'
import { createTray } from './services/tray-service'
import { ensureDir } from './utils'
import { useFTPService } from './services/ftp-service'

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('pl.pokemongogo.launcher')
    const { createHandlers } = useFTPService()

    ensureDir(process.cwd() + '/tmp')

    const { createMainWindow, createLoadingWindow } = useWindowService()
    mainWindow = createMainWindow()
    const { startApp } = createLoadingWindow()
    useAppUpdater(mainWindow)

    await startApp(mainWindow)
    createTray(mainWindow)
    await installExtension(VUEJS_DEVTOOLS)
    createHandlers(mainWindow)
  })

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (mainWindow) mainWindow.show()
    }
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
