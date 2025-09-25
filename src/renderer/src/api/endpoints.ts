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
