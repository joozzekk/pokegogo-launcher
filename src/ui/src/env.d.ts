/// <reference types="vite/client" />

import { UserRole } from './types/app'

interface ImportMetaEnv {
  readonly RENDERER_VITE_API_URL: string
  readonly RENDERER_VITE_SERVER_IP: string
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
}
