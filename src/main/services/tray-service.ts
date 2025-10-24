import { app, BrowserWindow, Menu, Tray } from 'electron'
import icon from '../../../resources/icon.png?asset'

export let tray: Tray | null = null

export const createTray = (win: BrowserWindow): void => {
  tray = new Tray(icon)

  tray.addListener('double-click', () => {
    win.show()
  })
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Otwórz launcher',
      click: () => {
        win.show()
      }
    },
    {
      label: 'Zamknij aplikację',
      click: () => {
        app.quit()
      }
    }
  ])
  tray.setToolTip('PokeGoGo Launcher')
  tray.setContextMenu(contextMenu)
}
