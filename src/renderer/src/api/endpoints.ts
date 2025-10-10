/* eslint-disable @typescript-eslint/no-explicit-any */
import { type IUser } from '@renderer/env'
import api from '@renderer/utils/client'

export const fetchLogin = async (
  nickname: string,
  password: string
): Promise<{ access_token: string; refresh_token: string }> => {
  const res = await api.post('/auth/login', {
    nickname,
    password
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

export const updateMachineData = async (
  nickname: string,
  data: {
    machineId: string
    macAddress: string
    ipAddress: string
  }
): Promise<any> => {
  const res = await api.post('/users/machine-data', {
    nickname,
    ...data
  })

  return res.data
}

export const updateProfileData = async (
  nickname: string,
  data: {
    accountType: string
  }
): Promise<any> => {
  const res = await api.post('/users/profile-data', {
    nickname,
    ...data
  })

  return res.data
}

export const updateBackendUserFromMicrosoft = async (data: Partial<IUser>): Promise<any> => {
  const res = await api.post('/users/from-microsoft', data)

  return res.data
}

export const banPlayer = async (nickname: string, uuid: string, pin: string): Promise<any> => {
  const res = await api.post('/users/launcher-ban', {
    nickname,
    uuid,
    pin
  })

  return res.data
}

export const unbanPlayer = async (nickname: string, uuid: string, pin: string): Promise<any> => {
  const res = await api.post('/users/launcher-unban', {
    nickname,
    uuid,
    pin
  })

  return res.data
}
