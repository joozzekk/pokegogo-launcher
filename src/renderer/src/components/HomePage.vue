<script lang="ts" setup>
import { createParticles, showToast } from '@renderer/utils'
import { ref } from 'vue'

const currentState = ref<string>('')
const isOpeningGame = ref<boolean>(false)
const token = localStorage.getItem('token')

window.electron.ipcRenderer.on('show-log', (_event, data: string, ended?: boolean) => {
  if (!ended) {
    currentState.value = data
    return
  }

  currentState.value = ''
})

const handleLaunchGame = async (e: Event): Promise<void> => {
  isOpeningGame.value = true
  createParticles(e.target as HTMLElement)
  const res = await window.electron.ipcRenderer.invoke('launch-game', token ?? null, 'YourMummy')

  if (res) {
    showToast(`${res}`)
  }
}
</script>

<template>
  <div id="homePage" class="page active">
    <div class="home-grid">
      <div class="launch-panel">
        <div class="launch-header">
          <h2>Graj Teraz</h2>
          <div class="version-selector">
            <select id="versionSelect">
              <option value="Cobblemon">PokemonGoGo.pl</option>
            </select>
            <i class="fas fa-chevron-down"></i>
          </div>
        </div>

        <div class="server-showcase">
          <div class="server-image">
            <img src="https://picsum.photos/600/300?random=99" alt="Server" />
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

        <button
          id="launchBtn"
          class="launch-button"
          :disabled="isOpeningGame"
          @click="handleLaunchGame"
        >
          <div class="launch-button-bg"></div>
          <div class="title">
            <template v-if="!isOpeningGame">
              <i class="fas fa-play"></i>
              <span>URUCHOM GRĘ</span>
            </template>
            <template v-else>
              <i class="fas fa-spinner"></i>
              <span>URUCHAMIANIE..</span>
            </template>
          </div>
          <small v-show="currentState?.length">{{ currentState }}</small>
        </button>

        <div class="quick-settings">
          <div class="quick-setting">
            <i class="fas fa-memory"></i>
            <span>RAM: <strong id="quickRam">4GB</strong></span>
          </div>
          <div class="quick-setting">
            <i class="fas fa-microchip"></i>
            <span>Fabric: <strong>ON</strong></span>
          </div>
        </div>
      </div>

      <div class="news-panel">
        <div class="news-header">
          <h2>Aktualności</h2>
        </div>

        <div class="news-featured">
          <div class="featured-image">
            <img src="https://picsum.photos/800/400?random=10" alt="Featured" />
            <div class="featured-gradient"></div>
          </div>
          <div class="featured-content">
            <span class="featured-tag">WYDARZENIE</span>
            <h3>Zimowy Event 2024</h3>
            <p>Dołącz do zimowej przygody! Zdobądź unikalne nagrody i bonusy.</p>
          </div>
        </div>

        <div class="news-list">
          <article class="news-item">
            <div class="news-thumbnail">
              <img src="https://picsum.photos/100/100?random=11" alt="News" />
            </div>
            <div class="news-info">
              <span class="news-date">15 Grudnia</span>
              <h4>Nowa mapa PvP dostępna!</h4>
              <p>Sprawdź nową arenę Colosseum...</p>
            </div>
          </article>

          <article class="news-item">
            <div class="news-thumbnail">
              <img src="https://picsum.photos/100/100?random=12" alt="News" />
            </div>
            <div class="news-info">
              <span class="news-date">14 Grudnia</span>
              <h4>Update 2.5.0</h4>
              <p>Poprawki wydajności i nowe funkcje...</p>
            </div>
          </article>

          <article class="news-item">
            <div class="news-thumbnail">
              <img src="https://picsum.photos/100/100?random=13" alt="News" />
            </div>
            <div class="news-info">
              <span class="news-date">13 Grudnia</span>
              <h4>Turniej PvP - Zapisz się!</h4>
              <p>Nagroda główna: 5000 PLN...</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>
