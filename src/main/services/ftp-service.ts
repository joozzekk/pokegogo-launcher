import ftp, { type Client } from 'basic-ftp'

export const safeCd = async (client: Client, dir: string): Promise<boolean> => {
  try {
    await client.cd(dir)
    return true
  } catch (e) {
    console.error(`Nie można wejść do katalogu: ${dir}`, e)
    return false
  }
}

export const useFTP = (): { client: Client; connect: () => Promise<void> } => {
  const client = new ftp.Client(1000 * 120)

  const connect = async (): Promise<void> => {
    await client.access({
      host: '57.128.211.105',
      user: 'ftpuser',
      password: 'Ewenement2023$'
    })

    client.ftp.encoding = 'utf-8'
    client.ftp.verbose = true
  }

  return {
    client,
    connect
  }
}
