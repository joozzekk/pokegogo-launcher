import { type AppUpdater } from 'electron-updater'
import { getAutoUpdater } from './electron-updater'
import { app, ipcMain, Notification, type BrowserWindow } from 'electron'
import update from '../../../resources/update.png?asset'
import Logger from 'electron-log'
import { unlink } from 'fs/promises'
import { posix } from 'path'

export const useAppUpdater = (win: BrowserWindow): AppUpdater => {
  let notified = false
  const autoUpdater = getAutoUpdater()

  ipcMain.handle(
    'update:check',
    async (_event, channel?: string, showNotifications: boolean = true): Promise<boolean> => {
      if (channel) {
        autoUpdater.channel = channel
        Logger.log(`Current update channel: ${autoUpdater.channel}`)
      } else {
        autoUpdater.channel = 'beta'
      }

      try {
        const res = await autoUpdater.checkForUpdates()

        if (res) Logger.log(res)

        if (
          res?.updateInfo &&
          res.updateInfo.version !== autoUpdater.currentVersion.version &&
          showNotifications
        ) {
          const isUpdateAvailable =
            !!res.updateInfo && res.updateInfo.version !== autoUpdater.currentVersion.version

          if (isUpdateAvailable) {
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
          return isUpdateAvailable
        }

        return res?.updateInfo
          ? res.updateInfo.version !== autoUpdater.currentVersion.version
          : false
      } catch (error) {
        Logger.error('Error when checking update:', error)
        return false
      }
    }
  )

  ipcMain.handle('update:start', async () => {
    await unlink(posix.join(app.getPath('userData'), '.mcfiles_installed'))
    await autoUpdater.downloadUpdate()
    autoUpdater.quitAndInstall()
  })

  return autoUpdater
}
