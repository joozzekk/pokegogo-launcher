/// <reference types="vite/client" />

import { UserRole } from './types/app'

interface ImportMetaEnv {
  readonly RENDERER_VITE_API_URL: string
  readonly RENDERER_VITE_SERVER_IP: string
  readonly VITE_DISCORD_ERROR_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface global {
  PokeGoGoLogin: class
}

export interface IUser {
  uuid: string
  mcid: string
  email: string
  nickname: string
  createdAt: string
  isBanned: boolean
  banReason?: string
  banType?: string
  banEndDate: Date | string
  isOnline: boolean
  isMcOpened: boolean
  machineId?: string
  lastLoginAt: string
  totalPlayTime: string
  accountType: string
  macAddress: string
  ipAddress: string
  role: UserRole
  enableUpdateChannel: boolean
  friends: string[]
  friendRequests: string[]
  headUrl?: string
  hwidAccountCount?: number
  discordId?: string
}

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => void
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        send: (channel: string, ...args: any[]) => void
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        invoke: (channel: string, ...args: any[]) => Promise<any>
        removeAllListeners: (channel: string) => void
      }
      shell: {
        openExternal: (url: string) => void
      }
      images: {
        getEvent: (uuid: string, url: string) => Promise<string>
      }
    }
    discord: {
      setActivity: (details: string, state: string) => void
    }
  }
}
