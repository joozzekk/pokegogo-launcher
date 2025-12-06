import { Authenticator, Client } from 'minecraft-launcher-core'
import path, { join } from 'path'
import { app, BrowserWindow, ipcMain, screen } from 'electron'
// import { getMaxRAMInGB } from '../utils'
import os from 'os'
import Logger from 'electron-log'

const toMCLC = (token: string): unknown => {
  const data = JSON.parse(token)

  return {
    access_token: data.mcToken,
    client_token: data.profile.uuid,
    uuid: data.profile.id,
    name: data.profile.name,
    meta: {
      xuid: data.xuid,
      type: 'msa',
      demo: false,
      exp: data.exp,
      refresh: true
    }
  }
}

const nonPremiumToMCLC = async (json: string): Promise<unknown> => {
  const profile = JSON.parse(json)
  const res = await Authenticator.getAuth(profile.nickname)

  return {
    ...res,
    uuid: profile.uuid
  }
}

export async function launchMinecraft(
  win: BrowserWindow,
  version: string,
  token: string,
  accessToken: string,
  settings: {
    ram: number
    resolution: string
    displayMode: string
  },
  accountType: string
): Promise<void> {
  const plt = os.platform()
  const baseDir = app.getPath('userData')
  const minecraftDir = path.join(baseDir, 'mcfiles')
  const client = new Client()

  const javaPath = join(baseDir, 'java/jdk-21.0.8/bin/', plt === 'win32' ? 'java.exe' : 'java')

  const isFullScreen = settings.displayMode === 'Pełny ekran' ? true : false
  const { width: fullWidth, height: fullHeight } = screen.getPrimaryDisplay().bounds
  const [width, height] = isFullScreen
    ? [fullWidth, fullHeight]
    : settings.resolution.split('x').map((v: string) => parseInt(v))

  const process = await client.launch({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    authorization: accountType === 'microsoft' ? toMCLC(token) : await nonPremiumToMCLC(token),
    root: minecraftDir,
    javaPath,
    version: {
      number: version,
      type: 'release',
      custom: '1.21.1-fabric'
    },
    window: {
      width,
      height,
      fullscreen: settings.displayMode === 'Pełny ekran' ? true : false
    },
    memory: {
      max: `${settings.ram}G`,
      min: `4G`
    },
    customArgs: [`-DaccessToken=${accessToken}`]
  })

  let mcOpened = false

  ipcMain.removeHandler('launch:exit')
  ipcMain.handle('launch:exit', () => {
    client.emit('close', 1)
    process?.kill('SIGTERM')
    Logger.log('PokeGoGo Launcher > Killed minecraft.')
    win.webContents.send('launch:change-state', JSON.stringify('minecraft-closed'))
  })

  ipcMain.removeHandler('launch:check-state')
  ipcMain.handle('launch:check-state', async (): Promise<boolean> => {
    Logger.log('PokeGoGo Launcher > Checking minecraft status..')
    return mcOpened
  })

  Logger.log('PokeGoGo Launcher > MC Started')
  win.webContents.send('launch:change-state', JSON.stringify('minecraft-start'))

  client.on('debug', (data) => {
    Logger.log('PokeGoGo Launcher > MC Debug > ', data)
  })
  client.on('data', (data) => {
    Logger.log('PokeGoGo Launcher > MC Data > ', data)
    win.webContents.send('launch:change-state', JSON.stringify('minecraft-start'))

    if (data.includes('Initializing Client')) {
      win.webContents.send('launch:change-state', JSON.stringify('minecraft-started'))
      mcOpened = true
      win.hide()
    }
  })
  client.on('progress', (data) => {
    Logger.log('PokeGoGo Launcher > MC Progress > ', data)
  })
  client.on('close', () => {
    Logger.log('PokeGoGo Launcher > MC Closed')
    win.webContents.send('launch:change-state', JSON.stringify('minecraft-closed'))
    mcOpened = false
    win.show()
  })
}
