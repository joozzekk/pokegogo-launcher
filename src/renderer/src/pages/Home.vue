<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import LaunchButton from '@renderer/components/buttons/LaunchButton.vue'
import useGeneralStore from '@renderer/stores/general-store'
import superEvent from '@renderer/assets/img/superEvent.png'
import { getEvents, getServerStatus } from '@renderer/api/endpoints'
import { LOGGER } from '@renderer/services/logger-service'
import { format, parseISO } from 'date-fns'

const url = import.meta.env.RENDERER_VITE_API_URL
const generalStore = useGeneralStore()
const time = ref<number>(0)
const serverStatus = ref<{ players: { online: number } } | null>(null)

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
  <div id="homePage" class="page active">
    <div class="home-grid">
      <div class="card-panel">
        <div class="card-header">
          <div class="card-title">
            <div class="nav-icon">
              <i class="fas fa-play"></i>
            </div>
            <h2>Graj Teraz</h2>
          </div>
        </div>

        <div class="server-showcase">
          <div class="news-featured">
            <div class="featured-image">
              <img
                :src="
                  megaEvent
                    ? megaEvent.src.includes('https://')
                      ? megaEvent.src
                      : `${url}/events/image/${megaEvent.uuid}`
                    : superEvent
                "
                alt="Super Event"
                @dragstart.prevent="null"
              />
              <div class="featured-gradient"></div>
            </div>
            <template v-if="megaEvent">
              <span class="featured-tag top-[1.5rem] left-[1.5rem]">MEGA WYDARZENIE</span>
              <span class="featured-tag top-[1.5rem] right-[1.5rem]"
                >{{ megaEvent?.startDate ? format(megaEvent.startDate, 'dd MMMM') : '' }} -
                {{ megaEvent?.endDate ? format(megaEvent.endDate, 'dd MMMM') : '' }}</span
              >
              <div class="featured-content">
                <h3>{{ megaEvent?.name }}</h3>
                <p>
                  {{ megaEvent?.desc }}
                </p>
              </div>
            </template>
            <template v-else></template>
          </div>
          <!-- <div class="server-image">
            <img :src="poke" alt="PokeGoGo" @dragstart.prevent="null" />
            <div class="server-overlay">
              <span class="server-ip">PokemonGoGo.pl</span>
            </div>
          </div> -->

          <div class="server-stats">
            <div class="stat-item">
              <i class="fas fa-users"></i>
              <div>
                <span id="playerCount">{{ serverStatus?.players?.online }}</span>
                <label>Graczy Online</label>
              </div>
            </div>
            <div class="stat-item">
              <i class="fas fa-signal"></i>
              <div>
                <span id="serverPing">{{ time.toFixed(0) }}ms</span>
                <label>Ping</label>
              </div>
            </div>
            <div class="stat-item">
              <i class="fas fa-clock"></i>
              <div>
                <span>24/7</span>
                <label>Uptime</label>
              </div>
            </div>
          </div>
        </div>

        <LaunchButton />

        <div class="quick-settings">
          <div class="quick-setting">
            <i class="fas fa-memory"></i>
            <span
              >RAM: <strong id="quickRam">{{ generalStore.settings.ram }}GB</strong></span
            >
          </div>
          <div class="quick-setting">
            <i class="fas fa-microchip"></i>
            <span>Fabric: <strong>ON</strong></span>
          </div>
        </div>
      </div>

      <div class="card-panel">
        <div class="card-header">
          <div class="card-title">
            <div class="nav-icon">
              <i class="fas fa-bell"></i>
            </div>
            <h2>Aktualności</h2>
          </div>
        </div>

        <div class="news-list">
          <article
            v-for="event in normalEvents.filter((_, i) => i < 2)"
            :key="event.uuid"
            class="news-item"
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
              <p>{{ event.desc }}</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>
