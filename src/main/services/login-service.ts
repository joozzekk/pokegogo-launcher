import { ipcMain } from 'electron'
import { Auth } from 'msmc'

export const useLoginService = (): void => {
  const auth = new Auth('select_account')

  ipcMain.handle(
    'refresh-token',
    async (_, refreshToken: string): Promise<{ refreshToken: string; mcToken: string }> => {
      console.log('Refreshing token...')
      const xbox = await auth.refresh(refreshToken)
      const mc = await xbox.getMinecraft()

      return {
        refreshToken: xbox.save(),
        mcToken: JSON.stringify(mc.getToken(true))
      }
    }
  )

  ipcMain.handle('login', async () => {
    const xbox = await auth.launch('electron')
    const mc = await xbox.getMinecraft()

    return {
      refreshToken: xbox.save(),
      mcToken: JSON.stringify(mc.getToken(true))
    }
  })
}
