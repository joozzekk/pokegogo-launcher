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
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  DEV = 'technik',
  HELPER = 'helper',
  USER = 'gracz'
}

export type SavedAccount = Partial<
  IUser & {
    password: string
    accountType: AccountType
    url: string
  }
>
