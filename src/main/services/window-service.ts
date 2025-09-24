import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, screen, shell } from 'electron'
import { join } from 'path'
import icon from '../../../resources/icon.png?asset'

const createWindow = (): BrowserWindow => {
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

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.webContents.send('change-version', app.getVersion())
  })

  ipcMain.on('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  ipcMain.on('window-maximize', (_, defaultSize: string) => {
    const win = BrowserWindow.getFocusedWindow()

    if (win) {
      if (win.isMaximized()) {
        const [width, height] = defaultSize.split('x').map((v: string) => parseInt(v))
        win.unmaximize()
        win.setSize(width, height)
        win.center()
      } else {
        const { width, height } = screen.getPrimaryDisplay().bounds
        win.maximize()
        win.setSize(width, height)
      }
    }
  })

  ipcMain.on('window-close', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.close()
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

const useWindowService = (): {
  createWindow: () => BrowserWindow
} => {
  return {
    createWindow
  }
}

export default useWindowService
