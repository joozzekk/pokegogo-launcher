/* eslint-disable @typescript-eslint/no-explicit-any */
import { LOGGER } from './services/logger-service'
import useGeneralStore from './stores/general-store'
import { DatePickerPassThroughOptions } from 'primevue'
import useUserStore from './stores/user-store'
import { checkMachineID } from './api/endpoints'
import { IUser } from './env'

import i18n from './i18n'

const apiURL = import.meta.env.RENDERER_VITE_API_URL

const TOAST_DURATION = 3000

export const checkUpdate = async (): Promise<void> => {
  const generalStore = useGeneralStore()

  LOGGER.with('Updater').log(i18n.global.t('toasts.updateCheck'))
  const res = await window.electron?.ipcRenderer?.invoke(
    'update:check',
    generalStore.settings.updateChannel,
    generalStore.settings.showNotifications
  )

  LOGGER.with('Updater').success(
    res ? i18n.global.t('toasts.updateAvailable') : i18n.global.t('toasts.updateUpToDate')
  )
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
        <div class="toast-icon">
          <i class="fas fa-${icon} text-lg"></i>
        </div>
        <div class="toast-body">
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close">
          <i class="fas fa-times"></i>
        </button>
    `

  const closeHandler = (): void => {
    toast.style.animation = 'slideOutRight 0.3s ease forwards'
    setTimeout(() => {
      toast.remove()
    }, 300)
  }

  toast.querySelector('.toast-close')?.addEventListener('click', closeHandler)
  toastContainer.appendChild(toast)

  setTimeout(() => {
    if (toast.parentElement) closeHandler()
  }, TOAST_DURATION)
}

// Progress toast: returns an updater and a closer
export const showProgressToast = (
  initialMessage: string,
  type: 'success' | 'info' | 'error' = 'info',
  onAbort?: () => void
): {
  update: (msg: string) => void
  updateProgress: (current: number, total: number, message?: string) => void
  close: (finalMessage?: string, finalType?: 'success' | 'error', duration?: number) => void
  setIndeterminate: (val: boolean) => void
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
    <div class="toast-icon">
      <i class="fas fa-${icon} text-lg"></i>
    </div>
    <div class="toast-body">
      <span class="toast-message">${initialMessage}</span>
    </div>
    ${
      onAbort
        ? `<button class="toast-abort">${i18n.global.t('general.abort')}</button>`
        : `<button class="toast-close"><i class="fas fa-times"></i></button>`
    }
    <div class="toast-progress" aria-hidden="true">
      <div class="toast-progress-fill" style="width: 0%"></div>
    </div>
  `

  const closeHandler = (): void => {
    toast.style.animation = 'slideOutRight 0.3s ease forwards'
    setTimeout(() => {
      toast.remove()
    }, 300)
  }

  toastContainer.appendChild(toast)

  if (onAbort) {
    toast.querySelector('.toast-abort')?.addEventListener('click', () => {
      onAbort()
    })
  } else {
    toast.querySelector('.toast-close')?.addEventListener('click', closeHandler)
  }

  const update = (msg: string): void => {
    const span = toast.querySelector('.toast-message')
    if (span) span.textContent = msg
  }

  const updateProgress = (current: number, total: number, message?: string): void => {
    const fill = toast.querySelector('.toast-progress-fill') as HTMLElement | null
    const span = toast.querySelector('.toast-message')
    if (!fill) return
    const rawPercent = total > 0 ? (current / total) * 100 : 0
    const rawClamped = Math.max(0, Math.min(100, rawPercent))

    let displayPercent = Math.round(rawClamped).toString()
    if (rawClamped % 1 !== 0) {
      displayPercent = rawClamped.toFixed(2)
      if (displayPercent.endsWith('.00')) displayPercent = Math.round(rawClamped).toString()
      else if (displayPercent.endsWith('0')) displayPercent = rawClamped.toFixed(1)
    }

    fill.style.width = `${rawClamped}%`
    if (span) span.textContent = `${message?.length ? message + ' ' : ''}${displayPercent}%`
  }

  const close = (
    finalMessage?: string,
    finalType?: 'success' | 'error',
    duration?: number
  ): void => {
    if (finalType) {
      toast.className = `toast ${finalType}`
    }

    if (finalMessage) {
      const span = toast.querySelector('.toast-message')
      if (span) span.textContent = finalMessage
      // Switch icon to check if success or exclamation if error
      const iconEl = toast.querySelector('.toast-icon i')
      if (iconEl) {
        iconEl.className =
          finalType === 'error'
            ? 'fas fa-exclamation-circle text-lg'
            : 'fas fa-check-circle text-lg'
      }
      // Remove abort button on close
      const abortBtn = toast.querySelector('.toast-abort')
      if (abortBtn) abortBtn.remove()
    }

    setTimeout(() => {
      if (toast.parentElement) closeHandler()
    }, duration ?? TOAST_DURATION)
  }

  const setIndeterminate = (val: boolean): void => {
    const progressEl = toast.querySelector('.toast-progress') as HTMLElement | null
    if (progressEl) {
      if (val) {
        progressEl.classList.add('indeterminate')
        const fill = progressEl.querySelector('.toast-progress-fill') as HTMLElement | null
        if (fill) fill.style.width = '100%'
      } else {
        progressEl.classList.remove('indeterminate')
      }
    }
  }

  return { update, updateProgress, close, setIndeterminate }
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
      reject(new Error(`${i18n.global.t('toasts.skinFetchError')} ${skinUrl}`))
    }

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        return reject(new Error(i18n.global.t('toasts.canvasInitError')))
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

export const isMachineIDBanned = async (): Promise<void> => {
  const userStore = useUserStore()
  const generalStore = useGeneralStore()

  const res = await checkMachineID(generalStore.settings.machineId)

  LOGGER.log(
    res ? i18n.global.t('toasts.machineIdBanned') : i18n.global.t('toasts.machineIdNotBanned')
  )

  userStore.hwidBanned = res
}

export const fallbackHeadUrl = (playerName: string): string =>
  `https://minotar.net/helm/${playerName}/100.png`

export const loadCustomOrFallbackHead = async (player: IUser): Promise<string> => {
  const customSkinSource = `${apiURL}/skins/image/${player.nickname}`

  try {
    const base64Head = await extractHead(customSkinSource, 100)
    return base64Head
  } catch {
    return fallbackHeadUrl(player.nickname)
  }
}

const headUrlCache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

export async function getHeadUrl(user: Pick<IUser, 'uuid' | 'nickname'>): Promise<string> {
  const key = user.nickname || user.uuid
  if (!key) return ''
  if (headUrlCache.has(key)) return headUrlCache.get(key)!

  if (inflight.has(key)) return inflight.get(key)!

  const p = loadCustomOrFallbackHead(user as IUser)
    .then((url) => {
      headUrlCache.set(key, url)
      inflight.delete(key)
      return url
    })
    .catch((err) => {
      inflight.delete(key)
      throw err
    })

  inflight.set(key, p)
  return p
}

export function invalidateHeadUrl(nicknameOrUuid?: string): void {
  if (!nicknameOrUuid) return
  headUrlCache.delete(nicknameOrUuid)
  inflight.delete(nicknameOrUuid)
}
