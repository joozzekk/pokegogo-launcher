import { Authenticator, Client } from 'minecraft-launcher-core'
import path from 'path'
import { app } from 'electron'
import log from 'electron-log'
import { Auth } from 'msmc'

const toMCLC = (token: string, refreshable: boolean = false): unknown => {
  const data = JSON.parse(JSON.parse(token))

  return {
    access_token: data.mcToken,
    client_token: data.profile.uuid,
    uuid: data.profile.id,
    name: data.profile.name,
    meta: {
      xuid: data.xuid,
      type: 'msa',
      demo: token.length ? false : true,
      exp: data.exp,
      refresh: refreshable
        ? data.parent instanceof Auth
          ? data.refreshTkn
          : data.parent.msToken.refresh_token
        : undefined
    },
    user_properties: {
      POKE_SECRET_KEY: 'Pizda:)'
    }
  }
}

export async function launchMinecraft(
  version: string,
  token: string,
  username?: string
): Promise<void> {
  const baseDir = app.getPath('userData')
  const minecraftDir = path.join(baseDir, 'mcfiles')
  const client = new Client()

  await client
    .launch({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      authorization: token ? toMCLC(token) : Authenticator.getAuth(username!),
      root: minecraftDir,
      version: {
        number: version,
        type: 'release',
        custom: '1.21.1-fabric'
      },
      memory: {
        max: '16G',
        min: '6G'
      }
    })
    .catch(log.error)

  client.on('debug', log.debug)
  client.on('data', log.info)
  client.on('error', log.error)
  client.on('progress', log.info)
  client.on('close', () => log.info('Minecraft został zamknięty'))
}
