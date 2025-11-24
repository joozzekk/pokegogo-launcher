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
    <i class="fas fa-${icon} text-xl" style="color: ${type === 'success' ? 'var(--primary)' : type === 'error' ? '#ef4444' : 'var(--primary)'}"></i>
    <span class="toast-message">${initialMessage}</span>
  `

  toastContainer.appendChild(toast)

  const update = (msg: string): void => {
    const span = toast.querySelector('.toast-message')
    if (span) span.textContent = msg
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

  return { update, close }
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

export const refreshMicrosoftToken = async (token: string | null): Promise<void> => {
  if (!window?.electron?.ipcRenderer || !token) return
  const { msToken, mcToken } = await window.electron.ipcRenderer.invoke('auth:refresh-token', token)

  localStorage.setItem('msToken', msToken)
  localStorage.setItem('mcToken', mcToken)
}

export const defaultDatePickerTime: DatePickerPassThroughOptions = {
  root: ({ state, props }) => {
    if (!props.modelValue) {
      state.currentHour = 0
      state.currentMinute = 0
    }
  }
}
