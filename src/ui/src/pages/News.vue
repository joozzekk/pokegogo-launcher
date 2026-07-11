<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import { getEvents } from '@ui/api/endpoints'
import { format } from 'date-fns'
import CachedImage from '@ui/components/CachedImage.vue'
import EventDetailsModal from '@ui/components/modals/EventDetailsModal.vue'
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { pl, enUS } from 'date-fns/locale'

const apiURL = import.meta.env.RENDERER_VITE_API_URL

const { locale } = useI18n()
const dateLocale = computed(() => (locale.value === 'pl' ? pl : enUS))

const allEvents = ref<any[]>([])
const isLoadingEvents = ref<boolean>(true)
const eventDetailsRef = ref()

async function fetchEvents(): Promise<void> {
  isLoadingEvents.value = true

  const res = await getEvents()

  if (res) {
    allEvents.value = res
    isLoadingEvents.value = false
  }
}

onMounted(async () => {
  await fetchEvents()
})
</script>

<template>
  <div class="news-page-container">
    <div class="news-list">
      <article
        v-for="event in allEvents.sort(
          (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )"
        :key="event.uuid"
        class="news-entry-card"
        @click="eventDetailsRef?.openModal(event, dateLocale)"
      >
        <div class="news-entry-thumbnail">
          <CachedImage
            :uuid="event.uuid"
            :src="
              event.src.includes('https://') || event.src.includes('blob')
                ? event.src
                : `${apiURL}/events/image/${event.uuid}`
            "
            alt="News"
          />
          <div class="news-entry-overlay"></div>
        </div>

        <div class="news-entry-content">
          <div class="news-entry-meta">
            <span class="news-entry-date">
              <i class="far fa-calendar-alt"></i>
              {{ event?.startDate ? format(new Date(event.startDate), 'dd MMMM yyyy') : '' }}
            </span>
            <span v-if="event.type === 'mega'" class="news-entry-badge">Mega Event</span>
          </div>

          <h2 class="news-entry-title">{{ event.name }}</h2>

          <p class="news-entry-description">
            {{ event.desc }}
          </p>
        </div>
      </article>
    </div>
    <EventDetailsModal ref="eventDetailsRef" />
  </div>
</template>

<style scoped>
.news-page-container {
  padding: 1.5rem 2rem;
  height: calc(100vh - 60px);
  overflow-y: auto;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
}

.news-entry-card {
  display: flex;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  min-height: 200px;
}

.news-entry-card:hover {
  transform: translateY(-4px) scale(1.01);
  border-color: rgba(var(--primary-rgb), 0.3);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
}

.news-entry-thumbnail {
  width: 35%;
  min-width: 250px;
  position: relative;
  overflow: hidden;
}

.news-entry-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.news-entry-card:hover .news-entry-thumbnail img {
  transform: scale(1.05);
}

.news-entry-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.2));
}

.news-entry-content {
  flex: 1;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-content: center;
}

.news-entry-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.news-entry-date {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.news-entry-badge {
  padding: 3px 10px;
  background: rgba(var(--primary-rgb), 0.1);
  color: var(--primary);
  border-radius: 20px;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
}

.news-entry-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
}

.news-entry-description {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.6;
  opacity: 0.8;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 800px) {
  .news-entry-card {
    flex-direction: column;
  }
  .news-entry-thumbnail {
    width: 100%;
    height: 180px;
  }
}
</style>
