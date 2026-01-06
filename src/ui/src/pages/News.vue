<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import { getEvents } from '@ui/api/endpoints'
import { format } from 'date-fns'
import { ref, onMounted } from 'vue'

const apiURL = import.meta.env.RENDERER_VITE_API_URL

const allEvents = ref<any[]>([])
const isLoadingEvents = ref<boolean>(true)

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
  <div class="users-container">
    <div class="events-wrapper">
      <article
        v-for="event in allEvents.sort(
          (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )"
        :key="event.uuid"
        class="flex gap-2 backdrop-blur-xl bg-[var(--primary)]/2 border rounded-xl px-4 py-3 border-[var(--primary)]/10 w-full!"
      >
        <div class="news-thumbnail">
          <img
            :src="
              event.src.includes('https://') || event.src.includes('blob')
                ? event.src
                : `${apiURL}/events/image/${event.uuid}`
            "
            alt="News"
            @dragstart.prevent="null"
          />
        </div>
        <div class="news-info">
          <span class="text-[var(--primary)] text-[10px]">
            {{ event?.startDate ? format(event.startDate, 'dd MMMM') : '' }}
            {{ event?.endDate ? ' - ' : '' }}
            {{ event?.endDate ? format(event.endDate, 'dd MMMM yyyy') : '' }}
          </span>
          <h4>{{ event.name }}</h4>
          <p class="text-[var(--text-secondary)]!">
            {{ event.desc }}
          </p>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.users-container {
  padding: 0.5rem;
  height: calc(100vh - 54.5px);
}
.events-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: calc(100vh - 109px);
  overflow-y: auto;
}
</style>
