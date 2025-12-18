<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import Header from '@renderer/components/Header.vue'
import Background from '@renderer/components/Background.vue'
import useUserStore from '@renderer/stores/user-store'
import { computed, reactive, watch } from 'vue'
import { IUser } from '@renderer/env'
import { extractHead, showToast } from '@renderer/utils'
import { LOGGER } from '@renderer/services/logger-service'
import { fetchLogin, fetchRegister, updateBackendUserFromMicrosoft } from '@renderer/api/endpoints'
import { useRouter } from 'vue-router'
import { useVuelidate } from '@vuelidate/core'
import { email, helpers, required } from '@vuelidate/validators'
import { Message } from 'primevue'
import { AxiosError } from 'axios'

const apiURL = import.meta.env.RENDERER_VITE_API_URL

const userStore = useUserStore()
const router = useRouter()

enum ActiveTab {
  LOGIN = 'login',
  REGISTER = 'register'
}

const appState = reactive({
  loading: false,
  loadingMessage: '',
  activeTab: ActiveTab.LOGIN as ActiveTab
})

const formState = reactive({
  nick: '',
  email: '',
  password: '',
  repeatPassword: ''
})

const loginRules = computed(() => {
  return {
    nick: {
      required: helpers.withMessage('Pole jest wymagane', required)
    },
    password: {
      required: helpers.withMessage('Pole jest wymagane', required),
      ...(appState.activeTab === ActiveTab.REGISTER
        ? {
            sameAs: helpers.withMessage(
              'Pola nie są takie same.',
              (value) => value === formState.repeatPassword
            )
          }
        : {})
    },
    ...(appState.activeTab === ActiveTab.REGISTER
      ? {
          email: {
            required: helpers.withMessage('Pole jest wymagane', required),
            email: helpers.withMessage('Pole nie jest prawidłowym emailem.', email)
          },
          repeatPassword: {
            required: helpers.withMessage('Pole jest wymagane', required),
            sameAs: helpers.withMessage(
              'Pola nie są takie same.',
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
  const index = userStore.prevAccounts.findIndex((user) => user.nickname === playerName)

  try {
    const base64Head = await extractHead(customSkinSource, 100)
    userStore.prevAccounts[index].url = base64Head
  } catch (error) {
    LOGGER.err(
      'Błąd cięcia/ładowania skina z API. Używam fallbacku Minotar.',
      (error as Error)?.message
    )

    userStore.prevAccounts[index].url = fallbackHeadUrl(playerName)
  }
}

watch(
  userStore.prevAccounts,
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
    localStorage.setItem('LOGIN_TYPE', 'backend')

    const prevAccounts = JSON.parse(localStorage.getItem('prevAccounts') ?? '[]')

    if (
      !prevAccounts.find(
        (savedAccount: any) =>
          savedAccount.nickname === formState.nick && savedAccount.accountType === 'backend'
      )
    )
      localStorage.setItem(
        'prevAccounts',
        JSON.stringify([
          ...prevAccounts,
          {
            nickname: formState.nick,
            password: formState.password,
            accountType: 'backend'
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
      localStorage.setItem('LOGIN_TYPE', 'backend')

      const prevAccounts = JSON.parse(localStorage.getItem('prevAccounts') ?? '[]')

      if (
        !prevAccounts.find(
          (savedAccount: any) =>
            savedAccount.nickname === formState.email && savedAccount.accountType === 'backend'
        )
      )
        localStorage.setItem(
          'prevAccounts',
          JSON.stringify([
            ...prevAccounts,
            {
              nickname: formState.nick,
              password: formState.password,
              accountType: 'backend'
            }
          ])
        )

      router.push({
        path: '/app/home'
      })
    }
  } catch (err) {
    const error = err as AxiosError<{ message: string }>

    showToast(error.response?.data?.message ?? 'Wystąpił błąd podczas rejestracji.', 'error')
    appState.loading = false
    appState.loadingMessage = ''
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
    localStorage.setItem('LOGIN_TYPE', 'microsoft')

    const prevAccounts = JSON.parse(localStorage.getItem('prevAccounts') ?? '[]')

    if (
      !prevAccounts.find(
        (savedAccount: any) =>
          savedAccount.nickname === user.nickname && savedAccount.accountType === 'microsoft'
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

      if (savedAccount.accountType === 'backend') {
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
    showToast(error.response?.data?.message ?? 'Wystąpił błąd podczas logowania.', 'error')
    appState.loading = false
    appState.loadingMessage = ''
  }
}

const removeSavedAccount = (user: Partial<IUser & { url: string }>): void => {
  userStore.removeSavedAccount(user.nickname!)
}
</script>

<template>
  <Header />
  <Background />

  <footer class="absolute z-200 bottom-2 w-full text-center">
    <div class="text-[10px] text-[var(--text-muted)] text-center">
      <p>&copy; 2024-2025 Pokemongogo.pl. Wszystkie prawa zastrzeżone.</p>
    </div>
  </footer>

  <div
    class="border-[var(--primary)]/20 border w-1/3 mx-auto my-10 p-10 rounded-xl h-[calc(100vh-130px)] backdrop-blur-md overflow-hidden"
  >
    <template v-if="appState.activeTab === ActiveTab.LOGIN">
      <h1 class="text-2xl w-full text-center mb-2">Logowanie do PokemonGoGo</h1>
      <p class="text-center mb-4">
        Zaloguj się do launchera korzystając z jednego z dostępnych sposobów.
      </p>

      <div class="flex gap-2">
        <div
          v-for="savedAccount in userStore.prevAccounts"
          :key="savedAccount.nickname"
          class="relative px-4 py-2 flex items-center flex-col gap-1 border border-[var(--primary)]/20 rounded-md backdrop-blur-2xl w-1/3 hover:bg-[var(--primary-shop)] hover:text-white hover:cursor-pointer"
          @click="handleLogin(savedAccount)"
        >
          <button
            class="absolute top-2 right-2 hover:cursor-pointer"
            @click.stop="removeSavedAccount(savedAccount)"
          >
            <i class="fa fa-trash" />
          </button>
          <img
            v-if="savedAccount.url"
            :src="savedAccount.url"
            class="rounded-full w-8 h-8"
            @dragstart.prevent="null"
          />
          <div
            v-else
            class="rounded-full border-[var(--border)] border-2 w-8 h-8 flex items-center justify-center"
          >
            <i class="fa fa-user" />
          </div>
          <p class="text-[10px] text-[var(--text-muted)]">
            {{ savedAccount.nickname }}
          </p>
        </div>
      </div>

      <div v-if="userStore.prevAccounts.length" class="flex relative w-full">
        <hr class="my-4 w-full border-[var(--primary)]" />
        <span class="mt-[7px] mx-2">lub</span>
        <hr class="my-4 w-full border-[var(--primary)]" />
      </div>

      <div class="flex relative flex-col w-full">
        <div class="form-group h-full" :class="{ '!mb-5': login$.nick.$error }">
          <div class="input-wrapper flex">
            <input
              v-model="formState.nick"
              type="text"
              placeholder="Podaj nick.."
              class="form-input !pl-[1rem] group"
              :class="{ invalid: login$.nick.$error }"
            />
          </div>
          <div class="error-message" :class="{ show: login$.nick.$error }">
            {{ login$.nick.$errors[0]?.$message }}
          </div>
        </div>

        <div class="form-group h-full" :class="{ '!mb-5': login$.password.$error }">
          <div class="input-wrapper flex">
            <input
              v-model="formState.password"
              type="password"
              placeholder="Podaj hasło.."
              class="form-input !pl-[1rem] group"
              :class="{ invalid: login$.password.$error }"
            />
          </div>
          <div class="error-message" :class="{ show: login$.password.$error }">
            {{ login$.password.$errors[0]?.$message }}
          </div>
        </div>

        <button class="btn-primary mt-2" @click="handleLogin(null)">Zaloguj się</button>
      </div>

      <div class="flex relative w-full">
        <hr class="my-4 w-full border-[var(--primary)]" />
        <span class="mt-[7px] mx-2">lub</span>
        <hr class="my-4 w-full border-[var(--primary)]" />
      </div>

      <button class="btn-microsoft" @click="handleLogin({ accountType: 'microsoft' })">
        <i class="fab fa-microsoft"></i>
        <span>Zaloguj przez Microsoft</span>
      </button>

      <p class="text-xs text-center">
        Nie masz konta?
        <span
          class="text-[var(--primary)] hover:cursor-pointer hover:underline"
          @click="appState.activeTab = ActiveTab.REGISTER"
          >Zarejestruj się</span
        >
      </p>
    </template>
    <template v-else>
      <h1 class="text-2xl w-full text-center mb-2">Rejestracja PokemonGoGo</h1>
      <p class="text-center mb-4">
        Załóż konto, aby móc korzystać z aplikacji i wejść na serwer PokemonGoGo.pl
      </p>

      <Message
        severity="info"
        class="!bg-blue-400/20 !text-blue-500 !outline !outline-blue-700 !mb-4"
      >
        <span class="text-[10px]">
          Pamiętaj, że rejestrować się powinny tylko konta non-premium. Gdy masz konto premium,
          zaloguj się przez Microsoft.
        </span>
      </Message>

      <div class="flex relative flex-col w-full">
        <div class="form-group h-full" :class="{ '!mb-5': login$.nick.$error }">
          <div class="input-wrapper flex">
            <input
              v-model="formState.nick"
              type="text"
              placeholder="Podaj nick.."
              class="form-input !pl-[1rem] group"
              :class="{ invalid: login$.nick.$error }"
            />
          </div>
          <div class="error-message" :class="{ show: login$.nick.$error }">
            {{ login$.nick.$errors[0]?.$message }}
          </div>
        </div>

        <div class="form-group h-full" :class="{ '!mb-5': login$.email?.$error }">
          <div class="input-wrapper flex">
            <input
              v-model="formState.email"
              type="text"
              placeholder="Podaj email.."
              class="form-input !pl-[1rem] group"
              :class="{ invalid: login$.email?.$error }"
            />
          </div>
          <div class="error-message" :class="{ show: login$.email?.$error }">
            {{ login$.email?.$errors[0]?.$message }}
          </div>
        </div>

        <div class="form-group h-full" :class="{ '!mb-5': login$.password.$error }">
          <div class="input-wrapper flex">
            <input
              v-model="formState.password"
              type="password"
              placeholder="Podaj hasło.."
              class="form-input !pl-[1rem] group"
              :class="{ invalid: login$.password.$error }"
            />
          </div>
          <div class="error-message" :class="{ show: login$.password.$error }">
            {{ login$.password.$errors[0]?.$message }}
          </div>
        </div>

        <div class="form-group h-full" :class="{ '!mb-5': login$.repeatPassword?.$error }">
          <div class="input-wrapper flex">
            <input
              v-model="formState.repeatPassword"
              type="password"
              placeholder="Potwórz hasło.."
              class="form-input !pl-[1rem] group"
              :class="{ invalid: login$.repeatPassword?.$error }"
            />
          </div>
          <div class="error-message" :class="{ show: login$.repeatPassword?.$error }">
            {{ login$.repeatPassword?.$errors[0]?.$message }}
          </div>
        </div>

        <button class="btn-primary my-2" @click="handleRegister">Zarejestruj się</button>

        <p class="text-xs text-center">
          Masz już konto?
          <span
            class="text-[var(--primary)] hover:cursor-pointer hover:underline"
            @click="appState.activeTab = ActiveTab.LOGIN"
            >Zaloguj się</span
          >
        </p>
      </div>
    </template>
  </div>

  <div id="toastContainer" class="toast-container"></div>
  <div v-if="appState.loading" class="loading-overlay">
    <div class="loading-content">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <div class="loading-text">
        <span id="loading-message">{{ appState.loadingMessage ?? 'Ładowanie..' }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="css">
@import '@renderer/assets/login.css';
</style>
