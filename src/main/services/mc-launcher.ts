import { Authenticator, Client } from 'minecraft-launcher-core'
import path from 'path'
import { app } from 'electron'

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

  console.log(res)

  return {
    ...res,
    uuid: profile.uuid,
    user_properties: {
      POKE_SECRET_KEY: 'LUNCH_NA_ZAWOLANIE'
    }
  }
}

export async function launchMinecraft(
  version: string,
  token: string,
  resolution: string,
  accountType: string
): Promise<void> {
  const baseDir = app.getPath('userData')
  const minecraftDir = path.join(baseDir, 'mcfiles')
  const client = new Client()

  const [width, height] = resolution.split('x').map((v: string) => parseInt(v))

  await client
    .launch({
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
