import electronUpdater, { type AppUpdater } from 'electron-updater'
import * as log from 'electron-log'

export function getAutoUpdater(): AppUpdater {
  const { autoUpdater } = electronUpdater

  autoUpdater.logger = log
  log.transports.file.level = 'info'

  autoUpdater.forceDevUpdateConfig = true

  return autoUpdater
}
