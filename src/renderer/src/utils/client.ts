import { router } from '@renderer/router'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.RENDERER_VITE_API_URL
})

let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error, token = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

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
api.interceptors.response.use(
  (response) => response,
  (err: any) => {
    const originalRequest = err.config

    if (
      err.response?.status === 401 &&
      !originalRequest._retry &&
      !['/auth/login', '/auth/register'].includes(originalRequest.url)
    ) {
      // istniejąca obsługa refresh tokena...
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
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
            api.defaults.headers.common.Authorization = 'Bearer ' + data.access_token
            originalRequest.headers.Authorization = 'Bearer ' + data.access_token
            processQueue(null, data.access_token)
            resolve(axios(originalRequest))
          })
          .catch((err) => {
            processQueue(err, null)
            localStorage.removeItem('token')
            localStorage.removeItem('refresh_token')
            router.push('/')
            reject(err)
          })
          .finally(() => {
            isRefreshing = false
          })
      })
    }

    if (!err.response) {
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      router.push('/')
      return Promise.reject(new Error('Brak połączenia z siecią. Spróbuj ponownie później'))
    }

    return Promise.reject(err)
  }
)

export default api
