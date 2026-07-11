<script lang="ts" setup>
import { getEvents, removeEvent } from '@ui/api/endpoints'
import AddEvent from '@ui/components/modals/AddEvent.vue'
import CachedImage from '@ui/components/CachedImage.vue'
import useUserStore from '@ui/stores/user-store'
import { showToast } from '@ui/utils'
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { UserRole } from '@ui/types/app'

const { t } = useI18n()
const url = import.meta.env.RENDERER_VITE_API_URL
const userStore = useUserStore()

interface AdminEvent {
  uuid: string | number
  name: string
  desc?: string
  type?: string
  startDate?: string | Date
  endDate?: string | Date
  src: string
  [key: string]: unknown
}

const allEvents = ref<AdminEvent[]>([])
const isLoadingEvents = ref<boolean>(true)
const filteredEvents = ref<AdminEvent[]>([])
const searchQuery = ref('')
const addEventModalRef = ref()

async function fetchEvents(): Promise<void> {
  isLoadingEvents.value = true
  if (!userStore.user) return

  const res = await getEvents()

  if (res) {
    allEvents.value = res
    filteredEvents.value = [...allEvents.value]
    isLoadingEvents.value = false
  }
}

const handleRemoveEvent = async (event: AdminEvent): Promise<void> => {
  const res = await removeEvent(Number(event.uuid))

  if (res) {
    showToast(`${t('events.deleteSuccess')} ${event.name}.`)
    await fetchEvents()
  }
}

watch(searchQuery, () => {
  if (!searchQuery.value) {
    filteredEvents.value = [...allEvents.value]
    return
  }

  filteredEvents.value = allEvents.value.filter(
    (event: AdminEvent) =>
      event.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (event.desc && event.desc.toLowerCase().includes(searchQuery.value.toLowerCase()))
  )
})

const hasResults = computed(() => filteredEvents.value && filteredEvents.value.length > 0)

const router = useRouter()

onMounted(async () => {
  const role = userStore.user?.role?.toLowerCase() ?? UserRole.USER
  const isAdmin = [UserRole.OWNER, UserRole.ADMIN, UserRole.MODERATOR, UserRole.MOD, UserRole.DEV, UserRole.DEV_EN].includes(
    role as UserRole
  )

  if (!isAdmin) {
    router.push('/app/home')
    return
  }
  await fetchEvents()
})
</script>

<template>
  <div class="events-layout">
    <div class="events-header">
      <div class="search-container">
        <i class="fas fa-search"></i>
        <input v-model="searchQuery" type="text" :placeholder="t('events.searchPlaceholder')" />
      </div>

      <div class="actions-dock">
        <button class="action-btn" :title="t('events.refresh')" @click="fetchEvents">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': isLoadingEvents }"></i>
        </button>
        <div class="dock-divider"></div>
        <button
          class="action-btn highlight"
          :title="t('events.add')"
          @click="addEventModalRef?.openModal(null, 'add')"
        >
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>

    <div class="events-glass-panel">
      <div v-if="isLoadingEvents" class="loading-overlay">
        <i class="fas fa-spinner fa-spin"></i>
        <span>{{ t('events.loading') }}</span>
      </div>

      <div v-else-if="!hasResults" class="empty-state">
        <div class="empty-icon"><i class="fas fa-calendar-times"></i></div>
        <h3>{{ t('events.noResultsTitle') }}</h3>
        <p>{{ t('events.noResultsDesc') }}</p>
      </div>

      <div v-else class="events-list custom-scrollbar">
        <div
          v-for="event in filteredEvents"
          :key="event.uuid"
          class="event-card"
          :class="{ 'mega-event': event.type === 'mega' }"
        >
          <div class="img-wrapper">
            <CachedImage
              :uuid="event.uuid"
              :src="
                event.src.includes('https://') || event.src.includes('blob')
                  ? event.src
                  : `${url}/events/image/${event.uuid}`
              "
              alt="Event Image"
            />
            <div v-if="event.type === 'mega'" class="mega-badge">MEGA</div>
          </div>

          <div class="event-info">
            <div class="event-header">
              <h3 class="event-name">{{ event.name }}</h3>
              <span class="type-badge" :class="event.type">
                {{ event.type?.toUpperCase() }}
              </span>
            </div>
            <div class="event-desc">{{ event.desc }}</div>

            <div v-if="event.startDate || event.endDate" class="event-dates">
              <span v-if="event.startDate"
                ><i class="far fa-calendar-alt"></i>
                {{ new Date(event.startDate).toLocaleDateString() }}</span
              >
              <span v-if="event.endDate" class="mx-1">-</span>
              <span v-if="event.endDate">{{ new Date(event.endDate).toLocaleDateString() }}</span>
            </div>
          </div>

          <div class="event-actions">
            <button
              class="icon-btn edit-btn"
              :title="t('events.edit')"
              @click.stop="addEventModalRef?.openModal(event, 'edit')"
            >
              <i class="fas fa-pencil-alt"></i>
            </button>
            <button
              v-if="event.type !== 'mega'"
              class="icon-btn delete-btn"
              :title="t('events.delete')"
              @click.stop="handleRemoveEvent(event)"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <AddEvent ref="addEventModalRef" @refresh-data="fetchEvents" />
  </div>
</template>

<style scoped>
.events-layout {
  width: 100%;
  height: calc(100vh - 60px);
  padding: 1rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header & Search */
.events-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.search-container {
  display: flex;
  align-items: center;
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(10px);
  padding: 0.6rem 1rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 320px;
  transition: all 0.3s ease;
}
.search-container:focus-within {
  background: rgba(20, 20, 25, 0.9);
  border-color: rgba(var(--primary-rgb), 0.5);
  box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.2);
}
.search-container i {
  color: var(--text-secondary);
  margin-right: 0.8rem;
}
.search-container input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  width: 100%;
}

/* Actions Dock */
.actions-dock {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}
.action-btn.highlight {
  color: var(--primary);
  background: rgba(var(--primary-rgb), 0.1);
}
.action-btn.highlight:hover {
  background: var(--primary);
  color: white;
}
.dock-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 0.5rem;
}

/* Main Panel */
.events-glass-panel {
  flex: 1;
  background: rgba(20, 20, 25, 0.4);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* Loading & Empty */
.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 50;
  color: white;
  gap: 1rem;
}
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}
.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.1);
}

/* List */
.events-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

/* Card Styling */
.event-card {
  display: flex;
  align-items: stretch;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  padding: 0.8rem;
  gap: 1rem;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  position: relative;
}

.event-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.event-card.mega-event {
  border-color: rgba(var(--primary-rgb), 0.3);
  background: linear-gradient(90deg, rgba(var(--primary-rgb), 0.05), rgba(255, 255, 255, 0.02));
}

/* Image */
.img-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.img-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mega-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--primary);
  color: white;
  font-size: 0.6rem;
  font-weight: 800;
  text-align: center;
  padding: 2px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Info */
.event-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.3rem;
  overflow: hidden;
}
.event-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.event-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.type-badge {
  font-size: 0.65rem;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
}
.type-badge.mega {
  background: rgba(var(--primary-rgb), 0.2);
  color: var(--primary);
  border: 1px solid rgba(var(--primary-rgb), 0.3);
}

.event-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.4;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-dates {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 600;
  margin-top: 0.2rem;
  display: flex;
  align-items: center;
}
.event-dates i {
  margin-right: 4px;
}

/* Actions */
.event-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-left: 1rem;
  border-left: 1px solid rgba(255, 255, 255, 0.05);
  opacity: 0;
  transform: translateX(10px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  transition-delay: 0.1s;
}

.event-card:hover .event-actions {
  opacity: 1;
  transform: translateX(0);
  transition-delay: 0s;
}

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  transform: scale(1.05);
}
.edit-btn:hover {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.2);
}
.delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.2);
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
