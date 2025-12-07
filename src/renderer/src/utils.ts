/* eslint-disable @typescript-eslint/no-explicit-any */
import { LOGGER } from './services/logger-service'
import useGeneralStore from './stores/general-store'
import { DatePickerPassThroughOptions } from 'primevue'

const TOAST_DURATION = 5000

export const checkUpdate = async (): Promise<void> => {
  const generalStore = useGeneralStore()

  LOGGER.log('Checking for update..')
  const res = await window.electron?.ipcRenderer?.invoke(
    'update:check',
    generalStore.settings.updateChannel,
    generalStore.settings.showNotifications
  )

  LOGGER.success(res ? 'Update available.' : 'App is up-to-date.')
  generalStore.setUpdateAvailable(res)
}

export const MIN_RAM = 5

export const createParticles = (element: HTMLElement): void => {
  const rect = element.getBoundingClientRect()
  const particles = 20

  for (let i = 0; i < particles; i++) {
    const particle = document.createElement('div')
    particle.style.position = 'fixed'
    particle.style.width = '4px'
    particle.style.height = '4px'
    particle.style.background = 'var(--primary)'
    particle.style.borderRadius = '50%'
    particle.style.pointerEvents = 'none'
    particle.style.zIndex = '9999'
    particle.style.left = rect.left + rect.width / 2 + 'px'
    particle.style.top = rect.top + rect.height / 2 + 'px'

    document.body.appendChild(particle)

    const angle = (Math.PI * 2 * i) / particles
    const velocity = 2 + Math.random() * 4

    let opacity = 1
    let scale = 1
    let x = 0
    let y = 0

    const animate = (): void => {
      x += Math.cos(angle) * velocity
      y += Math.sin(angle) * velocity
      opacity -= 0.01
      scale += 0.02

      particle.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
      particle.style.opacity = `${opacity}`

      if (opacity > 0) {
        requestAnimationFrame(animate)
      } else {
        particle.remove()
      }
    }

    requestAnimationFrame(animate)
  }
}

export const showToast = (message: string, type = 'success'): void => {
  const toastContainer = document.getElementById('toastContainer')
  if (toastContainer === null) return
  const toast = document.createElement('div')
  toast.className = `toast ${type}`

  const icon = type === 'success' ? 'check-circle' : 'exclamation-circle'
  toast.innerHTML = `
        <i class="fas fa-${icon} text-xl" style="color: ${type === 'success' ? 'var(--primary)' : '#ef4444'}"></i>
        <span>${message}</span>
    `

  toastContainer.appendChild(toast)

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease'
    setTimeout(() => {
      toast.remove()
    }, TOAST_DURATION * 1.5)
  }, TOAST_DURATION)
}

// Progress toast: returns an updater and a closer
export const showProgressToast = (
  initialMessage: string,
  type: 'success' | 'info' | 'error' = 'info'
): {
  update: (msg: string) => void
  updateProgress: (current: number, total: number, message?: string) => void
  close: (finalMessage?: string, finalType?: 'success' | 'error') => void
} | null => {
  const toastContainer = document.getElementById('toastContainer')
  if (toastContainer === null) return null

  const id = `toast-${Date.now()}-${Math.floor(Math.random() * 10000)}`

  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.id = id

  const icon =
    type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'

  toast.innerHTML = `
    <i class="fas fa-${icon} text-xl toast-icon" style="color: ${
      type === 'success' ? 'var(--primary)' : type === 'error' ? '#ef4444' : 'var(--primary)'
    }"></i>
    <div class="toast-body">
      <span class="toast-message">${initialMessage}</span>
    </div>
    <div class="toast-progress" aria-hidden="true">
      <div class="toast-progress-fill" style="width: 0%"></div>
    </div>
  `

  toastContainer.appendChild(toast)

  const update = (msg: string): void => {
    const span = toast.querySelector('.toast-message')
    if (span) span.textContent = msg
  }

  const updateProgress = (current: number, total: number, message?: string): void => {
    const fill = toast.querySelector('.toast-progress-fill') as HTMLElement | null
    const span = toast.querySelector('.toast-message')
    if (!fill) return
    const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((current / total) * 100))) : 0
    fill.style.width = `${percent}%`
    if (span) span.textContent = `${message?.length ? message + ' ' : ''}${current}/${total}`
  }

  const close = (finalMessage?: string): void => {
    if (finalMessage) {
      const span = toast.querySelector('.toast-message')
      if (span) span.textContent = finalMessage
    }

    toast.style.animation = 'slideOutRight 0.3s ease'
    setTimeout(() => {
      toast.remove()
    }, TOAST_DURATION)
  }

  return { update, updateProgress, close }
}

export const calculateValueFromPercentage = (
  value: number,
  sliderWidth: number,
  maxNumber: number = 16
): number => {
  const min = MIN_RAM
  const max = maxNumber
  return Math.fround(((value - min) / (max - min)) * sliderWidth)
}

export const refreshMicrosoftToken = async (
  token: string | null
): Promise<{
  msToken: string
  mcToken: string
} | null> => {
  if (!window?.electron?.ipcRenderer || !token) return null
  const { msToken, mcToken } = await window.electron.ipcRenderer.invoke('auth:refresh-token', token)

  return { msToken, mcToken }
}

export const defaultDatePickerTime: DatePickerPassThroughOptions = {
  root: ({ state, props }) => {
    if (!props.modelValue) {
      state.currentHour = 0
      state.currentMinute = 0
    }
  }
}

export const traverseFileTree = (
  entry: any,
  path = ''
): Promise<Array<{ path: string; file: File }>> => {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file: File) => resolve([{ path: path + file.name, file }]))
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader()
      const results: Array<{ path: string; file: File }> = []

      const readEntries = (): void => {
        dirReader.readEntries(async (entries: any[]) => {
          if (!entries.length) {
            resolve(results)
            return
          }

          const promises = entries.map((ent) => traverseFileTree(ent, path + entry.name + '/'))
          const nested = await Promise.all(promises)
          nested.forEach((arr) => results.push(...arr))
          readEntries()
        })
      }

      readEntries()
    } else {
      resolve([])
    }
  })
}

const HEAD_X = 8
const HEAD_Y = 8
const HEAD_WIDTH = 8
const HEAD_HEIGHT = 8

export function extractHead(skinUrl: string, size: number = 100): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onerror = () => {
      reject(new Error(`Nie udało się załadować skina z URL (HTTP Error/404): ${skinUrl}`))
    }

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        return reject(new Error('Błąd inicjalizacji Canvas context.'))
      }

      canvas.width = size
      canvas.height = size

      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, HEAD_X, HEAD_Y, HEAD_WIDTH, HEAD_HEIGHT, 0, 0, size, size)
      resolve(canvas.toDataURL('image/png'))
    }

    img.src = skinUrl
  })
}
