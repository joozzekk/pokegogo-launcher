<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import LaunchButton from '@ui/components/buttons/LaunchButton.vue'
import useGeneralStore from '@ui/stores/general-store'
import { getServerStatus } from '@ui/api/endpoints'
import { LOGGER } from '@ui/services/logger-service'
import { format, parseISO } from 'date-fns'

const url = import.meta.env.RENDERER_VITE_API_URL
const generalStore = useGeneralStore()
const time = ref<number>(0)
const serverStatus = ref<{ players: { online: number } } | null>(null)

const props = defineProps<{
  events: any[]
}>()

const serverStatusInterval = ref<unknown>()

const normalEvents = computed(() => {
  return props.events
    .filter((event) => event.type === 'normal')
    ?.sort((a, b) => (parseISO(a.startDate).getTime() < parseISO(b.startDate).getTime() ? 1 : -1))
})

const megaEvent = computed(() => {
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
  <div class="w-full min-h-[calc(100vh-60px)] p-2">
    <div class="flex gap-2 w-full mb-2">
      <div
        class="backdrop-blur-xl bg-[var(--primary)]/2 border rounded-xl px-4 py-3 border-[var(--primary)]/10 w-full flex justify-between items-center"
      >
        <i class="fas fa-memory text-[var(--primary)]"></i>
        <div class="flex justify-between w-full">
          <span class="ml-1">RAM</span>
          <strong id="playerCount">{{ generalStore.settings.ram }}GB</strong>
        </div>
      </div>
      <div
        class="backdrop-blur-xl bg-[var(--primary)]/2 border rounded-xl px-4 py-3 border-[var(--primary)]/10 w-full flex justify-between items-center"
      >
        <i class="fas fa-microchip text-[var(--primary)]"></i>
        <div class="flex justify-between w-full">
          <span class="ml-1">Tryb</span>
          <strong id="playerCount">{{ generalStore.settings.gameMode }}</strong>
        </div>
      </div>
      <div
        class="backdrop-blur-xl bg-[var(--primary)]/2 border rounded-xl px-4 py-3 border-[var(--primary)]/10 w-full flex justify-between items-center"
      >
        <i class="fas fa-users text-[var(--primary)]"></i>
        <div class="flex justify-between w-full">
          <span class="ml-1">Graczy Online</span>
          <strong id="playerCount">{{ serverStatus?.players?.online ?? '0' }}</strong>
        </div>
      </div>
      <div
        class="backdrop-blur-xl bg-[var(--primary)]/2 border rounded-xl px-4 py-3 border-[var(--primary)]/10 w-full flex justify-between items-center"
      >
        <i class="fas fa-signal text-[var(--primary)]"></i>
        <div class="flex justify-between w-full">
          <span class="ml-1">Ping</span>
          <strong id="serverPing">{{ time.toFixed(0) }}ms</strong>
        </div>
      </div>
      <div
        class="backdrop-blur-xl bg-[var(--primary)]/2 border rounded-xl px-4 py-3 border-[var(--primary)]/10 w-full flex justify-between items-center"
      >
        <i class="fas fa-clock text-[var(--primary)]"></i>
        <div class="flex justify-between w-full">
          <span class="ml-1">Uptime</span>
          <strong>24/7</strong>
        </div>
      </div>
    </div>

    <div class="flex flex-col">
      <div class="mx-auto featured-tag">
        {{ megaEvent?.startDate ? format(megaEvent.startDate, 'dd MMMM yyyy') : '' }}
        {{ megaEvent?.endDate ? ' - ' : '' }}
        {{ megaEvent?.endDate ? format(megaEvent.endDate, 'dd MMMM yyyy') : '' }}
      </div>
      <h1 class="text-3xl font-black uppercase text-center mb-2">
        {{ megaEvent?.name }}
      </h1>
      <p class="max-w-2xl mx-auto text-center">
        {{ megaEvent?.desc }}
      </p>
    </div>

    <div class="absolute w-full bottom-0">
      <LaunchButton class="w-4/10 mx-auto" />
      <div class="w-full flex gap-2 mt-4">
        <article
          v-for="event in normalEvents.filter((_, i) => i < 2)"
          :key="event.uuid"
          class="flex gap-2 backdrop-blur-xl bg-[var(--primary)]/2 border rounded-xl px-4 py-3 border-[var(--primary)]/10 w-full!"
        >
          <div class="news-thumbnail">
            <img
              :src="
                event.src.includes('https://') || event.src.includes('blob')
                  ? event.src
                  : `${url}/events/image/${event.uuid}`
              "
              alt="News"
              @dragstart.prevent="null"
            />
          </div>
          <div class="news-info">
            <span class="text-[var(--primary)] text-[10px]">
              {{ event?.startDate ? format(event.startDate, 'dd MMMM') : '' }} -
              {{ event?.endDate ? format(event.endDate, 'dd MMMM yyyy') : '' }}
            </span>
            <h4>{{ event.name }}</h4>
            <p class="text-[var(--text-secondary)]!">{{ event.desc }}</p>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
