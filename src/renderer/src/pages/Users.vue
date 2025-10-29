<script lang="ts" setup>
import { fetchAllPlayers } from '@renderer/api/endpoints'
import BanPlayerModal from '@renderer/components/modals/BanPlayerModal.vue'
import PasswordResetConfirm from '@renderer/components/modals/PasswordResetConfirm.vue'
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
const passwordResetModalRef = ref()

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
      getPlayerID(p).includes(searchQuery.value.toLowerCase()) ||
      p.machineId?.includes(searchQuery.value.toLowerCase()) ||
      p.macAddress?.includes(searchQuery.value.toLowerCase())
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

const copyToClipboard = (text: string): void => {
  navigator.clipboard.writeText(text)
}

const handleLauncherBan = async (player: IUser): Promise<void> => {
  banPlayerModalRef.value?.openModal(player)
}

const handleLauncherUnban = async (player: IUser): Promise<void> => {
  banPlayerModalRef.value?.openModal(player, 'unban')
}

const handleResetPassword = async (player: IUser): Promise<void> => {
  passwordResetModalRef.value?.openModal(player)
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
    case 'mod':
      return 'Moderator'
    case 'technik':
      return 'Technik'
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
  <div class="users-container">
    <div class="search-input-wrapper mb-2">
      <i class="fas fa-search search-icon !text-[0.9rem] ml-3"></i>
      <input
        v-model="searchQuery"
        type="text"
        class="search-input !p-2 !py-1 !pl-8 !text-[0.8rem]"
        placeholder="Wyszukaj gracza po nicku, UUID/MCID, Machine ID lub Mac adresie..."
      />
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
        <div
          v-if="noResultsVisible"
          id="noResults"
          class="no-results flex items-center justify-center h-full flex-col gap-2"
        >
          <i class="fas fa-search"></i>
          <h3 class="text-lg">Brak wyników</h3>
          <p>Nie znaleziono graczy odpowiadających kryteriom wyszukiwania</p>
        </div>
        <table v-else class="logs-table select-none">
          <thead>
            <tr class="font-black text-[0.9rem]">
              <th>
                Gracz ({{ allPlayers.filter((player) => player.isOnline)?.length }}/{{
                  allPlayers.length
                }})
              </th>
              <th>Rola</th>
              <th>Status</th>
              <th>UUID/MCID</th>
              <th>
                <div style="position: relative; display: flex; flex-direction: row-reverse">
                  <button class="info-btn" @click="loadPlayerData">
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
                  <div class="flex items-center gap-2">
                    <div
                      class="online-dot"
                      :style="{ background: !player?.isOnline ? '#ff4757' : '#00ff88' }"
                    ></div>
                    <strong>{{ player.nickname }}</strong>
                    <span
                      v-if="player.mcid"
                      :style="`
                      background: var(--primary);
                      font-size: 0.6rem;
                      color: white;
                      padding: 2px 6px;
                      border-radius: 4px;
                      font-weight: 800;
                    `"
                    >
                      Premium
                    </span>
                    <span
                      v-if="!player.machineId"
                      :style="`
                      background: var(--text-secondary);
                      font-size: 0.6rem;
                      color: black;
                      padding: 2px 6px;
                      border-radius: 4px;
                      font-weight: 800;
                    `"
                    >
                      Missing HWID
                    </span>
                  </div>
                </td>
                <td>
                  {{ player?.role ? getUserRole(player) : 'Gracz' }}
                </td>
                <td>
                  <span
                    :style="`
                      background: ${player.isBanned ? '#ff4757' : '#00ff88'} ;
                      color: ${player.isBanned ? 'white' : 'black'};
                      font-size: 0.6rem;
                      padding: 2px 6px;
                      border-radius: 4px;
                      font-weight: 800;
                    `"
                  >
                    {{ player.isBanned ? 'Zbanowane' : 'Aktywne' }}
                  </span>
                </td>
                <td>
                  {{ getPlayerID(player) }}
                  <span
                    class="copy-btn"
                    @click="
                      copyToClipboard(
                        player?.mcid ? player.mcid : player?.uuid ? player.uuid : '(brak)'
                      )
                    "
                  >
                    <i class="fa fa-copy" />
                  </span>
                </td>
                <td>
                  <div v-if="userStore.user" class="reverse">
                    <template
                      v-if="
                        ['admin', 'technik', 'mod'].includes(userStore.user.role) &&
                        !['admin', 'technik', 'mod'].includes(player.role)
                      "
                    >
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
                    <button
                      v-if="player?.accountType !== 'microsoft'"
                      class="nav-icon"
                      @click="handleResetPassword(player)"
                    >
                      <i :class="'fas fa-key'"></i>
                    </button>
                    <button class="nav-icon" @click="togglePlayerDetails(getPlayerID(player))">
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
                <td colspan="5" style="padding: 0">
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
                        <div class="detail-label">
                          MAC address
                          <span
                            v-if="expandedPlayer.macAddress"
                            class="copy-btn"
                            @click="copyToClipboard(expandedPlayer?.macAddress)"
                          >
                            <i class="fa fa-copy" />
                          </span>
                        </div>
                        <div class="detail-value">
                          {{
                            expandedPlayer.macAddress?.length
                              ? expandedPlayer.macAddress.substring(0, 16) + '...'
                              : '(Nieznany)'
                          }}
                        </div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">
                          Machine ID
                          <span
                            v-if="expandedPlayer.machineId"
                            class="copy-btn"
                            @click="copyToClipboard(expandedPlayer?.machineId)"
                          >
                            <i class="fa fa-copy" />
                          </span>
                        </div>
                        <div class="detail-value text-wrap overflow-hidden">
                          {{
                            expandedPlayer.machineId?.length
                              ? expandedPlayer.machineId.substring(0, 16) + '...'
                              : '(Nieznany)'
                          }}
                        </div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">IP adres</div>
                        <div class="detail-value">
                          {{
                            expandedPlayer.ipAddress?.length
                              ? expandedPlayer.ipAddress.substring(0, 16) + '...'
                              : '(Nieznany)'
                          }}
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
    <PasswordResetConfirm ref="passwordResetModalRef" />
  </div>
</template>

<style scoped>
.loading-users {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.users-container {
  width: 100%;
  height: calc(100vh - 125px);
  backdrop-filter: blur(20px);
  border-radius: var(--border-radius);
  animation: fadeInUp 0.8s ease-out 0.2s both;
}
.reverse {
  display: flex;
  flex-direction: row-reverse;
  gap: 0.5rem;
}
.logs-table-wrapper {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  position: relative;
  overflow-y: auto;
  border: 1px dashed var(--border);
}
.logs-table {
  width: 100%;
  border-collapse: collapse;
}
.logs-table th {
  background: var(--bg-light);
  padding: 0.5rem 1rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.logs-table td {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
}

.logs-table tr {
  background: var(--bg-card);
}

.logs-table tr:hover {
  background: none;
}

.copy-btn {
  margin-left: 0.4rem;
  font-size: 0.7rem;
  padding: 0.2rem 0.3rem;
  border-radius: 0.3rem;
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.4);
}

.copy-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  color: rgba(255, 255, 255, 0.2);
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

.unban-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
}
.player-details {
  display: block;
  background: var(--bg-card);
  padding: 20px;
  border-top: 1px solid var(--border);
  animation: slideDown 0.3s ease-out;
}
.player-details-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.detail-item {
  background: var(--bg-light);
  padding: 15px;
  border-radius: var(--border-radius-small);
  border: 1px solid var(--border);
}
.detail-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 5px;
}
.detail-value {
  font-weight: 500;
  color: var(--text-primary);
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
