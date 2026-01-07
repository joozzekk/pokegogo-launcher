/* eslint-disable @typescript-eslint/no-explicit-any */
import { IUser } from '@ui/env'
import { AccountType, ActiveTab, type SavedAccount } from '@ui/types/app'
import { LOGGER } from './logger-service'
import { extractHead, showToast } from '@ui/utils'
import { fetchLogin, fetchRegister, updateBackendUserFromMicrosoft } from '@ui/api/endpoints'
import { computed, reactive, watch, type ComputedRef } from 'vue'
import { email, helpers, maxLength, minLength, required } from '@vuelidate/validators'
import useVuelidate from '@vuelidate/core'
import useUserStore from '@ui/stores/user-store'
import { useRouter } from 'vue-router'

export const useLoginService = (): {
  useVariables: () => {
    apiURL: string
    formState: {
      nick: string
      email: string
      password: string
      repeatPassword: string
      passwordType: string
      repeatPasswordType: string
    }
    appState: {
      loading: boolean
      loadingMessage: string
      activeTab: ActiveTab
    }
    login$: any
    savedAccounts: ComputedRef<SavedAccount[]>
  }
  useMethods: () => {
    handleLogin: (account: SavedAccount | null) => void
    handleChangeTab: (tab: ActiveTab) => void
    removeSavedAccount: (account: SavedAccount) => void
    handleRegister: () => void
  }
} => {
  const apiURL = import.meta.env.RENDERER_VITE_API_URL

  const userStore = useUserStore()
  const router = useRouter()

  const appState = reactive({
    loading: false,
    loadingMessage: '',
    activeTab: ActiveTab.LOGIN
  })

  const formState = reactive({
    nick: '',
    email: '',
    password: '',
    repeatPassword: '',
    passwordType: 'password',
    repeatPasswordType: 'password'
  })

  const loginRules = computed(() => {
    return {
      nick: {
        required: helpers.withMessage('Nick jest wymagany', required),
        maxLength: helpers.withMessage('Nick może zawierać maksymalnie 16 znaków', maxLength(16)),
        alphaNum: helpers.withMessage(
          'Pole może zawierać tylko litery i cyfry, oraz znaki podkreślenia',
          (value: string) => /^[a-zA-Z0-9_]+$/.test(value)
        )
      },
      password: {
        required: helpers.withMessage('Hasło jest wymagane', required),
        minLength: helpers.withMessage('Hasło musi zawierać co najmniej 4 znaki', minLength(4)),
        maxLength: helpers.withMessage('Hasło może zawierać maksymalnie 32 znaki', maxLength(32)),
        ...(appState.activeTab === ActiveTab.REGISTER
          ? {
              sameAs: helpers.withMessage(
                'Hasła nie są takie same.',
                (value) => value === formState.repeatPassword
              )
            }
          : {})
      },
      ...(appState.activeTab === ActiveTab.REGISTER
        ? {
            email: {
              required: helpers.withMessage('Email jest wymagany', required),
              email: helpers.withMessage('Pole nie jest zawiera prawidłowego adresu email.', email)
            },
            repeatPassword: {
              required: helpers.withMessage('Hasło jest wymagane', required),
              minLength: helpers.withMessage(
                'Hasło musi zawierać co najmniej 4 znaki',
                minLength(4)
              ),
              maxLength: helpers.withMessage(
                'Hasło może zawierać maksymalnie 32 znaki',
                maxLength(32)
              ),
              sameAs: helpers.withMessage(
                'Hasła nie są takie same.',
                (value) => value === formState.password
              )
            }
          }
        : {})
    }
  })

  const login$ = useVuelidate(loginRules, formState)

  const fallbackHeadUrl = (playerName: string): string =>
    `https://mineskin.eu/helm/${playerName}/100.png`

  async function loadCustomOrFallbackHead(playerName: string): Promise<void> {
    const customSkinSource = `${apiURL}/skins/image/${playerName}`
    const index = userStore.savedAccounts.findIndex((user) => user.nickname === playerName)

    try {
      const base64Head = await extractHead(customSkinSource, 100)
      userStore.savedAccounts[index].url = base64Head
    } catch (error) {
      LOGGER.err(
        'Błąd cięcia/ładowania skina z API. Używam fallbacku Minotar.',
        (error as Error)?.message
      )

      userStore.savedAccounts[index].url = fallbackHeadUrl(playerName)
    }
  }

  const savedAccounts = computed(() => userStore.savedAccounts)

  watch(
    () => userStore.savedAccounts,
    (newValue) => {
      newValue.forEach((user) => {
        loadCustomOrFallbackHead(user.nickname!)
      })
    },
    {
      immediate: true
    }
  )

  const handleBackendLogin = async (): Promise<void> => {
    const { access_token, refresh_token } = await fetchLogin(formState.nick, formState.password)

    if (access_token && refresh_token) {
      localStorage.setItem('token', access_token)
      localStorage.setItem('refresh_token', refresh_token)

      const savedAccounts = JSON.parse(localStorage.getItem('savedAccounts') ?? '[]')

      if (
        !savedAccounts.find(
          (savedAccount: any) =>
            savedAccount.nickname === formState.nick &&
            savedAccount.accountType === AccountType.BACKEND
        )
      )
        localStorage.setItem(
          'savedAccounts',
          JSON.stringify([
            ...savedAccounts,
            {
              nickname: formState.nick,
              password: formState.password,
              accountType: AccountType.BACKEND
            }
          ])
        )

      router.push({
        path: '/app/home'
      })
    }
  }

  const handleRegister = async (): Promise<void> => {
    try {
      const isValid = await login$.value.$validate()
      if (!isValid) return

      const { access_token, refresh_token } = await fetchRegister(
        formState.nick,
        formState.email,
        formState.password
      )

      if (access_token && refresh_token) {
        localStorage.setItem('token', access_token)
        localStorage.setItem('refresh_token', refresh_token)

        const savedAccounts = JSON.parse(localStorage.getItem('savedAccounts') ?? '[]')

        if (
          !savedAccounts.find(
            (savedAccount: any) =>
              savedAccount.nickname === formState.email &&
              savedAccount.accountType === AccountType.BACKEND
          )
        )
          localStorage.setItem(
            'savedAccounts',
            JSON.stringify([
              ...savedAccounts,
              {
                nickname: formState.nick,
                password: formState.password,
                accountType: AccountType.BACKEND
              }
            ])
          )

        router.push({
          path: '/app/home'
        })
      }
    } catch (error: any) {
      LOGGER.err('Błąd podczas ręcznego logowania', error)
      showToast(
        error.response?.data?.message ?? error.message ?? 'Wystąpił błąd podczas logowania.',
        'error'
      )
    }
  }

  const handleMicrosoftLogin = async (accountName?: string): Promise<void> => {
    try {
      let loginData: { msToken: string; mcToken: string } | null = null

      if (accountName?.length) {
        const storedMsToken = localStorage.getItem(`msToken:${accountName?.toLowerCase()}`)

        if (storedMsToken) {
          try {
            LOGGER.log('Próba cichego logowania (Refresh Token)...')
            loginData = await window.electron?.ipcRenderer?.invoke(
              'auth:refresh-token',
              storedMsToken
            )
          } catch {
            LOGGER.err(
              'Ciche logowanie nieudane, token mógł wygasnąć. Przełączanie na zwykłe logowanie.'
            )
          }
        }
      }

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

      localStorage.setItem(`msToken:${user.nickname?.toLowerCase()}`, msToken)
      localStorage.setItem('mcToken', mcToken)
      localStorage.setItem('token', access_token)
      localStorage.setItem('refresh_token', refresh_token)

      const savedAccounts = JSON.parse(localStorage.getItem('savedAccounts') ?? '[]')

      if (
        !savedAccounts.find(
          (savedAccount: any) =>
            savedAccount.nickname === user.nickname && savedAccount.accountType === 'microsoft'
        )
      )
        localStorage.setItem(
          'savedAccounts',
          JSON.stringify([
            ...savedAccounts,
            {
              nickname: user.nickname,
              accountType: 'microsoft'
            }
          ])
        )

      router.push({
        path: '/app/home'
      })
    } catch (error: any) {
      showToast(error.message ?? 'Wystąpił błąd podczas logowania przez Microsoft.', 'error')
      appState.loading = false
      appState.loadingMessage = ''
    }
  }

  const handleLogin = async (
    savedAccount: Partial<IUser & { url: string; password: string }> | null = {} // Dajemy domyślną wartość
  ): Promise<void> => {
    try {
      if (savedAccount?.nickname) {
        formState.nick = savedAccount.nickname
        if (savedAccount.password) formState.password = savedAccount.password

        if (savedAccount.accountType === 'microsoft') {
          appState.loading = true
          appState.loadingMessage = 'Logowanie przez Microsoft...'
          await handleMicrosoftLogin(savedAccount.nickname)
          return
        }

        if (savedAccount.accountType === AccountType.BACKEND) {
          appState.loading = true
          appState.loadingMessage = `Logowanie do ${savedAccount.nickname}..`
          await handleBackendLogin()
          return
        }
      }

      if (savedAccount?.accountType === 'microsoft') {
        appState.loading = true
        appState.loadingMessage = 'Logowanie przez Microsoft...'
        await handleMicrosoftLogin(savedAccount.nickname)
        return
      }

      const isValid = await login$.value.$validate()

      if (!isValid) {
        console.warn('Walidacja nieudana. Błędy:', login$.value.$errors)
        return
      }

      appState.loading = true
      appState.loadingMessage = `Logowanie..`

      await handleBackendLogin()
    } catch (error: any) {
      LOGGER.err('Błąd podczas ręcznego logowania', error)
      showToast(
        error.response?.data?.message ?? error.message ?? 'Wystąpił błąd podczas logowania.',
        'error'
      )
      appState.loading = false
      appState.loadingMessage = ''
    }
  }

  const handleChangeTab = (tab: ActiveTab): void => {
    appState.activeTab = tab
    formState.nick = ''
    formState.email = ''
    formState.password = ''
    formState.repeatPassword = ''
    login$.value.$reset()
  }

  const removeSavedAccount = (user: SavedAccount): void => {
    userStore.removeSavedAccount(user)
  }

  return {
    useVariables: () => ({
      apiURL,
      formState,
      login$,
      savedAccounts,
      appState
    }),
    useMethods: () => ({
      handleLogin,
      handleChangeTab,
      removeSavedAccount,
      handleRegister
    })
  }
}
