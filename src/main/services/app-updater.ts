import { type AppUpdater } from 'electron-updater'
import { getAutoUpdater } from './electron-updater'
import { ipcMain, type BrowserWindow } from 'electron'

export const useAppUpdater = (win: BrowserWindow): AppUpdater => {
  const autoUpdater = getAutoUpdater()

  autoUpdater.on('update-available', () => {
    win.webContents.send('update-available', true)
  })
  autoUpdater.on('update-not-available', () => {
    win.webContents.send('update-available', false)
  })
  autoUpdater.on('error', (err) => {
    console.log(err)
  })
  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update-available', false)
  })

  ipcMain.handle('check-for-update', async () => {
    const res = await autoUpdater.checkForUpdates()

    return autoUpdater.currentVersion !== res?.updateInfo?.version
  })

  ipcMain.handle('start-update', async () => {
    await autoUpdater.downloadUpdate()
    autoUpdater.quitAndInstall()
  })

  return autoUpdater
}
