import { type AppUpdater } from 'electron-updater'
import { getAutoUpdater } from './electron-updater'
import { ipcMain, Notification, type BrowserWindow } from 'electron'
import update from '../../../resources/update.png?asset'
import Logger from 'electron-log'

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
    Logger.log('Auth err: ', err)
  })
  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update:available', false)
  })

  ipcMain.handle(
    'update:check',
    async (_event, channel?: string, showNotifications: boolean = true) => {
      if (channel) {
        autoUpdater.channel = channel
        Logger.log(`Ustawiono kanał aktualizacji na: ${autoUpdater.channel}`)
      } else {
        autoUpdater.channel = 'beta'
      }

      try {
        const res = await autoUpdater.checkForUpdates()

        if (res) Logger.log(res)

        if (
          res?.updateInfo &&
          res.updateInfo.version !== autoUpdater.currentVersion &&
          showNotifications
        ) {
          const isUpdateAvailable =
            !!res.updateInfo && res.updateInfo.version !== autoUpdater.currentVersion

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

        return res?.updateInfo && res.updateInfo.version !== autoUpdater.currentVersion
      } catch (error) {
        Logger.error('Błąd podczas sprawdzania aktualizacji:', error)
        return false
      }
    }
  )

  ipcMain.handle('update:start', async () => {
    await autoUpdater.downloadUpdate()
    autoUpdater.quitAndInstall()
  })

  return autoUpdater
}
