<script lang="ts" setup>
import Header from '@renderer/components/Header.vue'
import { onMounted } from 'vue'
import { PokeGoGoLogin } from '@renderer/assets/scripts/login'
import dynia from '@renderer/assets/img/dynia.png'
import ghost from '@renderer/assets/img/ghost.png'
import choinka from '@renderer/assets/img/choinka.png'

const handleDiscordLink = (): void => {
  window.open('https://discord.com/invite/pokemongogo', '_blank')
}

const handleRulesLink = (): void => {
  window.open('https://www.pokemongogo.pl/#regulamin', '_blank')
}

const handleHelpLink = (): void => {
  window.open('https://www.pokemongogo.pl/#faq', '_blank')
}

onMounted(() => {
  new PokeGoGoLogin()
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

  <div class="login-container">
    <div class="auth-card">
      <div class="tab-nav">
        <button class="tab-btn active" data-tab="login">
          <i class="fas fa-sign-in-alt"></i>
          <span>Logowanie</span>
        </button>
        <button class="tab-btn" data-tab="register">
          <i class="fas fa-user-plus"></i>
          <span>Rejestracja</span>
        </button>
        <div class="tab-indicator"></div>
      </div>

      <div class="forms-wrapper">
        <div id="login-form" class="form-container active">
          <div class="form-header">
            <h2>Witaj ponownie!</h2>
            <p>Zaloguj się do swojego konta</p>
          </div>

          <form id="loginForm" class="auth-form">
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

            <button class="btn-primary">
              <span>Zaloguj się</span>
            </button>

            <div class="divider"><span>lub</span></div>

            <button id="microsoft-login" type="button" class="btn-microsoft">
              <i class="fab fa-microsoft"></i>
              <span>Zaloguj przez Microsoft</span>
            </button>
          </form>
        </div>

        <div id="register-form" class="form-container">
          <div class="form-header">
            <h2>Dołącz do nas!</h2>
            <p>Utwórz nowe konto gracza</p>
          </div>

          <form id="registerForm" class="auth-form">
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

            <div class="form-switch">
              <span>Masz już konto? </span>
              <button type="button" class="switch-btn" data-tab="login">Zaloguj się</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <footer class="footer">
      <div class="footer-links">
        <a href="#" class="footer-link" @click="handleDiscordLink" @dragstart.prevent="null">
          <i class="fab fa-discord"></i>
          <span>Discord</span>
        </a>
        <a href="#" class="footer-link" @click="handleRulesLink" @dragstart.prevent="null">
          <i class="fas fa-file-contract"></i>
          <span>Regulamin</span>
        </a>
        <a href="#" class="footer-link" @click="handleHelpLink" @dragstart.prevent="null">
          <i class="fas fa-question-circle"></i>
          <span>Pomoc</span>
        </a>
      </div>
      <div class="footer-text">
        <p>&copy; 2024-2025 Pokemongogo.pl. Wszystkie prawa zastrzeżone.</p>
      </div>
    </footer>
  </div>

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
