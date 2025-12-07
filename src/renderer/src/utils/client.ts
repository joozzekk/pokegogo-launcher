import { router } from '@renderer/router'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.RENDERER_VITE_API_URL
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (err) => Promise.reject(err)
)

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !['/auth/login', '/auth/register'].includes(originalRequest.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = 'Bearer ' + token
            return axios(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refresh_token')

      return new Promise((resolve, reject) => {
        api
          .post('/auth/refresh', { refreshToken })
          .then(({ data }) => {
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('refresh_token', data.refresh_token)
            api.defaults.headers.common.Authorization = 'Bearer ' + data.access_token
            originalRequest.headers.Authorization = 'Bearer ' + data.access_token
            processQueue(null, data.access_token)
            resolve(axios(originalRequest))
          })
          .catch((err) => {
            processQueue(err, null)
            localStorage.removeItem('token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('mcToken')
            router.push('/')
            reject(err)
          })
          .finally(() => {
            isRefreshing = false
          })
      })
    }

    if (!error.response) {
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('mcToken')
      router.push('/')
      return Promise.reject(new Error('Brak połączenia z siecią. Spróbuj ponownie później'))
    }

    return Promise.reject(error)
  }
)

export default api
