import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import icon from '../../../resources/icon.png?asset'
import { AppUpdater } from 'electron-updater'
import { useLoginService } from './login-service'
import { useLaunchService } from './launch-service'
import { getMaxRAMInGB } from '../utils'
import { machineId } from 'node-machine-id'
import { address } from 'address/promises'
import { useFTP } from './ftp-service'

const createMainWindow = (): BrowserWindow => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    darkTheme: true,
    accentColor: 'black',
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  ipcMain.handle('ftp:list-files', async (_, folder) => {
    const { client, connect } = useFTP()

    await connect()
    const pwd = await client.pwd()
    const remoteURL = pwd + `/${folder}`

    return await client.list(remoteURL)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.webContents.send('change:max-ram', Math.floor(getMaxRAMInGB() * 0.75))
    mainWindow.webContents.send('change:version', app.getVersion())
  })

  ipcMain.handle('data:machine', async () => {
    const hwid = await machineId()
    const addr = await address()
    return {
      machineId: hwid,
      macAddress: addr?.mac,
      ipAddress: addr?.ip
    }
  })

  ipcMain.on('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  ipcMain.on('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()

    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
        win.center()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.on('window:close', (_, isHideToTray: boolean = true) => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      if (isHideToTray) {
        win.close()
        if (ipcMain.listenerCount('launch:exit')) ipcMain.emit('launch:exit')
        return
      }

      win.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

const createLoadingWindow = (): {
  loadingWindow: BrowserWindow
  startApp: (appUpdater: AppUpdater, maiNWindow: BrowserWindow) => Promise<void>
} => {
  const loadingWindow = new BrowserWindow({
    width: 400,
    height: 500,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    darkTheme: true,
    accentColor: 'black',
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    closable: false,
    webPreferences: {
      nodeIntegration: false,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    loadingWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/loading')
  } else {
    loadingWindow.loadFile(join(__dirname, '../renderer/loading.html'))
  }

  loadingWindow.on('ready-to-show', () => {
    loadingWindow.show()
  })

  const startApp = async (appUpdater: AppUpdater, mainWindow: BrowserWindow): Promise<void> => {
    loadingWindow.show()

    loadingWindow.webContents.send('load:status', JSON.stringify('check-for-update'))
    try {
      const res = await appUpdater.checkForUpdates()

      if (res?.isUpdateAvailable) {
        loadingWindow.webContents.send('load:status', JSON.stringify('updating'))
        await appUpdater.downloadUpdate()
        appUpdater.quitAndInstall(true, true)
      }
    } catch (err) {
      console.log(err)
    } finally {
      setTimeout(() => {
        loadingWindow.webContents.send('load:status', JSON.stringify('starting'))

        useLoginService()
        useLaunchService(mainWindow)
      }, 1500)

      setTimeout(() => {
        loadingWindow.webContents.send('load:status', JSON.stringify('app-started'))
        loadingWindow.close()
        loadingWindow.webContents.close()
        mainWindow.show()
        mainWindow.focus()
      }, 2500)
    }
  }

  return {
    loadingWindow,
    startApp
  }
}

const useWindowService = (): {
  createMainWindow: () => BrowserWindow
  createLoadingWindow: () => {
    loadingWindow: BrowserWindow
    startApp: (appUpdater: AppUpdater, maiNWindow: BrowserWindow) => Promise<void>
  }
} => {
  return {
    createMainWindow,
    createLoadingWindow
  }
}

export default useWindowService
