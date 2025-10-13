<script lang="ts" setup>
import { onMounted } from 'vue'
import { initNavigation } from '@renderer/assets/scripts/navigation'
import { updateServerStatus } from '@renderer/assets/scripts/server-status'
import LaunchButton from '@renderer/components/buttons/LaunchButton.vue'
import useGeneralStore from '@renderer/stores/general-store'
import poke from '@renderer/assets/img/poke.png'
import superEvent from '@renderer/assets/img/superEvent.png'
import logo from '@renderer/assets/logo.png'
import Select from '@renderer/components/Select.vue'

const generalStore = useGeneralStore()

const versions = [{ label: 'PokemonGoGo.pl', value: 'PokemonGoGo.pl' }]

onMounted(() => {
  initNavigation()
  updateServerStatus()
  setInterval(updateServerStatus, 30000)
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

          <Select v-model="generalStore.settings.version" :options="versions" />
        </div>

        <div class="server-showcase">
          <div class="server-image">
            <img :src="poke" alt="PokeGoGo" />
            <div class="server-overlay">
              <span class="server-ip">PokemonGoGo.pl</span>
            </div>
          </div>

          <div class="server-stats">
            <div class="stat-item">
              <i class="fas fa-users"></i>
              <div>
                <span id="playerCount">0</span>
                <label>Graczy Online</label>
              </div>
            </div>
            <div class="stat-item">
              <i class="fas fa-signal"></i>
              <div>
                <span id="serverPing">0ms</span>
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

        <div class="news-featured">
          <div class="featured-image">
            <img :src="superEvent" alt="Super Event" />
            <div class="featured-gradient"></div>
          </div>
          <span class="featured-tag">MEGA WYDARZENIE</span>
          <div class="featured-content">
            <h3>Event HALLOWEEN!</h3>
            <p>
              Baw się wspólnie ze znajomymi na evencie halloweenowym. Nowy content, unikalne
              pokemony i wiele więcej!
            </p>
          </div>
        </div>

        <div class="news-list">
          <article class="news-item">
            <div class="news-thumbnail">
              <img :src="logo" alt="News" />
            </div>
            <div class="news-info">
              <span class="news-date">25 Października</span>
              <h4>Aktualizacja 0.2.0</h4>
              <p>Oficjalny start Launchera dla społeczności PokemonGoGo!</p>
            </div>
          </article>

          <article class="news-item">
            <div class="news-thumbnail">
              <img :src="logo" alt="News" />
            </div>
            <div class="news-info">
              <span class="news-date">23 Października</span>
              <h4>Aktualizacja 0.1.19</h4>
              <p>Otwarta beta launchera do testów dla społeczności</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>
