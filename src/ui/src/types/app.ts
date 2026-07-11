import { IUser } from '@ui/env'

export enum AccountType {
  BACKEND = 'backend',
  MICROSOFT = 'microsoft'
}

export enum ActiveTab {
  LOGIN = 'login',
  REGISTER = 'register'
}

export enum SearchKeyWord {
  BANNED = 'banned',
  PREMIUM = 'premium',
  NOHWID = 'nohwid',
  ONLINE = 'online',
  ROLE = 'role',
  HWID = 'hwid'
}

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MOD = 'mod',
  DEV = 'technik',
  DEV_EN = 'dev',
  HELPER = 'helper',
  POMOCNIK = 'pomocnik',
  USER = 'gracz'
}

export type SavedAccount = Partial<
  IUser & {
    password: string
    accountType: AccountType
    url: string
  }
>

export type IMessage = Partial<{
  sender: string
  receiver: string
  content: string
  createdAt: Date | string
  read: boolean
}>
