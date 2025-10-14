import { ipcMain } from 'electron'
import { Auth } from 'msmc'

export const useLoginService = (): void => {
  const auth = new Auth('select_account')

  ipcMain.handle(
    'auth:refresh-token',
    async (_, refreshToken: string): Promise<{ msToken: string; mcToken: string }> => {
      console.log('Refreshing token...')
      const xbox = await auth.refresh(refreshToken)
      const mc = await xbox.getMinecraft()

      return {
        msToken: xbox.save(),
        mcToken: JSON.stringify(mc.getToken(true))
      }
    }
  )

  ipcMain.handle('auth:login', async () => {
    const xbox = await auth.launch('electron')
    const mc = await xbox.getMinecraft()

    return {
      msToken: xbox.save(),
      mcToken: JSON.stringify(mc.getToken(true))
    }
  })
}
