<script lang="ts" setup>
import { fetchAllPlayers } from '@renderer/api/endpoints'
import BanPlayerModal from '@renderer/components/modals/BanPlayerModal.vue'
import { IUser } from '@renderer/env'
import useUserStore from '@renderer/stores/user-store'
import { format } from 'date-fns'
import { ref, onMounted, watch, onUnmounted } from 'vue'

const userStore = useUserStore()

const allPlayers = ref<IUser[]>([])
const isLoadingPlayers = ref<boolean>(true)
const filteredPlayers = ref<IUser[]>([])
const searchQuery = ref('')
const expandedPlayer = ref<IUser | null>(null)
const noResultsVisible = ref(false)
const banPlayerModalRef = ref()

async function loadPlayerData(): Promise<void> {
  isLoadingPlayers.value = true
  if (!userStore.user) return

  const res = await fetchAllPlayers(userStore.user.nickname)

  if (res) {
    allPlayers.value = res
    filteredPlayers.value = [...allPlayers.value]
    noResultsVisible.value = false
    isLoadingPlayers.value = false
  }
}

watch(searchQuery, () => {
  filteredPlayers.value = allPlayers.value.filter(
    (p) =>
      p.nickname.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      getPlayerID(p).includes(searchQuery.value)
  )

  if (!filteredPlayers.value?.length) {
    noResultsVisible.value = true
  } else {
    noResultsVisible.value = false
  }
})

function togglePlayerDetails(uuid: string): void {
  if (expandedPlayer.value && getPlayerID(expandedPlayer.value) === uuid) {
    expandedPlayer.value = null
    return
  }
  expandedPlayer.value = allPlayers.value?.find((p) => getPlayerID(p) === uuid) ?? null
}

const copyUUID = (uuid: string): void => {
  navigator.clipboard.writeText(uuid)
}

const handleLauncherBan = async (player: IUser): Promise<void> => {
  banPlayerModalRef.value?.openModal(player)
}

const handleLauncherUnban = async (player: IUser): Promise<void> => {
  banPlayerModalRef.value?.openModal(player, 'unban')
}

const getPlayerID = (player: IUser): string => {
  if (player?.mcid) return player.mcid
  if (player?.uuid) return player.uuid
  return '(Brak)'
}

const getUserRole = (player: IUser): string => {
  switch (player?.role) {
    case 'admin':
      return 'Admin'
    default:
      return 'Gracz'
  }
}

const refreshPlayerList = ref()

onMounted(async () => {
  await loadPlayerData()
})

onUnmounted(() => {
  clearInterval(refreshPlayerList.value)
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
      <div v-if="isLoadingPlayers" class="loading-users">
        <i :class="'fas fa-spinner fa-spin'"></i>
        Ładowanie użytkowników..
        <button class="btn-primary" style="max-width: 300px" @click="loadPlayerData">
          Odśwież
        </button>
      </div>
      <template v-else>
        <div v-if="noResultsVisible" id="noResults" class="no-results">
          <i class="fas fa-search"></i>
          <h3>Brak wyników</h3>
          <p>Nie znaleziono graczy odpowiadających kryteriom wyszukiwania</p>
        </div>
        <table v-else class="logs-table">
          <thead>
            <tr>
              <th>Nick</th>
              <th>Rola</th>
              <th>ID</th>
              <th>Status konta</th>
              <th>Online?</th>
              <th>
                <div style="position: relative; display: flex; flex-direction: row-reverse">
                  <button class="show-more-btn" @click="loadPlayerData">
                    <i :class="'fas fa-refresh'"></i>
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody id="logsTableBody">
            <template v-for="player in filteredPlayers" :key="getPlayerID(player)">
              <tr>
                <td>
                  <strong>{{ player.nickname }}</strong>
                </td>
                <td>
                  {{ player?.role ? getUserRole(player) : 'Gracz' }}
                </td>
                <td>
                  {{ getPlayerID(player) }}
                  <span
                    class="copy-btn"
                    @click="
                      copyUUID(player?.mcid ? player.mcid : player?.uuid ? player.uuid : '(brak)')
                    "
                  >
                    <i class="fa fa-copy" />
                  </span>
                </td>
                <td style="font-family: monospace; font-size: 0.9rem">
                  <span
                    :style="`
                      background: ${player.isBanned ? '#ff4757' : '#47ff57'} ;
                      color: ${player.isBanned ? 'white' : 'black'};
                      padding: 2px 8px;
                      border-radius: 4px;
                      font-size: 0.75rem;
                      font-weight: 800;
                      margin-left: 8px;
                    `"
                  >
                    {{ player.isBanned ? 'BANNED' : 'ACTIVE' }}
                  </span>
                </td>
                <td>
                  <div style="display: flex; gap: 0.5rem; align-items: center">
                    <div
                      class="online-dot"
                      :style="{ background: !player?.isOnline ? '#ff4757' : '#00ff88' }"
                    ></div>
                    {{ player.isOnline ? 'Online' : 'Offline' }}
                  </div>
                </td>

                <td>
                  <div class="reverse">
                    <template v-if="player?.role !== 'admin'">
                      <button
                        v-if="!player?.isBanned"
                        class="ban-btn"
                        @click="handleLauncherBan(player)"
                      >
                        <i :class="'fas fa-ban'"></i>
                      </button>
                      <button v-else class="unban-btn" @click="handleLauncherUnban(player)">
                        <i :class="'fas fa-rotate-left'"></i>
                      </button>
                    </template>
                    <button class="show-more-btn" @click="togglePlayerDetails(getPlayerID(player))">
                      <i
                        :class="
                          !!expandedPlayer && getPlayerID(expandedPlayer) === getPlayerID(player)
                            ? 'fas fa-chevron-up'
                            : 'fas fa-chevron-down'
                        "
                      ></i>
                    </button>
                  </div>
                </td>
              </tr>
              <!-- Expanded details row right after player row -->
              <tr v-if="!!expandedPlayer && getPlayerID(expandedPlayer) === getPlayerID(player)">
                <td colspan="6" style="padding: 0">
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
    <BanPlayerModal ref="banPlayerModalRef" @refresh-data="loadPlayerData" />
  </div>
</template>

<style scoped>
.loading-users {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  height: 80%;
}
.logs-card {
  width: 100%;
  height: calc(100vh - 2.5rem - 65px);
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  animation: fadeInUp 0.8s ease-out 0.2s both;
  position: relative;
}
.search-bar {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
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
  padding: 0.8rem 1rem 0.8rem 2.5rem;
  font-size: 0.8rem;
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
.reverse {
  display: flex;
  flex-direction: row-reverse;
  gap: 0.5rem;
}
.search-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
}
.logs-table-wrapper {
  width: 100%;
  height: 100%;
  overflow-y: auto;
}
.logs-table {
  width: 100%;
  margin-bottom: 6rem;
  border-collapse: collapse;
}
.logs-table th {
  background: rgba(26, 26, 31, 1);
  padding: 0.5rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--primary1);
  border-bottom: 2px solid var(--border-primary);
  position: sticky;
  top: 0;
  z-index: 10;
}
.logs-table td {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-primary);
  color: var(--text-border);
}

.logs-table tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

.copy-btn {
  margin-left: 0.4rem;
  padding: 0.2rem;
  border-radius: 0.1rem;
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.4);
}

.copy-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  color: rgba(255, 255, 255, 0.2);
}

.show-more-btn {
  background: linear-gradient(45deg, var(--primary1), var(--primary2));
  color: var(--bg-primary);
  border: none;
  border-radius: var(--border-radius-small);
  padding: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 6px;
}

.online-dot {
  bottom: 4px;
  right: -2px;
  width: 12px;
  height: 12px;
  border: 2px solid var(--bg-dark);
  border-radius: 50%;
}

.unban-btn {
  background: rgba(0, 255, 0, 0.6);
  color: var(--bg-primary);
  border: none;
  border-radius: var(--border-radius-small);
  padding: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 6px;
  color: lightgreen;
}

.ban-btn {
  background: rgba(255, 0, 0, 0.3);
  color: var(--bg-primary);
  border: none;
  border-radius: var(--border-radius-small);
  padding: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 6px;
  color: red;
}
.unban-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
}
.ban-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 15px rgba(255, 0, 0, 0.3);
}
.show-more-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 15px rgba(0, 136, 255, 0.3);
}
.player-details {
  display: block;
  background: rgba(26, 26, 31, 0.6);
  padding: 20px;
  border-top: 1px solid var(--border-primary);
  animation: slideDown 0.3s ease-out;
}
.player-details-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
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
  .search-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .search-input-wrapper {
    min-width: auto;
  }
  .player-details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
