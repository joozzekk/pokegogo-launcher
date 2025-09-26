import electronUpdater, { type AppUpdater } from 'electron-updater'
import * as log from 'electron-log'

export function getAutoUpdater(): AppUpdater {
  const { autoUpdater } = electronUpdater

  autoUpdater.autoDownload = false
  autoUpdater.allowDowngrade = true

  autoUpdater.logger = log
  log.transports.file.level = 'info'

  return autoUpdater
}
