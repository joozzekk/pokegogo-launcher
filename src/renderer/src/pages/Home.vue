<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import LaunchButton from '@renderer/components/buttons/LaunchButton.vue'
import useGeneralStore from '@renderer/stores/general-store'
import { getEvents, getServerStatus } from '@renderer/api/endpoints'
import { LOGGER } from '@renderer/services/logger-service'
import { format, parseISO } from 'date-fns'
import useUserStore from '@renderer/stores/user-store'

const url = import.meta.env.RENDERER_VITE_API_URL
const userStore = useUserStore()
const generalStore = useGeneralStore()
const time = ref<number>(0)
const serverStatus = ref<{ players: { online: number } } | null>(null)

const playerName = computed(() => {
  return userStore.user?.nickname ?? 'Guest'
})

const events = ref<any[]>([])

const serverStatusInterval = ref<unknown>()

const normalEvents = computed(() => {
  return events.value
    .filter((event) => event.type === 'normal')
    ?.sort((a, b) => (parseISO(a.startDate).getTime() < parseISO(b.startDate).getTime() ? 1 : -1))
})

const megaEvent = computed(() => {
  return events.value.find((event) => event.type === 'mega')
})

const setServerStatus = async (): Promise<void> => {
  serverStatus.value = await getServerStatus(time)
}

const skinHeadUrl = ref<string | undefined>(undefined)

const apiURL = import.meta.env.RENDERER_VITE_API_URL

const HEAD_X = 8
const HEAD_Y = 8
const HEAD_WIDTH = 8
const HEAD_HEIGHT = 8

function extractHead(skinUrl: string, size: number = 100): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onerror = () => {
      reject(new Error(`Nie udało się załadować skina z URL (HTTP Error/404): ${skinUrl}`))
    }

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        return reject(new Error('Błąd inicjalizacji Canvas context.'))
      }

      canvas.width = size
      canvas.height = size

      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, HEAD_X, HEAD_Y, HEAD_WIDTH, HEAD_HEIGHT, 0, 0, size, size)
      resolve(canvas.toDataURL('image/png'))
    }

    img.src = skinUrl
  })
}

const fallbackHeadUrl = computed(() => `https://mineskin.eu/helm/${playerName.value}/100.png`)

async function loadCustomOrFallbackHead(): Promise<void> {
  const currentName = playerName.value
  const customSkinSource = `${apiURL}/skins/image/${currentName}`

  try {
    LOGGER.log(`Próbuję wyciąć głowę z niestandardowego API dla gracza: ${currentName}`)

    const base64Head = await extractHead(customSkinSource, 100)
    skinHeadUrl.value = base64Head
  } catch (error) {
    LOGGER.err(
      'Błąd cięcia/ładowania skina z API. Używam fallbacku Minotar.',
      (error as Error)?.message
    )

    skinHeadUrl.value = fallbackHeadUrl.value
  }
}

watch(
  playerName,
  (newPlayerName, oldPlayerName) => {
    LOGGER.log(
      `Zauważono zmianę nazwy gracza z "${oldPlayerName}" na "${newPlayerName}". Ładuję skina...`
    )

    loadCustomOrFallbackHead()
  },
  {
    immediate: true
  }
)

onMounted(async () => {
  await setServerStatus()

  events.value = await getEvents()

  serverStatusInterval.value = setInterval(
    async () => {
      await setServerStatus()
      LOGGER.log('Refreshed server status')
    },
    1000 * 60 * 5
  )
})
</script>

<template>
  <div class="w-full relative h-full">
    <div class="flex gap-2 w-full mb-2">
      <div class="quick-setting">
        <i class="fas fa-memory"></i>
        <div>
          RAM: <strong id="quickRam">{{ generalStore.settings.ram }}GB</strong>
          <span class="text-[var(--text-secondary)] opacity-60 ml-1">(Min. 4GB)</span>
        </div>
      </div>
      <div class="quick-setting">
        <i class="fas fa-microchip"></i>
        <div>
          Wersja: <strong>1.21.1</strong>
          <span class="text-[var(--text-secondary)] opacity-60 ml-1">(Fabric)</span>
        </div>
      </div>
      <div class="quick-setting">
        <i class="fas fa-users"></i>
        <div class="flex justify-between w-full">
          <span class="text-[var(--text-secondary)] opacity-60 ml-1">Graczy Online</span>
          <span id="playerCount">{{ serverStatus?.players?.online }}</span>
        </div>
      </div>
      <div class="quick-setting">
        <i class="fas fa-signal"></i>
        <div class="flex justify-between w-full">
          <span class="text-[var(--text-secondary)] opacity-60 ml-1">Ping</span>
          <span id="serverPing">{{ time.toFixed(0) }}ms</span>
        </div>
      </div>
      <div class="quick-setting">
        <i class="fas fa-clock"></i>
        <div class="flex justify-between w-full">
          <span class="text-[var(--text-secondary)] opacity-60 ml-1">Uptime</span>
          <span>24/7</span>
        </div>
      </div>
    </div>

    <div class="flex flex-col">
      <div class="mx-auto featured-tag">
        {{ megaEvent?.startDate ? format(megaEvent.startDate, 'dd MMMM') : '' }}
        {{ megaEvent?.endDate ? ' - ' : '' }}
        {{ megaEvent?.endDate ? format(megaEvent.endDate, 'dd MMMM') : '' }}
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
          class="news-item w-full!"
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
            <span class="news-date">
              {{ event?.startDate ? format(event.startDate, 'dd MMMM') : '' }} -
              {{ event?.endDate ? format(event.endDate, 'dd MMMM') : '' }}
            </span>
            <h4>{{ event.name }}</h4>
            <p class="text-[var(--text-secondary)]!">{{ event.desc }}</p>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
