import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import useWindowService from './services/window-service'
import { installJava } from './services/installers/java-installer'
import { copyMCFiles } from './services/installers/mc-installer'
import { launchMinecraft } from './services/mc-launcher'
import { Auth } from 'msmc'
import { getAutoUpdater } from './services/electron-updater'

app.whenReady().then(() => {
  const autoUpdater = getAutoUpdater()
  const { createWindow } = useWindowService()

  if (!is.dev) autoUpdater.checkForUpdatesAndNotify()
  const mainWindow = createWindow()

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update-available', true)
  })
  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-available', false)
  })
  autoUpdater.on('error', (err) => {
    console.log(err)
  })
  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-available', false)
  })

  ipcMain.handle('check-for-update', async () => {
    const res = await autoUpdater.checkForUpdates()

    return autoUpdater.currentVersion !== res?.updateInfo?.version
  })

  electronApp.setAppUserModelId('pl.pokemongogo')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle(
    'launch-game',
    async (
      _event,
      data: {
        javaVersion: string
        mcVersion: string
        token: string
      }
    ) => {
      try {
        await installJava(data.javaVersion)
        await copyMCFiles(mainWindow)
        await launchMinecraft(data.mcVersion, data.token)
        return 'Pomyślnie zainstalowno wszystkie pakiety!'
      } catch (error) {
        return `${error}`
      }
    }
  )

  ipcMain.handle('change-resolution', (_, newResolution: string) => {
    const [width, height] = newResolution.split('x').map((v: string) => parseInt(v))

    mainWindow.setBounds({
      width,
      height
    })
    mainWindow.center()
  })

  ipcMain.handle('login', async () => {
    const authManager = new Auth('select_account')
    const xboxManager = await authManager.launch('electron')
    const token = await xboxManager.getMinecraft()

    return JSON.stringify(JSON.stringify(token))
  })

  ipcMain.handle('start-update', async () => {
    await autoUpdater.downloadUpdate()
    autoUpdater.quitAndInstall()
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
