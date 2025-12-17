/* eslint-disable @typescript-eslint/no-explicit-any */
import { type IUser } from '@renderer/env'
import api from '@renderer/utils/client'
import { Ref } from 'vue'

export const fetchLogin = async (
  nickname: string,
  password: string,
  microsoft?: boolean
): Promise<{ access_token: string; refresh_token: string }> => {
  const res = await api.post('/auth/login', {
    nickname,
    password,
    microsoft
  })

  return res.data
}

export const fetchRegister = async (
  nickname: string,
  email: string,
  password: string
): Promise<{ access_token: string; refresh_token: string }> => {
  const res = await api.post('/auth/register', {
    nickname,
    email,
    password
  })

  return res.data
}

export const fetchProfile = async (): Promise<any> => {
  const res = await api.get('/auth/profile')

  return res.data
}

export const changePassword = async (
  nickname: string,
  oldPassword: string,
  newPassword: string
): Promise<any> => {
  const res = await api.post('/auth/change-password', {
    nickname,
    oldPassword,
    newPassword
  })

  return res.data
}

export const changeEmail = async (nickname: string, newEmail: string): Promise<any> => {
  const res = await api.post('/auth/change-email', {
    nickname,
    newEmail
  })

  return res.data
}

export const fetchAllPlayers = async (nickname: string): Promise<any> => {
  const res = await api.post('/users/all', {
    nickname
  })

  return res.data
}

export const updateMachineData = async (data: {
  machineId: string
  macAddress: string
  ipAddress: string
}): Promise<any> => {
  const res = await api.post('/users/machine-data', {
    ...data
  })

  return res.data
}

export const updateProfileData = async (data: { accountType: string }): Promise<any> => {
  const res = await api.post('/users/profile-data', {
    ...data
  })

  return res.data
}

export const updateBackendUserFromMicrosoft = async (data: Partial<IUser>): Promise<any> => {
  const res = await api.post('/users/from-microsoft', data)

  return res.data
}

export const banPlayer = async (
  player: Partial<IUser & { reason: string; type: string; endDate: Date | null }>
): Promise<any> => {
  const res = await api.post('/users/launcher-ban', {
    ...player
  })

  return res.data
}

export const unbanPlayer = async (player: Partial<IUser> & { type?: string }): Promise<any> => {
  const res = await api.post('/users/launcher-unban', {
    ...player
  })

  return res.data
}

export const connectPlayer = async (): Promise<any> => {
  const res = await api.post('/users/connect')

  return res.data
}

export const disconnectPlayer = async (): Promise<any> => {
  const res = await api.post('/users/disconnect')

  return res.data
}

export const getServerStatus = async (time: Ref<number>): Promise<any> => {
  const now = performance.now()
  const serverIP = import.meta.env.RENDERER_VITE_SERVER_IP
  const res = await fetch(`https://api.mcsrvstat.us/2/${serverIP}`)
  const after = performance.now()

  time.value = after - now

  return res.json()
}

export const getItems = async (): Promise<any[]> => {
  const res = await api.get('/items')

  return res.data
}

export const createItem = async (item: any): Promise<any> => {
  const res = await api.post('/items', item)

  return res.data
}

export const updateItem = async (item: any): Promise<any> => {
  const res = await api.put('/items', item)

  return res.data
}

export const removeItem = async (uuid: number): Promise<any> => {
  const res = await api.delete(`/items/${uuid}`)

  return res.data
}

export const getEvents = async (): Promise<any[]> => {
  const res = await api.get('/events')

  return res.data
}

export const createEvent = async (event: any): Promise<any> => {
  const res = await api.post('/events', event)

  return res.data
}

export const updateEvent = async (event: any): Promise<any> => {
  const res = await api.put('/events', event)

  return res.data
}

export const removeEvent = async (uuid: number): Promise<any> => {
  const res = await api.delete(`/events/${uuid}`)

  return res.data
}

export const getChangelog = async (): Promise<any[]> => {
  const res = await api.get('/changelog')

  return res.data
}

export const createChangelog = async (event: any): Promise<any> => {
  const res = await api.post('/changelog', event)

  return res.data
}

export const updateChangelog = async (event: any): Promise<any> => {
  const res = await api.put('/changelog', event)

  return res.data
}

export const removeChangelog = async (uuid: number): Promise<any> => {
  const res = await api.delete(`/changelog/${uuid}`)

  return res.data
}

export const resetPassword = async (nickname: string): Promise<any> => {
  const res = await api.post(`/users/reset-password`, {
    nickname
  })

  return res.data
}

export const checkMachineID = async (machineId: string): Promise<any> => {
  const res = await api.post(`/users/check-machine-id`, {
    machineId
  })

  return res.data
}

export const changeUpdateChannel = async (
  nickname: string,
  enableUpdateChannel: boolean
): Promise<any> => {
  const res = await api.post(`/users/update-channel`, {
    nickname,
    enableUpdateChannel
  })

  return res.data
}

export const changeCustomSkin = async (body: any): Promise<any> => {
  const res = await api.post(`/skins`, body, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })

  return res.data
}
