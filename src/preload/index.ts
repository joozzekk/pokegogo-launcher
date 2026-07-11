import { contextBridge, ipcRenderer, shell, type IpcRendererEvent } from 'electron'

// Wyselekcjonowane i bezpieczne API dla renderera
const electronAPI = {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, func: (event: IpcRendererEvent, ...args: unknown[]) => void) => {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]): void =>
        func(_event, ...args)
      ipcRenderer.on(channel, subscription)
      return () => ipcRenderer.removeListener(channel, subscription)
    },
    once: (channel: string, func: (event: IpcRendererEvent, ...args: unknown[]) => void) => {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]): void =>
        func(_event, ...args)
      ipcRenderer.once(channel, subscription)
    },
    invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
  },
  shell: {
    openExternal: (url: string) => shell.openExternal(url)
  },
  images: {
    getEvent: (uuid: string, url: string) => ipcRenderer.invoke('image:get-event', uuid, url)
  }
}

const discordAPI = {
  setActivity: (details: string, state: string) => {
    ipcRenderer.send('discord:update-activity', { details, state })
  }
}

// Eksponowanie API do okna przeglądarki
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('discord', discordAPI)
  } catch (error) {
    console.error('Preload Error:', error)
  }
} else {
  // @ts-ignore (fallback dla braku izolacji)
  window.electron = electronAPI
  // @ts-ignore (fallback dla braku izolacji)
  window.discord = discordAPI
}
