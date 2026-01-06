import { Authenticator, Client } from 'minecraft-launcher-core'
import path, { join } from 'path'
import { app, BrowserWindow, screen } from 'electron'
import os from 'os'
import Logger from 'electron-log'
import { ChildProcessWithoutNullStreams } from 'child_process'

// Token -> MCLC
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

const getGameVersionByMode = (): string => {
  return '1.21.1-fabric'
}

const getVersionNumberByMode = (): string => {
  return '1.21.1'
}

export type DisplayMode = 'Pełny ekran' | 'Okno'

export interface MinecraftSettings {
  ram: number
  resolution: string
  displayMode: DisplayMode
  gameMode: string
}

export interface MinecraftInstanceConfig {
  token: string
  accessToken: string
  accountType: 'microsoft' | 'nonPremium'
  settings: MinecraftSettings
  window: BrowserWindow
}

export interface MinecraftInstance {
  mcOpened: boolean
  process: number | null
  start: () => Promise<void>
  stop: () => Promise<void>
}

function resolveJavaPath(baseDir: string): string {
  const plt = os.platform()

  return join(
    baseDir,
    'java',
    plt === 'win32'
      ? 'jdk-21.0.8/bin/java.exe'
      : plt === 'darwin'
        ? 'jdk-21.0.8.jdk/Contents/Home/bin/java'
        : 'jdk-21.0.8/bin/java'
  )
}

function computeResolution(
  displayMode: DisplayMode,
  resolution: string
): { width: number; height: number; fullscreen: boolean } {
  const { width: fullWidth, height: fullHeight } = screen.getPrimaryDisplay().bounds
  const fullscreen = displayMode === 'Pełny ekran'
  if (fullscreen) {
    return { width: fullWidth, height: fullHeight, fullscreen }
  }
  const [widthStr, heightStr] = resolution.split('x')
  const width = parseInt(widthStr, 10)
  const height = parseInt(heightStr, 10)
  return { width, height, fullscreen }
}

export function createMinecraftInstance(config: MinecraftInstanceConfig): MinecraftInstance {
  const { token, accessToken, accountType, settings, window } = config
  const plt = os.platform()
  const baseDir = app.getPath('userData')
  const minecraftDir = path.join(baseDir, 'instances', settings.gameMode.toLowerCase())
  const client = new Client()
  const javaPath = resolveJavaPath(baseDir)

  let mcOpened = false
  let childProcess: ChildProcessWithoutNullStreams | null = null

  const start = async (): Promise<void> => {
    const { width, height, fullscreen } = computeResolution(
      settings.displayMode,
      settings.resolution
    )

    const authorization =
      accountType === 'microsoft' ? toMCLC(token) : await nonPremiumToMCLC(token)

    Logger.log('PokeGoGo Launcher > MC Starting')
    window.webContents.send('launch:change-state', JSON.stringify('minecraft-start'))

    childProcess = await client.launch({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      authorization,
      root: minecraftDir,
      javaPath,
      version: {
        number: getVersionNumberByMode(),
        type: 'release',
        custom: getGameVersionByMode()
      },
      window: {
        width,
        height,
        fullscreen
      },
      memory: {
        max: `${settings.ram}G`,
        min: `4G`
      },
      customArgs: [`-DaccessToken=${accessToken}`]
    })

    client.on('debug', (data) => {
      Logger.log('PokeGoGo Launcher > MC Debug > ', data)
    })

    client.on('data', (data) => {
      Logger.log('PokeGoGo Launcher > MC Data > ', data)
      window.webContents.send('launch:show-log', data)

      if (!mcOpened)
        window.webContents.send('launch:change-state', JSON.stringify('minecraft-start'))

      if (typeof data === 'string' && data.includes('Initializing Client')) {
        window.webContents.send('launch:change-state', JSON.stringify('minecraft-started'))
        mcOpened = true
        if (plt !== 'darwin') window.hide()
      }
    })

    client.on('progress', (data) => {
      Logger.log('PokeGoGo Launcher > MC Progress > ', data)
    })

    client.on('close', () => {
      Logger.log('PokeGoGo Launcher > MC Closed')
      window.webContents.send('launch:change-state', JSON.stringify('minecraft-closed'))
      mcOpened = false
      window.show()
    })

    Logger.log('PokeGoGo Launcher > PID ' + childProcess?.pid + ' started')
  }

  const stop = async (): Promise<void> => {
    try {
      client.emit('close', 1)
      if (childProcess) childProcess.kill('SIGTERM')
    } catch (e) {
      Logger.error('PokeGoGo Launcher > Error killing minecraft process', e)
    } finally {
      mcOpened = false
      window.webContents.send('launch:change-state', JSON.stringify('minecraft-closed'))
      window.show()
      childProcess = null
    }
  }

  return {
    get mcOpened() {
      return mcOpened
    },
    get process() {
      return childProcess?.pid ?? null
    },
    start,
    stop
  }
}
