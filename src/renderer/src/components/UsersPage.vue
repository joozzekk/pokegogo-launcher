<script lang="ts" setup>
import { fetchAllPlayers } from '@renderer/api/endpoints'
import { IUser } from '@renderer/env'
import useUserStore from '@renderer/stores/user-store'
import { format } from 'date-fns'
import { ref, onMounted, watch } from 'vue'

const userStore = useUserStore()

const allPlayers = ref<IUser[]>([])
const isLoadingPlayers = ref<boolean>(true)
const filteredPlayers = ref<IUser[]>([])
const searchQuery = ref('')
const expandedPlayer = ref<IUser | null>(null)
const noResultsVisible = ref(false)

async function loadPlayerData(): Promise<void> {
  isLoadingPlayers.value = true
  const res = await fetchAllPlayers(userStore.user.nickname)

  if (res) {
    allPlayers.value = res
    filteredPlayers.value = [...allPlayers.value]
    noResultsVisible.value = false
    isLoadingPlayers.value = false
  }
}

watch(searchQuery, () => {
  filteredPlayers.value = allPlayers.value.filter((p) =>
    p.nickname.toLowerCase().includes(searchQuery.value.toLowerCase())
  )

  if (!filteredPlayers.value?.length) {
    noResultsVisible.value = true
  } else {
    noResultsVisible.value = false
  }
})

function togglePlayerDetails(uuid: string): void {
  if (expandedPlayer.value?.uuid === uuid) {
    expandedPlayer.value = null
    return
  }
  expandedPlayer.value = allPlayers.value?.find((p) => p.uuid === uuid) ?? null
}

onMounted(async () => {
  await loadPlayerData()
})
</script>

<template>
  <div class="logs-card">
    <div class="search-bar">
      <div class="search-input-wrapper">
        <i class="fas fa-search search-icon"></i>
        <input
          id="searchInput"
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Wyszukaj gracza po nicku lub ID..."
        />
      </div>
    </div>

    <div class="logs-table-wrapper">
      <template v-if="isLoadingPlayers"> Ładowanie użytkowników.. </template>
      <template v-else>
        <div v-if="noResultsVisible" id="noResults" class="no-results">
          <i class="fas fa-search"></i>
          <h3>Brak wyników</h3>
          <p>Nie znaleziono graczy odpowiadających kryteriom wyszukiwania</p>
        </div>
        <table v-else class="logs-table">
          <thead>
            <tr>
              <th>Nick gracza</th>
              <th>ID gracza</th>
              <th>HWID</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody id="logsTableBody">
            <template v-for="player in filteredPlayers" :key="player.uuid">
              <tr>
                <td>
                  <strong>{{ player.nickname }}</strong>
                  <span
                    v-if="player.isBanned"
                    style="
                      background: #ff4757;
                      color: white;
                      padding: 2px 8px;
                      border-radius: 4px;
                      font-size: 0.75rem;
                      font-weight: 500;
                      margin-left: 8px;
                    "
                  >
                    BANNED
                  </span>
                </td>
                <td>
                  {{ player?.uuid ? player.uuid.slice(0, 16) + '...' : '(Brak)' }}
                </td>
                <td style="font-family: monospace; font-size: 0.9rem">
                  {{ player?.machineId ? player.machineId.slice(0, 30) + '...' : '(Brak)' }}
                </td>
                <td>
                  <button class="show-more-btn" @click="togglePlayerDetails(player.uuid)">
                    <i
                      :class="
                        expandedPlayer?.uuid === player.uuid
                          ? 'fas fa-chevron-up'
                          : 'fas fa-chevron-down'
                      "
                    ></i>
                    <span>{{
                      expandedPlayer?.uuid === player.uuid ? 'Ukryj szczegóły' : 'Pokaż więcej'
                    }}</span>
                  </button>
                </td>
              </tr>
              <!-- Expanded details row right after player row -->
              <tr v-if="expandedPlayer?.uuid === player.uuid">
                <td colspan="4" style="padding: 0">
                  <div class="player-details">
                    <div class="player-details-grid">
                      <div class="detail-item">
                        <div class="detail-label">Ostatnie logowanie</div>
                        <div class="detail-value">
                          {{
                            expandedPlayer.lastLoginAt
                              ? format(expandedPlayer.lastLoginAt, 'dd.MM.yyyy, HH:mm:ss')
                              : '(Nieznana)'
                          }}
                        </div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">Data rejestracji</div>
                        <div class="detail-value">
                          {{
                            expandedPlayer.createdAt
                              ? format(expandedPlayer.createdAt, 'dd.MM.yyyy, HH:mm:ss')
                              : '(Nieznana)'
                          }}
                        </div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">Całkowity czas gry</div>
                        <div class="detail-value">
                          {{ expandedPlayer.totalPlayTime ?? '(Nieznany)' }}
                        </div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">IP adres</div>
                        <div class="detail-value">
                          {{ expandedPlayer.ipAddress ?? '(Nieznany)' }}
                        </div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">MAC address</div>
                        <div class="detail-value">
                          {{ expandedPlayer.macAddress ?? '(Nieznany)' }}
                        </div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">Rola</div>
                        <div class="detail-value">{{ expandedPlayer.role ?? '(Nieznana)' }}</div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">Konto</div>
                        <div class="detail-value">
                          {{ expandedPlayer.accountType ?? '(Nieznany)' }}
                        </div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">Status konta</div>
                        <div
                          class="detail-value"
                          :style="{ color: expandedPlayer.isBanned ? '#ff4757' : '#00ff88' }"
                        >
                          {{ expandedPlayer.isBanned ? 'Zbanowany' : 'Aktywny' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </template>
    </div>
  </div>
</template>

<style scoped>
.logs-card {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  animation: fadeInUp 0.8s ease-out 0.2s both;
  position: relative;
}
.logs-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--primary1), var(--primary2));
}
.search-bar {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.search-input-wrapper {
  position: relative;
  flex: 1;
  min-width: 300px;
}
.search-input {
  width: 100%;
  background: var(--bg-input);
  border: 2px solid var(--border-primary);
  border-radius: var(--border-radius-small);
  padding: 16px 20px 16px 50px;
  font-size: 1rem;
  color: var(--text-primary);
  font-family: inherit;
  transition: var(--transition);
  outline: none;
}
.search-input:focus {
  border-color: var(--primary1);
  box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.1);
  background: rgba(26, 26, 31, 1);
}
.search-input::placeholder {
  color: var(--text-muted);
  font-weight: 300;
}
.search-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  transition: var(--transition);
}
.search-input:focus ~ .search-icon {
  color: var(--primary1);
}
.search-btn {
  background: linear-gradient(45deg, var(--primary1), var(--primary2));
  color: var(--bg-primary);
  border: none;
  border-radius: var(--border-radius-small);
  padding: 16px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}
.search-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
}
.logs-table-wrapper {
  max-height: 530px;
  overflow-y: auto;
}
.logs-table {
  width: 100%;
  border-collapse: collapse;
}
.logs-table th {
  background: rgba(26, 26, 31, 1);
  padding: 20px 15px;
  text-align: left;
  font-weight: 600;
  color: var(--primary1);
  border-bottom: 2px solid var(--border-primary);
  position: sticky;
  top: 0;
  z-index: 10;
}
.logs-table td {
  padding: 18px 15px;
  border-bottom: 1px solid var(--border-primary);
  color: var(--text-border);
}

.logs-table tr:hover {
  background: rgba(255, 255, 255, 0.03);
}
.show-more-btn {
  background: linear-gradient(45deg, var(--primary1), var(--primary2));
  color: var(--bg-primary);
  border: none;
  border-radius: var(--border-radius-small);
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 6px;
}
.show-more-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
}
.player-details {
  display: block;
  background: rgba(26, 26, 31, 0.6);
  padding: 20px;
  border-top: 1px solid var(--border-primary);
  animation: slideDown 0.3s ease-out;
}
.player-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}
.detail-item {
  background: var(--bg-input);
  padding: 15px;
  border-radius: var(--border-radius-small);
  border: 1px solid var(--border-primary);
}
.detail-label {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 5px;
  color: rgba(255, 255, 255, 1);
}
.detail-value {
  color: var(--text-primary);
  font-weight: 500;
  color: rgba(255, 255, 255, 0.3);
}
.no-results {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}
.no-results i {
  font-size: 3rem;
  margin-bottom: 15px;
  opacity: 0.5;
}
@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
  to {
    opacity: 1;
    max-height: 530px;
    padding-top: 20px;
    padding-bottom: 20px;
  }
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 768px) {
  .container {
    padding: 15px;
  }
  .search-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .search-input-wrapper {
    min-width: auto;
  }
  .logs-table th,
  .logs-table td {
    padding: 12px 8px;
    font-size: 0.9rem;
  }
  .player-details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
