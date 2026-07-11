<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import LaunchButton from '@ui/components/buttons/LaunchButton.vue'
import CachedImage from '@ui/components/CachedImage.vue'
import FlappyPidgeyModal from '@ui/components/modals/FlappyPidgeyModal.vue'
import VerifyFilesModal from '@ui/components/modals/VerifyFilesModal.vue'
import EventDetailsModal from '@ui/components/modals/EventDetailsModal.vue'
import useGeneralStore from '@ui/stores/general-store'
import { getServerStatus } from '@ui/api/endpoints'
import { LOGGER } from '@ui/services/logger-service'
import { format, parseISO } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useI18n } from 'vue-i18n'

const url = import.meta.env.RENDERER_VITE_API_URL
const generalStore = useGeneralStore()
const { t, locale } = useI18n()

const dateLocale = computed(() => (locale.value === 'pl' ? pl : enUS))

const time = ref<number>(0)
const serverStatus = ref<any>(null)
const serverStatusInterval = ref<any>(null)
const flappyPidgeyRef = ref()
const verifyFilesModalRef = ref()
const eventDetailsRef = ref()

const props = defineProps<{
  events: any[]
}>()

const safeParseDate = (dateStr: string | undefined): number => {
  if (!dateStr) return 0
  try {
    const time = parseISO(dateStr).getTime()
    return isNaN(time) ? 0 : time
  } catch {
    return 0
  }
}

const safeFormatDate = (dateStr: string | undefined, formatStr: string): string => {
  if (!dateStr) return ''
  try {
    const date = parseISO(dateStr)
    if (isNaN(date.getTime())) return ''
    return format(date, formatStr, { locale: dateLocale.value })
  } catch {
    return ''
  }
}

const normalEvents = computed(() => {
  if (!Array.isArray(props.events)) return []
  return props.events
    .filter((event) => event?.type === 'normal')
    ?.sort((a, b) => (safeParseDate(a?.startDate) < safeParseDate(b?.startDate) ? 1 : -1))
})

const megaEvent = computed(() => {
  if (!Array.isArray(props.events)) return undefined
  return props.events.find((event) => event?.type === 'mega')
})

const setServerStatus = async (): Promise<void> => {
  serverStatus.value = await getServerStatus(time)
}

onMounted(async () => {
  await setServerStatus()
  serverStatusInterval.value = setInterval(
    async () => {
      await setServerStatus()
      LOGGER.with('ServerStatus').log('Refreshed server status')
    },
    1000 * 60 * 5
  )
})
</script>

<template>
  <div class="home-container">
    <div class="dashboard-grid">
      <!-- Hero Section (Mega Event or Featured) -->
      <div
        v-if="megaEvent || normalEvents.length > 0"
        class="hero-section"
        :class="{ 'cursor-pointer': megaEvent }"
        @click="megaEvent && eventDetailsRef?.openModal(megaEvent, dateLocale)"
      >
        <div class="hero-bg">
          <CachedImage
            v-if="megaEvent"
            :uuid="megaEvent.uuid"
            :src="
              megaEvent?.src?.includes('https://') || megaEvent?.src?.includes('blob')
                ? megaEvent.src
                : `${url}/events/image/${megaEvent.uuid}`
            "
            alt="Hero Background"
          />
          <div class="hero-overlay"></div>
        </div>
        <div class="hero-content">
          <div v-if="megaEvent" class="hero-tag">{{ t('home.activeEvent') }}</div>
          <h1 class="hero-title">{{ megaEvent?.name || 'Welcome to PokeGoGo' }}</h1>
          <p class="hero-desc">
            {{ megaEvent?.desc || 'Join the adventure on the best Cobblemon server!' }}
          </p>
          <div v-if="megaEvent?.startDate" class="hero-meta">
            <i class="far fa-calendar-alt"></i>
            <span>{{ safeFormatDate(megaEvent.startDate, 'dd MMM yyyy') }}</span>
            <span v-if="megaEvent?.endDate">
              -
              {{ safeFormatDate(megaEvent.endDate, 'dd MMM yyyy') }}</span
            >
          </div>
        </div>
      </div>

      <!-- News Feed -->
      <div class="news-section">
        <h2 class="section-title">{{ t('home.latestUpdates') }}</h2>
        <div class="news-grid custom-scrollbar">
          <article
            v-for="event in normalEvents.filter((_, i) => i < 3)"
            :key="event.uuid"
            class="news-card"
            @click="eventDetailsRef?.openModal(event, dateLocale)"
          >
            <div class="news-img">
              <CachedImage
                :uuid="event.uuid"
                :src="
                  event?.src?.includes('https://') || event?.src?.includes('blob')
                    ? event.src
                    : `${url}/events/image/${event.uuid}`
                "
              />
            </div>
            <div class="news-content">
              <span class="news-date">
                {{ safeFormatDate(event?.startDate, 'dd MMM') }}
              </span>
              <h3>{{ event.name }}</h3>
              <p>
                {{ event?.desc?.length > 80 ? event.desc.substring(0, 80) + '...' : (event?.desc || '') }}
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- Floating Dock -->
    <Teleport to="body">
      <div class="floating-dock">
        <div class="dock-stats">
          <div class="dock-stat-item" :title="t('home.playersOnline')">
            <i class="fas fa-users"></i>
            <span>{{ serverStatus?.players?.online ?? '0' }}</span>
          </div>
          <div class="dock-divider"></div>
          <div class="dock-stat-item" :title="t('home.ping')">
            <i class="fas fa-signal"></i>
            <span>{{ time > 200 ? 200 : time.toFixed(0) }}ms</span>
          </div>
          <div class="dock-divider"></div>
        </div>

        <div class="dock-center-actions">
          <button
            class="dock-game-btn"
            title="Weryfikowanie plików"
            @click="verifyFilesModalRef?.openModal()"
          >
            <i class="fas fa-hammer"></i>
          </button>

          <LaunchButton class="dock-launch-btn" />

          <button
            class="dock-game-btn"
            :title="t('common.playGame')"
            @click="flappyPidgeyRef?.openModal()"
          >
            <i class="fas fa-gamepad"></i>
          </button>
        </div>

        <div class="dock-stats">
          <div class="dock-divider"></div>
          <div class="dock-stat-item" :title="t('home.ram')">
            <i class="fas fa-microchip"></i>
            <span>{{ generalStore.settings.ram }}GB</span>
          </div>
          <div class="dock-divider"></div>
          <div class="dock-stat-item" :title="t('home.uptime')">
            <i class="fas fa-server"></i>
            <span>Online</span>
          </div>
        </div>
      </div>
    </Teleport>

    <FlappyPidgeyModal ref="flappyPidgeyRef" />
    <VerifyFilesModal ref="verifyFilesModalRef" />
    <EventDetailsModal ref="eventDetailsRef" />
  </div>
</template>

<style scoped>
.home-container {
  width: 100%;
  height: calc(100vh - 60px);
  overflow-y: auto;
  padding: 1rem 2rem 140px 1rem;
  position: relative;
}

.dashboard-grid {
  display: grid;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Hero Section */
.hero-section {
  position: relative;
  height: 400px;
  border-radius: 24px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.hero-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.6);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 100%);
}

.hero-content {
  position: relative;
  height: 100%;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  z-index: 1;
}

.hero-tag {
  background: var(--primary);
  color: #fff;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  width: fit-content;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
  color: #fff;
}

.hero-desc {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
  max-width: 600px;
  margin-bottom: 1.5rem;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--primary);
  font-weight: 600;
}

/* News Section */
.news-section {
  padding-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.news-card {
  background: var(--bg-card);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
}

.news-card:hover {
  transform: translateY(-8px);
  border-color: rgba(var(--primary-rgb), 0.3);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
}

.news-img {
  height: 180px;
  width: 100%;
}

.news-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.news-content {
  padding: 1.5rem;
}

.news-date {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
  display: block;
}

.news-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.news-card p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Floating Dock */
.floating-dock {
  position: fixed;
  bottom: 2rem;
  left: 56.5%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(15, 15, 20, 0.7);
  backdrop-filter: blur(24px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  z-index: 1000;
  animation: floatUp 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes floatUp {
  from {
    transform: translate(-50%, 40px);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

.dock-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dock-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 60px;
}

.dock-stat-item i {
  font-size: 1rem;
  color: var(--primary);
  opacity: 0.9;
}

.dock-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
}

.dock-launch-btn {
  width: 200px;
  height: 48px;
}

.dock-center-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dock-game-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.dock-game-btn:hover {
  background: var(--primary);
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 5px 15px rgba(var(--primary-rgb), 0.4);
  border-color: transparent;
}

/* Custom Scrollbar for news items */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(var(--primary-rgb), 0.2);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--primary);
}
</style>
