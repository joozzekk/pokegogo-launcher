import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import icon from '../../../resources/icon.png?asset'
import { useLoginService } from './login-service'
import { useLaunchService } from './launch-service'
import { getMaxRAMInGB } from '../utils'
import { machineId } from 'node-machine-id'
import { address } from 'address/promises'
import Logger from 'electron-log'

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
      sandbox: false,
      devTools: is.dev
    }
  })

  if (process.platform !== 'darwin') {
    // Opcjonalny warunek, by uniknąć problemów na macOS
    // Włączenie software WebGL
    app.commandLine.appendSwitch('enable-unsafe-swiftshader')
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.webContents.send('change:max-ram', Math.floor(getMaxRAMInGB() * 0.95))
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

  ipcMain.on('window:close', (_, isHideToTray: boolean = true) => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      if (isHideToTray) {
        Logger.log('PokeGoGo Launcher > Hidden in tray')
        win.hide()
        return
      }

      win.close()
      if (ipcMain.listenerCount('launch:exit')) ipcMain.emit('launch:exit')
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../ui/index.html'))
  }

  return mainWindow
}

const createLoadingWindow = (): {
  loadingWindow: BrowserWindow
  startApp: (maiNWindow: BrowserWindow) => Promise<void>
} => {
  const loadingWindow = new BrowserWindow({
    width: 300,
    height: 400,
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
    loadingWindow.loadFile(join(__dirname, '../ui/loading.html'))
  }

  loadingWindow.on('ready-to-show', () => {
    loadingWindow.show()
  })

  const startApp = async (mainWindow: BrowserWindow): Promise<void> => {
    ipcMain.handleOnce('load:start-services', async () => {
      try {
        useLoginService()
        useLaunchService(mainWindow)
        return { ok: true }
      } catch (err) {
        Logger.error('Error starting services', err)
        return { ok: false, error: String(err) }
      }
    })

    ipcMain.on('load:finish', () => {
      try {
        loadingWindow.close()
        loadingWindow.webContents.close()
        mainWindow.show()
        mainWindow.focus()
      } catch (err) {
        Logger.error(err)
      }
    })
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
    startApp: (maiNWindow: BrowserWindow) => Promise<void>
  }
} => {
  return {
    createMainWindow,
    createLoadingWindow
  }
}

export default useWindowService
