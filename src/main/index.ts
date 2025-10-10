import { installExtension, VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import useWindowService from './services/window-service'
import { useAppUpdater } from './services/app-updater'

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('pl.pokemongogo')

  const { createMainWindow, createLoadingWindow } = useWindowService()
  const mainWindow = createMainWindow()
  const { startApp } = createLoadingWindow()
  const appUpdater = useAppUpdater(mainWindow)

  await startApp(appUpdater, mainWindow)
  await installExtension(VUEJS_DEVTOOLS)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await startApp(appUpdater, mainWindow)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
