import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import useWindowService from './services/window-service'
import { useAppUpdater } from './services/app-updater'
import { useLoginService } from './services/login-service'
import { useLaunchService } from './services/launch-service'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('pl.pokemongogo')

  const { createWindow } = useWindowService()
  let mainWindow = createWindow()
  useAppUpdater(mainWindow)
  useLoginService()
  useLaunchService(mainWindow)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
