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
        mcToken: string
        resolution: string
      }
    ) => {
      try {
        await installJava(data.javaVersion)
        await copyMCFiles(mainWindow)
        await launchMinecraft(data.mcVersion, data.mcToken, data.resolution)
        return 'Pomyślnie zainstalowno wszystkie pakiety!'
      } catch (error) {
        return `${error}`
      }
    }
  )
  const auth = new Auth('select_account')

  ipcMain.handle(
    'refresh-token',
    async (_, refreshToken: string): Promise<{ refreshToken: string; mcToken: string }> => {
      console.log('Refreshing token...')
      const xbox = await auth.refresh(refreshToken)
      const mc = await xbox.getMinecraft()

      return {
        refreshToken: xbox.save(),
        mcToken: JSON.stringify(mc.getToken(true))
      }
    }
  )

  ipcMain.handle('login', async () => {
    const xbox = await auth.launch('electron')
    const mc = await xbox.getMinecraft()

    return {
      refreshToken: xbox.save(),
      mcToken: JSON.stringify(mc.getToken(true))
    }
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
