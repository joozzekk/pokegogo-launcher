<script lang="ts" setup>
import Header from '@renderer/components/Header.vue'
import { onMounted, ref, watch } from 'vue'
import { PokeGoGoLogin } from '@renderer/assets/scripts/login'
import dynia from '@renderer/assets/img/dynia.png'
import ghost from '@renderer/assets/img/ghost.png'
import choinka from '@renderer/assets/img/choinka.png'
import useUserStore from '@renderer/stores/user-store'
import { LOGGER } from '@renderer/services/logger-service'
import { IUser } from '@renderer/env'
import { extractHead } from '@renderer/utils'

const pokeLogin = ref<PokeGoGoLogin | null>(null)
const userStore = useUserStore()

const activeTab = ref<'login' | 'register'>('login')
const apiURL = import.meta.env.RENDERER_VITE_API_URL

const skinHeadUrls = ref<Partial<IUser & { url: string }>[]>(
  userStore.prevAccounts.map((user) => ({
    nickname: user.nickname,
    password: user.password,
    type: user.accountType,
    url: ''
  }))
)

const fallbackHeadUrl = (playerName: string): string =>
  `https://mineskin.eu/helm/${playerName}/100.png`

async function loadCustomOrFallbackHead(playerName: string): Promise<void> {
  const customSkinSource = `${apiURL}/skins/image/${playerName}`
  const index = skinHeadUrls.value.findIndex((user) => user.nickname === playerName)

  try {
    const base64Head = await extractHead(customSkinSource, 100)
    skinHeadUrls.value[index].url = base64Head
  } catch (error) {
    LOGGER.err(
      'Błąd cięcia/ładowania skina z API. Używam fallbacku Minotar.',
      (error as Error)?.message
    )

    skinHeadUrls.value[index].url = fallbackHeadUrl(playerName)
  }
}

const handleDiscordLink = (): void => {
  window.open('https://discord.com/invite/pokemongogo', '_blank')
}

const handleRulesLink = (): void => {
  window.open('https://www.pokemongogo.pl/#regulamin', '_blank')
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

const handleLogin = (
  user: Partial<IUser & { url: string; type: 'microsoft' | 'backend'; password: string }>
): void => {
  switch (user.type) {
    case 'backend':
      ;(document.getElementById('login-email') as HTMLInputElement).value = user.nickname ?? ''
      ;(document.getElementById('login-password') as HTMLInputElement).value = user.password ?? ''
      ;(document.getElementById('backend-login') as HTMLButtonElement).click()
      break
    case 'microsoft':
      pokeLogin.value?.handleMicrosoftLogin(user.nickname)
      break
    default:
  }

  activeTab.value = 'login'
}

onMounted(() => {
  pokeLogin.value = new PokeGoGoLogin()
})
</script>

<template>
  <div class="animated-bg">
    <img
      :src="choinka"
      alt="background"
      class="absolute !h-[100vh] z-[0]"
      @dragstart.prevent="null"
    />

    <div class="particles"></div>
  </div>
  <div class="vignette"></div>
  <div class="background">
    <div class="bg-gradient"></div>
    <div class="floating-blocks">
      <img :src="dynia" class="block-1" @dragstart.prevent="null" />
      <img :src="dynia" class="block-2" @dragstart.prevent="null" />
      <img :src="dynia" class="block-3" @dragstart.prevent="null" />
      <img :src="ghost" class="ghost-1" @dragstart.prevent="null" />
      <img :src="ghost" class="ghost-2" @dragstart.prevent="null" />
      <img :src="ghost" class="ghost-3" @dragstart.prevent="null" />
    </div>
  </div>

  <Header />

  <form
    v-if="activeTab === 'login'"
    class="max-w-[350px] mx-auto px-8 py-4 z-200 relative flex flex-col justify-center"
  >
    <div class="form-header">
      <h2>Witaj ponownie!</h2>
      <p>Zaloguj się do swojego konta</p>
    </div>

    <div class="flex gap-2 justify-center relative z-200 mb-4">
      <button
        v-for="account in skinHeadUrls"
        :key="account.nickname"
        class="flex flex-col gap-2 items-center px-8 py-6 border-[var(--border)] hover:bg-[var(--bg-dark)] focus:bg-[var(--bg-dark)] hover:cursor-pointer border-2 min-w-[150px] bg-[var(--bg-card)] rounded-3xl"
        @click.prevent="handleLogin(account)"
      >
        <img v-if="account.url" :src="account.url" class="rounded-full w-8 h-8" />
        <div
          v-else
          class="rounded-full border-[var(--border)] border-2 w-8 h-8 flex items-center justify-center"
        >
          <i class="fa fa-user" />
        </div>
        <span class="text-xs">{{ account.nickname }}</span>
      </button>
    </div>

    <div v-if="skinHeadUrls.length" class="flex relative w-full">
      <hr class="my-4 w-full" />
      <span class="mt-[7px] mx-2">lub</span>
      <hr class="my-4 w-full" />
    </div>

    <div class="form-group">
      <div class="input-wrapper">
        <i class="fas fa-user input-icon"></i>
        <input
          id="login-email"
          type="text"
          class="form-input"
          placeholder="Nick lub Email"
          required
        />
        <div class="input-line"></div>
      </div>
      <div id="login-email-error" class="error-message"></div>
    </div>

    <div class="form-group">
      <div class="input-wrapper">
        <i class="fas fa-lock input-icon"></i>
        <input
          id="login-password"
          type="password"
          class="form-input"
          placeholder="Hasło"
          required
        />
        <button id="login-toggle" type="button" class="password-toggle">
          <i class="far fa-eye"></i>
        </button>
        <div class="input-line"></div>
      </div>
      <div id="login-password-error" class="error-message"></div>
    </div>
    <div class="form-group">
      <label for="remember-checkbox" class="checkbox-wrapper">
        <input id="remember-checkbox" type="checkbox" required />
        <span class="checkmark"></span>
        <span class="checkbox-text">Zapamiętaj mnie</span>
      </label>
    </div>

    <button id="backend-login" class="btn-primary" @click="pokeLogin?.handleLogin">
      <span>Zaloguj się</span>
    </button>

    <div class="flex relative w-full">
      <hr class="my-4 w-full" />
      <span class="mt-[7px] mx-2">lub</span>
      <hr class="my-4 w-full" />
    </div>

    <button id="microsoft-login" type="button" class="btn-microsoft">
      <i class="fab fa-microsoft"></i>
      <span>Zaloguj przez Microsoft</span>
    </button>

    <div class="text-center">
      <span>Nie masz jeszcze konta? </span>
      <button type="button" class="switch-btn" @click="activeTab = 'register'">
        Zarejestruj się
      </button>
    </div>
  </form>

  <form v-else class="max-w-[350px] mx-auto px-8 py-4 z-200 relative flex flex-col justify-center">
    <div class="form-header">
      <h2>Dołącz do nas!</h2>
      <p>Utwórz nowe konto gracza</p>
    </div>

    <div class="form-group">
      <div class="input-wrapper">
        <i class="fas fa-gamepad input-icon"></i>
        <input
          id="register-nick"
          type="text"
          class="form-input"
          placeholder="Nick gracza"
          required
          minlength="3"
          maxlength="16"
        />
        <div class="input-line"></div>
      </div>
      <div id="register-nick-error" class="error-message"></div>
    </div>

    <div class="form-group">
      <div class="input-wrapper">
        <i class="fas fa-envelope input-icon"></i>
        <input
          id="register-email"
          type="email"
          class="form-input"
          placeholder="Adres email"
          required
        />
        <div class="input-line"></div>
      </div>
      <div id="register-email-error" class="error-message"></div>
    </div>

    <div class="form-group">
      <div class="input-wrapper">
        <i class="fas fa-key input-icon"></i>
        <input
          id="register-password"
          type="password"
          class="form-input"
          placeholder="Hasło"
          required
          minlength="6"
        />
        <button id="register-toggle" type="button" class="password-toggle">
          <i class="far fa-eye"></i>
        </button>
        <div class="input-line"></div>
      </div>
      <div id="register-password-error" class="error-message"></div>
    </div>

    <div class="form-group">
      <div class="input-wrapper">
        <i class="fas fa-shield-alt input-icon"></i>
        <input
          id="register-confirm"
          type="password"
          class="form-input"
          placeholder="Potwierdź hasło"
          required
        />
        <div class="input-line"></div>
        <button id="register-toggle" type="button" class="password-toggle">
          <i class="far fa-eye"></i>
        </button>
        <div class="input-line"></div>
      </div>
      <div id="register-confirm-error" class="error-message"></div>
    </div>

    <div class="form-group">
      <label for="terms-checkbox" class="checkbox-wrapper">
        <input id="terms-checkbox" type="checkbox" required />
        <span class="checkmark"></span>
        <span class="checkbox-text">Akceptuję regulamin</span>
      </label>
    </div>

    <button class="btn-primary">
      <span>Utwórz konto</span>
    </button>

    <div class="text-center mt-2">
      <span>Masz już konto? </span>
      <button type="button" class="switch-btn" @click="activeTab = 'login'">Zaloguj się</button>
    </div>
  </form>
  <footer class="absolute z-200 bottom-2 mx-auto w-full">
    <div class="flex w-full justify-center mb-2">
      <a href="#" class="footer-link" @click="handleDiscordLink" @dragstart.prevent="null">
        <i class="fab fa-discord"></i>
        <span>Discord</span>
      </a>
      <a href="#" class="footer-link" @click="handleRulesLink" @dragstart.prevent="null">
        <i class="fas fa-file-contract"></i>
        <span>Regulamin</span>
      </a>
    </div>
    <div class="footer-text text-center w-full">
      <p>&copy; 2024-2025 Pokemongogo.pl. Wszystkie prawa zastrzeżone.</p>
    </div>
  </footer>

  <div id="toast-container" class="toast-container"></div>
  <div id="loading-overlay" class="loading-overlay">
    <div class="loading-content">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <div class="loading-text">
        <span id="loading-message">Ładowanie...</span>
      </div>
    </div>
  </div>
</template>

<style lang="css">
@import '@renderer/assets/login.css';
</style>
