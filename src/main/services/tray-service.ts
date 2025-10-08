import { app, BrowserWindow, Menu, Tray } from 'electron'

export let tray: Tray | null = null

export const createTray = (win: BrowserWindow): void => {
  tray = new Tray('path_to_icon.png')
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Pokaż',
      click: () => {
        win.show()
      }
    },
    {
      label: 'Zamknij',
      click: () => {
        app.quit()
      }
    }
  ])
  tray.setToolTip('Minecraft Launcher')
  tray.setContextMenu(contextMenu)
}
