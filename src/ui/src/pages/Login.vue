<script lang="ts" setup>
import Header from '@ui/components/core/Header.vue'
import Background from '@ui/components/Background.vue'
import { Message } from 'primevue'

import { useLoginService } from '@ui/services/login-service'
import { AccountType, ActiveTab } from '@ui/types/app'

import { ref } from 'vue'
import NicknameTakenModal from '@ui/components/modals/NicknameTakenModal.vue'

const nicknameTakenModalRef = ref<InstanceType<typeof NicknameTakenModal> | null>(null)

const { useMethods, useVariables } = useLoginService({
  onNicknameTaken: () => nicknameTakenModalRef.value?.openModal()
})

const { handleLogin, handleChangeTab, removeSavedAccount, handleRegister } = useMethods()
const { savedAccounts, appState, formState, login$ } = useVariables()

import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <Header />
  <Background />

  <div class="login-container">
    <div class="login-card">
      <Transition name="fade" mode="out-in">
        <div v-if="appState.activeTab === ActiveTab.LOGIN" class="w-full">
          <div class="text-center mb-6">
            <h1 class="text-2xl font-black text-white mb-1 tracking-tight">
              {{ t('login.title') }}
            </h1>
            <p class="text-[var(--text-secondary)] text-xs font-medium">
              {{ t('login.subtitle') }}
            </p>
          </div>

          <div v-if="savedAccounts.length" class="flex gap-3 flex-wrap justify-center mb-6">
            <div
              v-for="savedAccount in savedAccounts"
              :key="savedAccount.nickname"
              class="account-item group"
              @click="handleLogin(savedAccount)"
            >
              <button class="remove-btn" @click.stop="removeSavedAccount(savedAccount)">
                <i class="fa fa-times" />
              </button>

              <div class="avatar-ring">
                <img
                  v-if="savedAccount.url"
                  :src="savedAccount.url"
                  class="w-full h-full object-cover rounded-full"
                  @dragstart.prevent="null"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center bg-white/5 rounded-full"
                >
                  <i class="fa fa-user text-[var(--text-secondary)] text-xs" />
                </div>
              </div>

              <span
                class="text-[11px] text-[var(--text-secondary)] font-bold truncate max-w-full group-hover:text-white transition-colors"
              >
                {{ savedAccount.nickname }}
              </span>
            </div>
          </div>

          <div v-if="savedAccounts.length" class="divider mb-6">
            <div class="line"></div>
            <span class="text">{{ t('login.or') }}</span>
            <div class="line"></div>
          </div>

          <div class="flex flex-col gap-3 w-full">
            <div class="input-group" :class="{ error: login$.nick.$error }">
              <div class="input-wrapper">
                <i class="fa fa-user input-icon" />
                <input
                  v-model="formState.nick"
                  type="text"
                  :placeholder="t('login.placeholder.nick')"
                  class="custom-input"
                />
              </div>
              <div class="error-text" :class="{ show: login$.nick.$error }">
                {{ login$.nick.$errors[0]?.$message }}
              </div>
            </div>

            <div class="input-group" :class="{ error: login$.password.$error }">
              <div class="input-wrapper">
                <i class="fa fa-lock input-icon" />
                <input
                  v-model="formState.password"
                  :type="formState.passwordType"
                  placeholder="Podaj hasło.."
                  class="custom-input !pr-9"
                />
                <i
                  class="fa input-eye"
                  :class="{
                    'fa-eye-slash': formState.passwordType === 'password',
                    'fa-eye': formState.passwordType === 'text'
                  }"
                  @click="
                    formState.passwordType =
                      formState.passwordType === 'password' ? 'text' : 'password'
                  "
                />
              </div>
              <div class="error-text" :class="{ show: login$.password.$error }">
                {{ login$.password.$errors[0]?.$message }}
              </div>
            </div>

            <button
              class="action-btn primary mt-2"
              :disabled="appState.loading"
              @click="handleLogin(null)"
            >
              {{ t('login.loginButton') }}
            </button>
          </div>

          <div class="divider mt-6 mb-4">
            <div class="line"></div>
            <span class="text">{{ t('login.or') }}</span>
            <div class="line"></div>
          </div>

          <button
            class="action-btn secondary"
            :disabled="appState.loading"
            @click="handleLogin({ accountType: AccountType.MICROSOFT })"
          >
            <i class="fab fa-microsoft text-sm"></i>
            <span>{{ t('login.microsoftLogin') }}</span>
          </button>

          <p class="text-[11px] text-center text-[var(--text-secondary)] mt-6">
            {{ t('login.noAccount') }}
            <span
              class="text-[var(--primary)] font-bold cursor-pointer hover:text-white transition-colors"
              @click="handleChangeTab(ActiveTab.REGISTER)"
            >
              {{ t('login.register') }}
            </span>
          </p>
        </div>

        <div v-else class="w-full">
          <div class="text-center mb-6">
            <h1 class="text-2xl font-black text-white mb-1 tracking-tight">
              {{ t('register.title') }}
            </h1>
            <p class="text-[var(--text-secondary)] text-xs font-medium">
              {{ t('register.subtitle') }}
            </p>
          </div>

          <Message
            severity="info"
            class="!bg-[var(--primary)]/10 !border !border-[var(--primary)]/20 !text-blue-200 !rounded-xl !mb-5 !p-3 shadow-sm"
            :closable="false"
          >
            <span class="text-[10px] leading-relaxed block font-medium">
              {{ t('register.info') }}
            </span>
          </Message>

          <div class="flex flex-col gap-3 w-full">
            <div class="input-group" :class="{ error: login$.nick.$error }">
              <div class="input-wrapper">
                <i class="fa fa-user input-icon" />
                <input
                  v-model="formState.nick"
                  type="text"
                  :placeholder="t('register.placeholder.nick')"
                  class="custom-input"
                />
              </div>
              <div class="error-text" :class="{ show: login$.nick.$error }">
                {{ login$.nick.$errors[0]?.$message }}
              </div>
            </div>

            <div class="input-group" :class="{ error: login$.email?.$error }">
              <div class="input-wrapper">
                <i class="fa fa-envelope input-icon" />
                <input
                  v-model="formState.email"
                  type="text"
                  :placeholder="t('register.placeholder.email')"
                  class="custom-input"
                />
              </div>
              <div class="error-text" :class="{ show: login$.email?.$error }">
                {{ login$.email?.$errors[0]?.$message }}
              </div>
            </div>

            <div class="input-group" :class="{ error: login$.password.$error }">
              <div class="input-wrapper">
                <i class="fa fa-lock input-icon" />
                <input
                  v-model="formState.password"
                  :type="formState.passwordType"
                  placeholder="Podaj hasło.."
                  class="custom-input !pr-9"
                />
                <i
                  class="fa input-eye"
                  :class="{
                    'fa-eye-slash': formState.passwordType === 'password',
                    'fa-eye': formState.passwordType === 'text'
                  }"
                  @click="
                    formState.passwordType =
                      formState.passwordType === 'password' ? 'text' : 'password'
                  "
                />
              </div>
              <div class="error-text" :class="{ show: login$.password.$error }">
                {{ login$.password.$errors[0]?.$message }}
              </div>
            </div>

            <div class="input-group" :class="{ error: login$.repeatPassword?.$error }">
              <div class="input-wrapper">
                <i class="fa fa-lock input-icon" />
                <input
                  v-model="formState.repeatPassword"
                  :type="formState.repeatPasswordType"
                  :placeholder="t('register.placeholder.repeatPassword')"
                  class="custom-input !pr-9"
                />
                <i
                  class="fa input-eye"
                  :class="{
                    'fa-eye-slash': formState.repeatPasswordType === 'password',
                    'fa-eye': formState.repeatPasswordType === 'text'
                  }"
                  @click="
                    formState.repeatPasswordType =
                      formState.repeatPasswordType === 'password' ? 'text' : 'password'
                  "
                />
              </div>
              <div class="error-text" :class="{ show: login$.repeatPassword?.$error }">
                {{ login$.repeatPassword?.$errors[0]?.$message }}
              </div>
            </div>

            <button
              class="action-btn primary mt-3"
              :disabled="appState.loading"
              @click="handleRegister"
            >
              {{ t('register.registerButton') }}
            </button>

            <p class="text-[11px] text-center text-[var(--text-secondary)] mt-4">
              {{ t('register.hasAccount') }}
              <span
                class="text-[var(--primary)] font-bold cursor-pointer hover:text-white transition-colors"
                @click="handleChangeTab(ActiveTab.LOGIN)"
              >
                {{ t('register.login') }}
              </span>
            </p>
          </div>
        </div>
      </Transition>
    </div>

    <footer class="absolute z-50 bottom-0 w-full text-center pointer-events-none">
      <div class="text-[10px] text-[var(--text-muted)] opacity-50 font-medium">
        <p>&copy; 2025-2026 Pokemongogo.pl. {{ t('login.copyright') }}</p>
      </div>
    </footer>
  </div>

  <NicknameTakenModal ref="nicknameTakenModalRef" />

  <div id="toastContainer" class="toast-container"></div>
  <div v-if="appState.loading" class="loading-overlay">
    <div class="loading-content">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <div class="loading-text">
        <span id="loading-message">{{ appState.loadingMessage ?? t('general.loading') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@ui/assets/login.css';

/* === LAYOUT === */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 80px);
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 400px; /* Kompaktowa szerokość */
  padding: 2.5rem 2rem;

  /* Stylizacja spójna z Home/FTP */
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);

  display: flex;
  flex-direction: column;
}

/* === INPUTS === */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: var(--primary);
  font-size: 0.8rem;
  z-index: 10;
}

.input-eye {
  position: absolute;
  right: 14px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.2s;
  z-index: 10;
}

.input-eye:hover {
  color: var(--text-primary);
}

.custom-input {
  width: 100%;
  background: rgba(20, 20, 25, 0.6); /* Ciemniejsze tło jak w search bar */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.7rem 1rem 0.7rem 2.6rem;
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 500;
  outline: none;
  transition: all 0.2s ease;
}

.custom-input:focus {
  background: rgba(20, 20, 25, 0.9);
  border-color: rgba(var(--primary-rgb), 0.5);
  box-shadow: 0 0 0 1px rgba(var(--primary-rgb), 0.3);
}

.custom-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

/* Error States */
.input-group.error .custom-input {
  border-color: #ef4444;
}

.input-group.error .input-icon {
  color: #ef4444;
}

.error-text {
  font-size: 0.7rem;
  color: #ef4444;
  font-weight: 600;
  max-height: 0;
  overflow: hidden;
  transition: all 0.2s;
  padding-left: 0.5rem;
}

.error-text.show {
  max-height: 20px;
  margin-top: 2px;
}

/* === BUTTONS === */
.action-btn {
  width: 100%;
  padding: 0.7rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn:disabled {
  opacity: 0.6;
  pointer-events: none;
  cursor: not-allowed;
}

.action-btn.primary {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--primary-rgb), 0.4);
  filter: brightness(1.1);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
}

.action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
}

/* === SAVED ACCOUNTS === */
.account-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 72px;
  padding: 0.6rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.account-item:hover {
  background: rgba(var(--primary-rgb), 0.15);
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.avatar-ring {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  padding: 2px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.remove-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #27272a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  opacity: 0;
  transition: all 0.2s;
}

.account-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

/* === DIVIDER === */
.divider {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 1rem;
}

.line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}

.text {
  padding: 0 0.8rem;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* === TRANSITIONS === */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
