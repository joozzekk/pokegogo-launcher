<script setup lang="ts">
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'disconnect'): void | Promise<void>
}>()

const userStore = useUserStore()
const generalStore = useGeneralStore()
const router = useRouter()

const handleLogout = async (): Promise<void> => {
  await emit('disconnect')
  await userStore.logout()
  if (generalStore.currentState === 'minecraft-started') {
    await window.electron?.ipcRenderer?.invoke('launch:exit')
  }
}

const isOnline = computed(() => userStore.user?.isOnline)

const handleChangeRoute = (newRoute: string): void => {
  router.push(newRoute)
}
</script>

<template>
  <aside
    class="sidebar"
    :class="{
      collapsed: generalStore.settings.isSidebarCollapsed,
      'has-profile-open': !!userStore.selectedProfile
    }"
  >
    <div class="player-profile mx-3 my-3">
      <div class="player-fullinfo">
        <div
          class="player-avatar cursor-pointer"
          @click="userStore.user && userStore.updateSelectedProfile(userStore.user)"
        >
          <img
            v-if="userStore.user?.headUrl"
            id="playerSkin"
            :src="userStore.user?.headUrl"
            class="player-skin"
            alt="Player Skin"
            @dragstart.prevent="null"
          />
          <div
            v-else
            id="playerSkin"
            class="player-skin flex items-center justify-center"
            alt="Player Skin"
          >
            <i class="fas fa-user"></i>
          </div>
          <div
            class="status-dot"
            :class="{
              'bg-green-400': isOnline,
              'bg-red-400': !isOnline
            }"
          ></div>
        </div>
      </div>
    </div>

    <div
      class="flex flex-col mb-auto mx-3"
      :class="{ 'mx-4': !generalStore.settings.isSidebarCollapsed }"
    >
      <button
        class="nav-item"
        :class="{
          active: $route.path === '/app/home'
        }"
        @click="handleChangeRoute('/app/home')"
      >
        <div class="nav-icon">
          <i class="fas fa-play"></i>
        </div>
        <span>{{ t('router.home') }}</span>
        <div class="nav-indicator"></div>
      </button>

      <button
        class="nav-item"
        :class="{ active: $route.path === '/app/users' }"
        @click="handleChangeRoute('/app/users')"
      >
        <div class="nav-icon">
          <i class="fas fa-users"></i>
        </div>
        <span>{{ t('router.users') }}</span>
        <div class="nav-indicator"></div>
      </button>

      <button
        class="nav-item"
        :class="{
          active: $route.path === '/app/shop'
        }"
        @click="handleChangeRoute('/app/shop')"
      >
        <div class="nav-icon">
          <i class="fas fa-shopping-cart"></i>
        </div>
        <span>{{ t('router.shop') }}</span>
        <div class="nav-indicator"></div>
      </button>

      <button
        class="nav-item"
        :class="{
          active: $route.path === '/app/news'
        }"
        @click="handleChangeRoute('/app/news')"
      >
        <div class="nav-icon">
          <i class="fas fa-calendar-alt"></i>
        </div>
        <span>{{ t('router.events') }}</span>
        <div class="nav-indicator"></div>
      </button>

      <button
        class="nav-item"
        :class="{
          active: $route.path === '/app/changelog'
        }"
        @click="handleChangeRoute('/app/changelog')"
      >
        <div class="nav-icon">
          <i class="fa-solid fa-rectangle-list"></i>
        </div>
        <span>{{ t('router.changelog') }}</span>
        <div class="nav-indicator"></div>
      </button>

      <div class="sidebar-divider"></div>

      <button
        class="nav-item"
        :class="{
          active: $route.path === '/app/settings'
        }"
        @click="handleChangeRoute('/app/settings')"
      >
        <div class="nav-icon">
          <i class="fas fa-cog"></i>
        </div>
        <span>{{ t('router.settings') }}</span>
        <div class="nav-indicator"></div>
      </button>
    </div>

    <div class="flex flex-col mx-2">
      <button id="logout" class="nav-item hover:cursor-pointer select-none" @click="handleLogout">
        <i class="nav-icon fa-solid fa-door-open"></i>
        <label for="logout" class="hover:cursor-pointer text-[0.5rem] mt-[0.3rem]">Logout</label>
      </button>
    </div>
  </aside>
</template>

<style lang="scss">
.status-dot {
  position: absolute;
  bottom: 0px;
  right: -1px;
  width: 10px;
  height: 10px;
  border: 1px solid var(--bg-dark);
  border-radius: 50%;
  animation: statusPulse 2.5s infinite;
}

@keyframes statusPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 var(--text-secondary);
  }
  50% {
    box-shadow: 0 0 0 5px rgba(197, 167, 34, 0);
  }
}

/* Redesigned Sidebar Styles */
.sidebar {
  width: 5.5rem; /* Much narrower for tooltip-only layout */
  margin: 1rem 0 1rem 1.5rem; /* Floating effect */
  height: calc(100% - 2rem); /* Fit within parent container */
  background: var(--bg-card); /* Ensure using the card background */
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  border-radius: 24px; /* Large rounded corners */
  border: 1px solid rgba(255, 255, 255, 0.05); /* Subtle border */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); /* Deep shadow */
  animation: slideRight 0.5s ease;
  z-index: 100; /* Ensure above background */
  transition: all 0.3s ease-in-out;
}

.sidebar.has-profile-open {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
  box-shadow: -5px 8px 32px rgba(0, 0, 0, 0.2); /* Shift shadow to left */
}

.player-profile {
  background: transparent; /* Remove background */
  border: none; /* Remove border */
  padding: 0.5rem;
  margin-bottom: 1rem;
}

.player-skin {
  border: 2px solid var(--primary);
  box-shadow: 0 0 15px var(--primary-glow, rgba(var(--primary-rgb), 0.4));
  transition: transform 0.3s ease;
  width: 48px;
  height: 48px;
  margin: 0 auto;
}

.player-avatar:hover .player-skin {
  transform: scale(1.1);
}

.nav-item {
  position: relative;
  margin-bottom: 0.5rem;
  padding: 0.6rem; /* Reduced padding */
  background: transparent;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible; /* Allow glow to spill and tooltip to show */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Active State Design */
.nav-item.active {
  background: linear-gradient(
    135deg,
    rgba(var(--primary-rgb), 0.15),
    rgba(var(--primary-rgb), 0.05)
  );
  color: var(--primary);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: var(--primary);
  border-radius: 4px;
  box-shadow: 0 0 10px var(--primary);
}

.nav-icon {
  width: 2.2rem;
  height: 2.2rem;
  background: transparent;
  border-radius: 12px;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-item.active .nav-icon {
  background: var(--primary);
  color: var(--bg-card); /* Contrast icon color */
  box-shadow: 0 0 15px var(--primary-glow, rgba(var(--primary-rgb), 0.5));
}

.nav-item:hover .nav-icon {
  transform: translateY(-2px);
  color: var(--primary);
}

/* Tooltip Styles */
.nav-item span,
#logout label {
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%) translateX(10px);
  background: rgba(15, 15, 20, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.nav-item:hover span,
#logout:hover label {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) translateX(15px);
}

/* Tooltip Arrow */
.nav-item span::before,
#logout label::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 8px;
  height: 8px;
  background: rgba(15, 15, 20, 0.9);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* Hide the old indicator */
.nav-indicator {
  display: none;
}

#logout {
  margin-top: auto;
  margin-bottom: 1rem;
  opacity: 0.6;
  transition: all 0.3s ease;
  position: relative;
}

#logout:hover {
  opacity: 1;
  background: rgba(255, 59, 48, 0.1); /* Red tint on hover */
  color: #ff3b30;
}

#logout .nav-icon {
  color: inherit;
}

.sidebar-divider {
  width: 50%;
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 0.5rem auto;
}
</style>
