<script lang="ts" setup>
import { fetchAllPlayers, removeUser } from '@ui/api/endpoints'
import BanPlayerModal from '@ui/components/modals/BanPlayerModal.vue'
import PasswordResetConfirm from '@ui/components/modals/PasswordResetConfirm.vue'
import { IUser } from '@ui/env'
import useUserStore from '@ui/stores/user-store'
import { AccountType, SearchKeyWord, UserRole } from '@ui/types/app'
import { showToast } from '@ui/utils'
import { format } from 'date-fns'
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'

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

  const res = await fetchAllPlayers()

  if (res) {
    allPlayers.value = res
    filteredPlayers.value = [...allPlayers.value]
    noResultsVisible.value = false
    isLoadingPlayers.value = false
  }
}

const currentPage = ref(1)
const itemsPerPage = ref(11)

const totalPages = computed(() => Math.ceil(filteredPlayers.value.length / itemsPerPage.value))

const paginatedPlayers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredPlayers.value.slice(start, end)
})

watch(searchQuery, () => {
  currentPage.value = 1
  const query = searchQuery.value.toLowerCase().trim()

  let players = [...allPlayers.value]

  if (query === SearchKeyWord.BANNED) {
    players = players.filter((p) => p.isBanned)
  } else if (query === SearchKeyWord.PREMIUM) {
    players = players.filter((p) => p.mcid && p.mcid.length > 0)
  } else if (query === SearchKeyWord.NOHWID) {
    players = players.filter((p) => !p.machineId)
  } else if (query === SearchKeyWord.ONLINE) {
    players = players.filter((p) => p.isOnline)
  } else if (query.startsWith(SearchKeyWord.ROLE)) {
    const roleName = query.split(':')[1]
    players = players.filter((p) => p.role?.toLowerCase() === roleName)
  } else {
    players = players.filter(
      (p) =>
        p.nickname.toLowerCase().includes(query) ||
        getPlayerID(p).includes(query) ||
        p.machineId?.toLowerCase().includes(query) ||
        p.macAddress?.toLowerCase().includes(query)
    )
  }

  filteredPlayers.value = players
  noResultsVisible.value = players.length === 0
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
    case UserRole.ADMIN:
      return 'Admin'
    case UserRole.MODERATOR:
      return 'Mod'
    case UserRole.DEV:
      return 'Technik'
    default:
      return 'Gracz'
  }
}

const handleDeletePlayer = async (player: IUser): Promise<void> => {
  try {
    const res = await removeUser(player?.mcid?.length ? player.mcid : player.uuid!)

    if (res) {
      await loadPlayerData()

      showToast(`Gracz ${player.nickname} został usunięty`, 'success')
    }
  } catch {
    showToast(`Nie udało się usunąć gracza ${player.nickname}`, 'error')
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
        placeholder="Wyszukaj gracza po nicku, UUID/MCID, Machine ID lub Mac adresie lub słowach kluczowych: banned, premium, nohwid, online, role:rola..."
      />
    </div>

    <div class="logs-table-wrapper">
      <div v-if="isLoadingPlayers" class="loading-users">
        <i :class="'fas fa-spinner fa-spin'"></i>
        Ładowanie użytkowników..
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
              <th>Nick</th>
              <th>Rola</th>
              <th>Status</th>
              <th>UUID/MCID</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="logsTableBody">
            <template v-for="player in paginatedPlayers" :key="getPlayerID(player)">
              <tr :class="{ '!bg-red-500/10 hover:!bg-red-500/20': player.isBanned }">
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
                        [UserRole.ADMIN, UserRole.DEV, UserRole.MODERATOR].includes(
                          userStore.user.role
                        ) &&
                        ![UserRole.ADMIN, UserRole.DEV, UserRole.MODERATOR].includes(player.role)
                      "
                    >
                      <button class="nav-icon" @click="handleDeletePlayer(player)">
                        <i class="fa fa-trash" />
                      </button>

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
                      v-if="player?.accountType !== AccountType.MICROSOFT"
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
              <tr v-if="!!expandedPlayer && getPlayerID(expandedPlayer) === getPlayerID(player)">
                <td colspan="5" style="padding: 0">
                  <div class="player-details">
                    <div class="player-details-grid">
                      <div class="detail-item">
                        <div class="detail-label">Powód blokady</div>
                        <div class="detail-value">
                          {{ expandedPlayer.banReason }}
                        </div>
                      </div>
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
      <div v-if="totalPages > 1" class="pagination-controls">
        <button :disabled="currentPage === 1" class="pag-btn" @click="currentPage--">
          <i class="fas fa-chevron-left"></i>
        </button>

        <span class="pag-info">
          Strona <strong>{{ currentPage }}/{{ totalPages }}</strong>
        </span>

        <button :disabled="currentPage === totalPages" class="pag-btn" @click="currentPage++">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
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
  height: calc(100vh - 115px);
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
  background: var(--bg-body);
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

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-body);
  border-top: 1px solid var(--border);
  position: sticky;
  bottom: 0;
}

.pag-btn {
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.pag-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pag-btn:not(:disabled):hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.pag-info {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.pag-info strong {
  color: var(--text-primary);
}
</style>
