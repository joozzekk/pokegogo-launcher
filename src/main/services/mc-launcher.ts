import { Authenticator, Client } from 'minecraft-launcher-core'
import path from 'path'
import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { getMaxRAMInGB } from '../utils'

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
  const baseDir = app.getPath('userData')
  const minecraftDir = path.join(baseDir, 'mcfiles')
  const client = new Client()

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

  ipcMain.handle('exit-launch', () => {
    client.emit('close', 1)
    process?.kill('SIGTERM')
    ipcMain.removeHandler('exit-launch')
  })

  win.webContents.send('change-launch-state', JSON.stringify('minecraft-start'))

  client.on('debug', console.log)
  client.on('data', console.log)
  client.on('error', console.log)
  client.on('progress', console.log)
  client.on('close', () => {
    win.webContents.send('change-launch-state', JSON.stringify('start'))
    console.log('Minecraft został zamknięty')
  })
}
