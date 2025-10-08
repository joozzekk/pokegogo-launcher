<script lang="ts" setup>
import { showToast } from '@renderer/utils'
import { onMounted } from 'vue'
import { initNavigation } from '@renderer/assets/scripts/navigation'
import { updateServerStatus } from '@renderer/assets/scripts//server-status'
import LaunchButton from './LaunchButton.vue'
import useGeneralStore from '@renderer/stores/general-store'

const generalStore = useGeneralStore()

onMounted(() => {
  initNavigation()
  updateServerStatus()
  setInterval(updateServerStatus, 30000)

  document.querySelectorAll<HTMLElement>('.news-item, .news-featured').forEach((item) => {
    item.addEventListener('click', function () {
      const title = this.querySelector<HTMLHeadingElement>('h3, h4')?.textContent || 'Artykuł'
      showToast(`Otwieranie: ${title}`, 'success')

      this.style.transform = 'scale(0.98)'
      setTimeout(() => {
        this.style.transform = ''
      }, 200)
    })
  })
})
</script>

<template>
  <div id="homePage" class="page active">
    <div class="home-grid">
      <div class="launch-panel">
        <div class="launch-header">
          <div class="launch-title">
            <div class="nav-icon">
              <i class="fas fa-play"></i>
            </div>
            <h2>Graj Teraz</h2>
          </div>

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

      <div class="news-panel">
        <div class="news-header">
          <div class="news-title">
            <div class="nav-icon">
              <i class="fas fa-bell"></i>
            </div>
            <h2>Aktualności</h2>
          </div>
        </div>

        <div class="news-featured">
          <div class="featured-image">
            <img src="https://picsum.photos/800/400?random=10" alt="Featured" />
            <div class="featured-gradient"></div>
          </div>
          <div class="featured-content">
            <span class="featured-tag">MEGA WYDARZENIE</span>
            <h3>Koparka Edition w PokeGoGo Launcher 0.2.0-dev</h3>
            <p>
              Dołącz do wspaniałej społeczności kopaczy bitcoina dla twórców launchera! Gwarantuje,
              że nie podziele się hajsem :))
            </p>
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
