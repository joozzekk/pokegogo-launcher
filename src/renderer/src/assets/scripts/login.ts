/* eslint-disable */
// @ts-nocheck
import { fetchLogin, fetchRegister, updateBackendUserFromMicrosoft } from '@renderer/api/endpoints'
import { router } from '@renderer/router'
import { LOGGER } from '@renderer/services/logger-service'
import useUserStore from '@renderer/stores/user-store'
import { AxiosError } from 'axios'

const CONFIG = {
  minNickLength: 3,
  maxNickLength: 16,
  minPasswordLength: 6,
  nickPattern: /^[a-zA-Z0-9_]+$/,
  emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  validationDelay: 300,
  toastDuration: 4000
}

class AppState {
  currentTab: string
  validationTimers: Map<string, number | typeof setTimeout>
  toastCount: number

  constructor() {
    this.currentTab = 'login'
    this.validationTimers = new Map()
    this.toastCount = 0
  }

  setCurrentTab(tab): void {
    this.currentTab = tab
    const tabNav = document.querySelector('.tab-nav')
    if (tabNav) {
      tabNav.setAttribute('data-active', tab)
    }
  }
}

export class PokeGoGoLogin {
  state: AppState

  constructor() {
    this.state = new AppState()
    this.init()
  }

  init(): void {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup())
    } else {
      this.setup()
    }
  }

  setup(): void {
    this.setupEventListeners()
    this.initializePasswordToggles()
    this.initializeFormValidation()
    this.setupTabSwitching()
    this.initializeAnimations()
  }

  setupEventListeners(): void {
    const loginForm = document.getElementById('loginForm')
    const registerForm = document.getElementById('registerForm')

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e))
    }
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e))
    }

    const microsoftBtn = document.getElementById('microsoft-login')
    if (microsoftBtn) {
      microsoftBtn.addEventListener('click', () => this.handleMicrosoftLogin())
    }

    document.querySelectorAll('.switch-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const targetTab =
          e.target && 'dataset' in e.target ? (e.target as HTMLElement).dataset.tab : undefined
        if (targetTab) {
          this.switchTab(targetTab)
        }
      })
    })

    document.addEventListener('click', (e) => {
      if (e.target.matches('.toast-close') || e.target.closest('.toast-close')) {
        this.closeToast(e.target.closest('.toast'))
      }
    })

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') {
          e.preventDefault()
          this.switchTab('login')
        }
        if (e.key === '2') {
          e.preventDefault()
          this.switchTab('register')
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeForm = document.querySelector('.form-container.active form')
        if (activeForm) {
          e.preventDefault()
          activeForm.requestSubmit()
        }
      }
    })
  }

  setupTabSwitching(): void {
    const tabButtons = document.querySelectorAll('.tab-btn')

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab
        this.switchTab(targetTab)
      })
    })

    this.switchTab('login')
  }

  switchTab(tabName): void {
    if (this.state.currentTab === tabName) return

    this.state.setCurrentTab(tabName)

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName)
    })

    document.querySelectorAll('.form-container').forEach((container) => {
      const isTarget = container.id === `${tabName}-form`
      container.classList.toggle('active', isTarget)
    })

    this.clearAllErrors()
  }

  initializePasswordToggles(): void {
    const toggleButtons = document.querySelectorAll('.password-toggle')

    toggleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const input = button.parentElement?.querySelector('.form-input')
        const icon = button.querySelector('i')

        if (input && icon) {
          if (input.type === 'password') {
            input.type = 'text'
            icon.className = 'far fa-eye-slash'
          } else {
            input.type = 'password'
            icon.className = 'far fa-eye'
          }
        }
      })
    })
  }

  initializeFormValidation(): void {
    const fields = [
      { id: 'register-nick', validator: 'validateNick' },
      { id: 'register-email', validator: 'validateEmail' },
      { id: 'register-password', validator: 'validatePassword' },
      { id: 'register-confirm', validator: 'validateConfirmPassword' }
    ]

    fields.forEach((field) => {
      const input = document.getElementById(field.id)
      if (!input) return

      input.addEventListener('input', () => {
        this.debounceValidation(field.id, () => {
          this[field.validator](field.id)
        })
      })

      input.addEventListener('blur', () => {
        this[field.validator](field.id)
      })
    })
  }

  debounceValidation(fieldId, callback): void {
    if (this.state.validationTimers.has(fieldId)) {
      clearTimeout(this.state.validationTimers.get(fieldId) as number)
    }
    const timer: typeof setTimeout = setTimeout(callback, CONFIG.validationDelay)
    this.state.validationTimers.set(fieldId, timer)
  }

  validateNick(fieldId): boolean {
    const input = document.getElementById(fieldId) as HTMLInputElement
    const value = input?.value.trim()
    const errorElement = document.getElementById(`${fieldId}-error`)

    if (!value) {
      this.showError(errorElement, 'Nick jest wymagany')
      return false
    }
    if (value.length < CONFIG.minNickLength) {
      this.showError(errorElement, `Nick musi mieć minimum ${CONFIG.minNickLength} znaki`)
      return false
    }
    if (value.length > CONFIG.maxNickLength) {
      this.showError(errorElement, `Nick może mieć maksymalnie ${CONFIG.maxNickLength} znaków`)
      return false
    }
    if (!CONFIG.nickPattern.test(value)) {
      this.showError(errorElement, 'Nick może zawierać tylko litery, cyfry i podkreślniki')
      return false
    }
    this.hideError(errorElement)
    return true
  }

  validateEmail(fieldId): boolean {
    const input = document.getElementById(fieldId) as HTMLInputElement
    const value = input?.value.trim()
    const errorElement = document.getElementById(`${fieldId}-error`)

    if (!value) {
      this.showError(errorElement, 'Email jest wymagany')
      return false
    }
    if (!CONFIG.emailPattern.test(value)) {
      this.showError(errorElement, 'Wprowadź poprawny adres email')
      return false
    }
    this.hideError(errorElement)
    return true
  }

  validatePassword(fieldId): boolean {
    const input = document.getElementById(fieldId) as HTMLInputElement
    const value = input?.value
    const errorElement = document.getElementById(`${fieldId}-error`)

    if (!value) {
      this.showError(errorElement, 'Hasło jest wymagane')
      return false
    }
    if (value.length < CONFIG.minPasswordLength) {
      this.showError(errorElement, `Hasło musi mieć minimum ${CONFIG.minPasswordLength} znaków`)
      return false
    }
    this.hideError(errorElement)
    return true
  }

  validateConfirmPassword(fieldId): boolean {
    const input = document.getElementById(fieldId) as HTMLInputElement
    const passwordInput = document.getElementById('register-password') as HTMLInputElement
    const value = input?.value
    const errorElement = document.getElementById(`${fieldId}-error`)

    if (!value) {
      this.showError(errorElement, 'Potwierdź hasło')
      return false
    }
    if (value !== passwordInput?.value) {
      this.showError(errorElement, 'Hasła nie są identyczne')
      return false
    }
    this.hideError(errorElement)
    return true
  }

  async handleLogin(event): Promise<void> {
    event.preventDefault()

    const formData = {
      email: document.getElementById('login-email')?.value.trim(),
      password: document.getElementById('login-password')?.value
    }

    if (!this.validateLoginForm(formData)) return

    try {
      this.showLoading('Logowanie do serwera...')
      const { access_token, refresh_token } = await fetchLogin(formData.email, formData.password)

      if (access_token && refresh_token) {
        localStorage.setItem('token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        localStorage.setItem('LOGIN_TYPE', 'backend')

        if (document.getElementById('remember-checkbox')?.checked) {
          const prevAccounts = JSON.parse(localStorage.getItem('prevAccounts') ?? '[]')

          if (
            !prevAccounts.find(
              (account) => account.nickname === formData.email && account.accountType === 'backend'
            )
          )
            localStorage.setItem(
              'prevAccounts',
              JSON.stringify([
                ...prevAccounts,
                {
                  nickname: formData.email,
                  password: formData.password,
                  accountType: 'backend'
                }
              ])
            )
        }

        router.push({
          path: '/app/home'
        })
      }

      this.showToast('Zalogowano pomyślnie!', 'success')
    } catch (error) {
      this.showToast(error?.response?.data?.message ?? error.message, 'error')
      this.showError(document.getElementById('login-email-error'), 'Sprawdź swoje dane')
    } finally {
      this.hideLoading()
    }
  }

  async handleRegister(event): Promise<void> {
    event.preventDefault()

    const formData = {
      nick: document.getElementById('register-nick')?.value.trim(),
      email: document.getElementById('register-email')?.value.trim(),
      password: document.getElementById('register-password')?.value,
      confirmPassword: document.getElementById('register-confirm')?.value,
      termsAccepted: document.getElementById('terms-checkbox')?.checked
    }

    if (!this.validateRegisterForm(formData)) return

    try {
      this.showLoading('Tworzenie konta gracza...')

      const { access_token, refresh_token } = await fetchRegister(
        formData.nick,
        formData.email,
        formData.password
      )

      if (access_token && refresh_token) {
        localStorage.setItem('token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        localStorage.setItem('LOGIN_TYPE', 'backend')

        const prevAccounts = JSON.parse(localStorage.getItem('prevAccounts') ?? '[]')

        if (
          !prevAccounts.find(
            (account) => account.nickname === formData.email && account.accountType === 'backend'
          )
        )
          localStorage.setItem(
            'prevAccounts',
            JSON.stringify([
              ...prevAccounts,
              {
                nickname: formData.email,
                password: formData.password,
                accountType: 'backend'
              }
            ])
          )

        router.push({
          path: '/app/home'
        })
      }
    } catch (error: Error) {
      LOGGER.err(error)

      if (error.message.includes('zajęty')) {
        this.showError(document.getElementById('register-nick-error'), error.message)
      }
      this.showToast(error?.response?.data?.message ?? error.message, 'error')
    } finally {
      this.hideLoading()
    }
  }

  validateLoginForm(data): boolean {
    let isValid = true
    if (!data.email) {
      this.showError(document.getElementById('login-email-error'), 'Email lub nick jest wymagany')
      isValid = false
    }
    if (!data.password) {
      this.showError(document.getElementById('login-password-error'), 'Hasło jest wymagane')
      isValid = false
    }
    return isValid
  }

  validateRegisterForm(data): boolean {
    let isValid = true
    if (!this.validateNick('register-nick')) isValid = false
    if (!this.validateEmail('register-email')) isValid = false
    if (!this.validatePassword('register-password')) isValid = false
    if (!this.validateConfirmPassword('register-confirm')) isValid = false

    if (!data.termsAccepted) {
      this.showToast('Musisz zaakceptować regulamin', 'warning')
      isValid = false
    }
    return isValid
  }

  async handleMicrosoftLogin(nickname?: string): Promise<void> {
    this.showLoading('Logowanie do Microsoft...')

    try {
      let loginData: { msToken: string; mcToken: string } | null = null

      const storedMsToken = localStorage.getItem(`msToken:${nickname}`)

      if (storedMsToken) {
        try {
          LOGGER.log('Próba cichego logowania (Refresh Token)...')
          loginData = await window.electron?.ipcRenderer?.invoke(
            'auth:refresh-token',
            storedMsToken
          )
        } catch (e) {
          LOGGER.err(
            'Ciche logowanie nieudane, token mógł wygasnąć. Przełączanie na zwykłe logowanie.'
          )
        }
      }

      // 3. Jeśli nie udało się odświeżyć (lub nie było tokena), otwieramy okno
      if (!loginData) {
        LOGGER.log('Otwieranie okna logowania Microsoft...')
        loginData = await window.electron?.ipcRenderer?.invoke('auth:login')
      }

      if (!loginData) throw new Error('Błąd pobierania danych logowania')

      const { msToken, mcToken } = loginData
      const data = JSON.parse(mcToken)
      const profile = data?.profile

      const user = await updateBackendUserFromMicrosoft({
        nickname: profile?.name,
        mcid: profile?.id
      })

      const { access_token, refresh_token } = await fetchLogin(user.nickname, user.uuid, true)

      localStorage.setItem(`msToken:${user.nickname}`, msToken)
      localStorage.setItem('mcToken', mcToken)
      localStorage.setItem('token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('LOGIN_TYPE', 'microsoft')

      const prevAccounts = JSON.parse(localStorage.getItem('prevAccounts') ?? '[]')

      if (
        !prevAccounts.find(
          (account) => account.nickname === user.nickname && account.accountType === 'microsoft'
        )
      )
        localStorage.setItem(
          'prevAccounts',
          JSON.stringify([
            ...prevAccounts,
            {
              nickname: user.nickname,
              accountType: 'microsoft'
            }
          ])
        )

      router.push({
        path: '/app/home'
      })
    } catch (_error) {
      console.error(_error)
      this.showToast('Błąd podczas logowania Microsoft: ' + _error.toString(), 'error')
    } finally {
      this.hideLoading()
    }
  }

  showError(errorElement, message): void {
    if (errorElement) {
      errorElement.textContent = message
      errorElement.classList.add('show')
    }
  }

  hideError(errorElement): void {
    if (errorElement) {
      errorElement.classList.remove('show')
    }
  }

  clearAllErrors(): void {
    document.querySelectorAll('.error-message').forEach((el) => {
      el.classList.remove('show')
    })
  }

  showToast(message, type = 'success', duration = CONFIG.toastDuration): void {
    const container = document.getElementById('toast-container')
    if (!container) return

    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle'
    }

    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    toast.innerHTML = `
            <i class="toast-icon ${icons[type]}"></i>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `

    container.appendChild(toast)

    setTimeout(() => {
      this.closeToast(toast)
    }, duration)
  }

  closeToast(toast): void {
    if (!toast) return

    toast.style.animation = 'toastSlideOut 0.3s ease-in forwards'
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove()
      }
    }, 300)
  }

  showLoading(message = 'Ładowanie...'): void {
    const overlay = document.getElementById('loading-overlay')
    const messageEl = document.getElementById('loading-message')

    if (messageEl) messageEl.textContent = message
    if (overlay) overlay.classList.add('show')
  }

  hideLoading(): void {
    const overlay = document.getElementById('loading-overlay')
    if (overlay) overlay.classList.remove('show')
  }

  initializeAnimations(): void {
    const animatedElements = [
      { selector: '.header', delay: 0 },
      { selector: '.auth-card', delay: 200 }
    ]

    animatedElements.forEach(({ selector, delay }) => {
      const element = document.querySelector(selector)
      if (element) {
        setTimeout(() => {
          element.style.opacity = '0'
          element.style.transform = 'translateY(30px)'
          element.style.animation = `fadeInUp 0.8s ease-out forwards`
        }, delay)
      }
    })
  }

  async simulateApiCall(duration: number = 1500): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, duration)
    })
  }

  simulateRedirect(): void {
    setTimeout(() => {
      router.push({
        path: '/app/home'
      })
    }, 2000)
  }
}
