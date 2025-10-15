import { type AppUpdater } from 'electron-updater'
import { getAutoUpdater } from './electron-updater'
import { ipcMain, Notification, type BrowserWindow } from 'electron'
import update from '../../../resources/update.png?asset'

export const useAppUpdater = (win: BrowserWindow): AppUpdater => {
  let notified = false
  const autoUpdater = getAutoUpdater()

  autoUpdater.on('update-available', () => {
    win.webContents.send('update:available', true)
  })
  autoUpdater.on('update-not-available', () => {
    win.webContents.send('update:available', false)
  })
  autoUpdater.on('error', (err) => {
    console.log(err)
  })
  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update:available', false)
  })

  ipcMain.handle('update:check', async (_event, showNotifications: boolean) => {
    const res = await autoUpdater.checkForUpdates()

    if (res?.isUpdateAvailable && showNotifications) {
      const updateNotify = new Notification({
        icon: update,
        title: 'Hej, nowa wersja launchera już czeka 👻',
        body: 'Pobierz najnowszą wersję launchera i już teraz ciesz się najnowszymi funkcjami 😉'
      })

      updateNotify.on('click', () => {
        win.show()
      })

      if (!notified) {
        updateNotify.show()
        notified = true
      }
    }

    return res?.isUpdateAvailable ?? false
  })

  ipcMain.handle('update:start', async () => {
    await autoUpdater.downloadUpdate()
    autoUpdater.quitAndInstall()
  })

  return autoUpdater
}
