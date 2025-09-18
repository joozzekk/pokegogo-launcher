import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import useWindowService from './services/window-service'
import { installJava } from './services/installers/java-installer'
import { copyMCFiles } from './services/installers/mc-installer'
import { launchMinecraft } from './services/mc-launcher'
import { Auth } from 'msmc'

app.whenReady().then(() => {
  const { createWindow } = useWindowService()

  const mainWindow = createWindow()

  electronApp.setAppUserModelId('pl.pokemongogo')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('launch-game', async (_event, token) => {
    try {
      await installJava()
      await copyMCFiles(mainWindow)
      await launchMinecraft('1.21.1', token)
      return 'Pomyślnie zainstalowno wszystkie pakiety!'
    } catch (error) {
      return `${error}`
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ipcMain.handle('login', async (_event) => {
    const authManager = new Auth('select_account')
    const xboxManager = await authManager.launch('electron')
    const token = await xboxManager.getMinecraft()

    return JSON.stringify(JSON.stringify(token))
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
