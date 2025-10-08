import { Authenticator, Client } from 'minecraft-launcher-core'
import path from 'path'
import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { getMaxRAMInGB } from '../utils'
import os from 'os'

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
    },
    user_properties: {
      POKE_SECRET_KEY: 'LUNCH_NA_ZAWOLANIE'
    }
  }
}

const nonPremiumToMCLC = async (json: string): Promise<unknown> => {
  const profile = JSON.parse(json)
  const res = await Authenticator.getAuth(profile.nickname)

  return {
    ...res,
    uuid: profile.uuid,
    user_properties: {
      POKE_SECRET_KEY: 'LUNCH_NA_ZAWOLANIE'
    }
  }
}

export async function launchMinecraft(
  win: BrowserWindow,
  version: string,
  token: string,
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

  // use the java from C:/Program Files/Java if on Windows
  // otherwise use the system java
  const javaPath =
    plt === 'win32' ? 'C:\\Program Files\\Java\\jdk-21\\bin\\java.exe' : '/usr/bin/java'
  const isFullScreen = settings.displayMode === 'Pełny ekran' ? true : false
  const { width: fullWidth, height: fullHeight } = screen.getPrimaryDisplay().bounds
  const [width, height] = isFullScreen
    ? [fullWidth, fullHeight]
    : settings.resolution.split('x').map((v: string) => parseInt(v))
  const maxRAM = getMaxRAMInGB()

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
      max: `${Math.floor(0.75 * maxRAM)}G`,
      min: `${settings.ram}G`
    }
  })

  if (ipcMain.listenerCount('exit-launch') > 0) {
    ipcMain.removeHandler('exit-launch')
  }

  ipcMain.handle('exit-launch', () => {
    client.emit('close', 1)
    process?.kill('SIGTERM')
  })

  win.webContents.send('change-launch-state', JSON.stringify('minecraft-start'))

  client.on('debug', (...args) => console.log('DEBUG', ...args))
  client.on('data', (data) => {
    if (data.includes('Initializing Client')) {
      win.webContents.send('change-launch-state', JSON.stringify('minecraft-started'))
    }
    console.log('DATA', data)
  })
  client.on('error', (...args) => console.log('ERROR', ...args))
  client.on('progress', (...args) => console.log('PROGRESS', ...args))
  client.on('close', () => {
    win.webContents.send('change-launch-state', JSON.stringify('minecraft-closed'))
    console.log('Minecraft został zamknięty')
  })
}
