/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly RENDERER_VITE_API_URL: string
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
  isOnline: boolean
  machineId?: string
  lastLoginAt: string
  totalPlayTime: string
  accountType: string
  macAddress: string
  ipAddress: string
  role: string
}
