import { Authenticator, Client } from 'minecraft-launcher-core'
import path from 'path'
import { app } from 'electron'
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
  resolution: string
): Promise<void> {
  const baseDir = app.getPath('userData')
  const minecraftDir = path.join(baseDir, 'mcfiles')
  const client = new Client()

  const [width, height] = resolution.split('x').map((v: string) => parseInt(v))

  await client
    .launch({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      authorization: token ? toMCLC(token, true) : Authenticator.getAuth(username!),
      root: minecraftDir,
      version: {
        number: version,
        type: 'release',
        custom: '1.21.1-fabric'
      },
      window: {
        width,
        height
      },
      memory: {
        max: '16G',
        min: '6G'
      }
    })
    .then(console.log)
    .catch(console.log)

  client.on('debug', console.log)
  client.on('data', console.log)
  client.on('error', console.log)
  client.on('progress', console.log)
  client.on('close', () => console.log('Minecraft został zamknięty'))
}
