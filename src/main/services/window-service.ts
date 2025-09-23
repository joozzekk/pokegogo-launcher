import { is } from '@electron-toolkit/utils'
import { BrowserWindow, ipcMain, shell } from 'electron'
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
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  ipcMain.on('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  ipcMain.on('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.maximize()
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
