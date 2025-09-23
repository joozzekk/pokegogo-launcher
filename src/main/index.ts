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

  function sendStatusToWindow(text): void {
    console.info(text)
    mainWindow.webContents.send('show-toast', text)
  }

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...')
  })
  autoUpdater.on('update-available', () => {
    sendStatusToWindow('Update available.')
  })
  autoUpdater.on('update-not-available', () => {
    sendStatusToWindow('Update not available.')
  })
  autoUpdater.on('error', (err) => {
    sendStatusToWindow('Error in auto-updater.' + err)
  })
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
    log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')'
    sendStatusToWindow(log_message)
  })
  autoUpdater.on('update-downloaded', () => {
    sendStatusToWindow('Update downloaded')
    autoUpdater.quitAndInstall()
  })

  electronApp.setAppUserModelId('pl.pokemongogo')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // mainWindow.webContents.send('refresh-token', token)

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
