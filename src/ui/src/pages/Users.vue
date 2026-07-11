<script lang="ts" setup>
import {
  acceptFriendRequest,
  cancelFriendRequest,
  rejectFriendRequest,
  removeFriend,
  requestFriend
} from '@ui/api/endpoints'
import { IUser } from '@ui/env'
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import { AccountType, UserRole } from '@ui/types/app'
import { useSocketService } from '@ui/services/socket-service'
import { showToast } from '@ui/utils'
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const pollInterval = ref<ReturnType<typeof setInterval> | null>(null)

const props = defineProps<{
  filteredPlayers: IUser[]
  hasMorePlayers: boolean
  isLoadingPlayers: boolean
  allPlayers: IUser[]
  itemsPerPage: number
}>()

const emit = defineEmits<{
  (e: 'fetch-players', query?: string, reset?: boolean): Promise<void>
  (e: 'refresh-data', query?: string, reset?: boolean): Promise<void>
  (e: 'update-limit', limit: number): Promise<void>
  (e: 'ban-player', player: IUser): Promise<void>
  (e: 'unban-player', player: IUser): Promise<void>
  (e: 'reset-password', player: IUser): Promise<void>
}>()

const generalStore = useGeneralStore()
const userStore = useUserStore()
const { emit: emitSocket } = useSocketService()

const handleKillPlayerGame = (player: IUser): void => {
  emitSocket('admin:kill-player-game', { targetNickname: player.nickname })
  showToast(`${t('users.toasts.killGameSent')} ${player.nickname}`, 'info')
}

const filterGroups = [
  {
    label: 'Status',
    filters: [
      { label: 'Online', value: 'q:online', icon: 'fas fa-signal' },
      { label: 'W grze', value: 'q:ingame', icon: 'fas fa-gamepad' },
      { label: 'Offline', value: 'q:offline', icon: 'fas fa-power-off' },
      { label: 'Zbanowani', value: 'q:banned', icon: 'fas fa-ban' }
    ]
  },
  {
    label: 'Hardware',
    filters: [
      { label: 'No HWID', value: 'q:nohwid', icon: 'fas fa-user-slash' },
      { label: 'Multi 2+', value: 'q:hwid>1', icon: 'fas fa-user-friends' },
      { label: 'Multi 3+', value: 'q:hwid>2', icon: 'fas fa-users' },
      { label: 'Multi 4+', value: 'q:hwid>3', icon: 'fas fa-layer-group' }
    ]
  },
  {
    label: 'Account Type',
    filters: [
      { label: 'Microsoft', value: 'q:microsoft', icon: 'fab fa-microsoft' },
      { label: 'Standard', value: 'q:standard', icon: 'fas fa-user' }
    ]
  }
]

const allFilters = filterGroups.flatMap((group) => group.filters)

const activeFilters = ref<string[]>([])

const toggleFilter = async (filterValue: string): Promise<void> => {
  // Toggle the specific filter in the active list
  if (activeFilters.value.includes(filterValue)) {
    activeFilters.value = activeFilters.value.filter((f) => f !== filterValue)
  } else {
    activeFilters.value.push(filterValue)
  }

  // Regex to identify any "special" server filter or custom prefix
  const serverFilterRegex =
    /^q:(online|offline|ingame|banned|nohwid|microsoft|standard|hwid[><= ]{1,2}\d+)|(role|ip|email|id|hwid):[^\s]+$/i

  // Strip all matching keywords from current query
  const remainingParts = searchQuery.value
    .split(/\s+/)
    .filter((part) => !serverFilterRegex.test(part))

  // Re-append all currently active chips
  searchQuery.value = [...remainingParts, ...activeFilters.value].join(' ').trim()

  generalStore.searchQuery = searchQuery.value
  await emit('refresh-data', searchQuery.value, true)
}

const isFilterActive = (filterValue: string): boolean => activeFilters.value.includes(filterValue)

const clearAllFilters = async (): Promise<void> => {
  activeFilters.value = []
  const serverFilterRegex =
    /^q:(online|offline|ingame|banned|nohwid|microsoft|standard|hwid[><= ]{1,2}\d+)|(role|ip|email|id|hwid):[^\s]+$/i
  const remainingParts = searchQuery.value
    .split(/\s+/)
    .filter((part) => !serverFilterRegex.test(part))
  searchQuery.value = remainingParts.join(' ').trim()
  generalStore.searchQuery = searchQuery.value
  await emit('refresh-data', searchQuery.value, true)
}

const showInstruction = ref(false)

const searchQuery = ref<string>(generalStore.searchQuery ?? '')
const observerTarget = ref<HTMLElement | null>(null)

// Watch for manual search query changes to sync chips
watch(searchQuery, (newQuery) => {
  const queryParts = newQuery.split(/\s+/)
  const matched: string[] = []

  allFilters.forEach((f) => {
    // For exact match filters
    if (queryParts.some((p) => p.toLowerCase() === f.value.toLowerCase())) {
      matched.push(f.value)
      return
    }
  })

  activeFilters.value = matched
})

let observer: IntersectionObserver | null = null

const debounce = (func: () => void | Promise<void>, delay: number) => {
  let timeout: ReturnType<typeof setTimeout>

  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(func, delay)
  }
}

const debounceSearchInput = debounce(async () => {
  generalStore.searchQuery = searchQuery.value
  await emit('refresh-data', searchQuery.value, true)
}, 500)

const handleSearchInput = (): void => {
  debounceSearchInput()
}

const getPlayerID = (player: IUser): string => {
  if (player?.mcid) return player.mcid
  if (player?.uuid) return player.uuid
  return t('users.none')
}

const handleRequestFriend = async (player: IUser): Promise<void> => {
  try {
    const res = await requestFriend(player.nickname)

    if (res) {
      await emit('fetch-players', searchQuery.value, true)
      await userStore.updateProfile()

      showToast(`${t('users.toasts.inviteSent')} ${player.nickname}`, 'success')
    }
  } catch {
    showToast(`${t('users.toasts.inviteFailed')} ${player.nickname}`, 'error')
  }
}

const handleCancelRequest = async (player: IUser): Promise<void> => {
  try {
    const res = await cancelFriendRequest(player.nickname)
    if (res) {
      await emit('fetch-players', searchQuery.value, true)
      await userStore.updateProfile()

      showToast(`${t('users.toasts.inviteCancelled')} ${player.nickname}`, 'success')
    }
  } catch {
    showToast(`${t('users.toasts.inviteCancelFailed')} ${player.nickname}`, 'error')
  }
}

const handleRemoveFriend = async (player: IUser): Promise<void> => {
  try {
    const res = await removeFriend(player.nickname)

    if (res) {
      await emit('fetch-players', searchQuery.value, true)
      await userStore.updateProfile()

      showToast(`${t('users.toasts.friendRemoved')} ${player.nickname}`, 'success')
    }
  } catch {
    showToast(`${t('users.toasts.friendRemoveFailed')} ${player.nickname}`, 'error')
  }
}

const handleOpenUserProfile = (player: IUser): void => {
  userStore.updateSelectedProfile(player)
}

const isMod = computed(() => {
  const role = userStore.user?.role?.toLowerCase() ?? UserRole.USER
  return [UserRole.OWNER, UserRole.ADMIN, UserRole.MODERATOR, UserRole.MOD, UserRole.DEV, UserRole.DEV_EN].includes(role as UserRole)
})

const isFriend = (player: IUser): boolean => !!userStore.user?.friends?.includes(player.nickname)

const hasFriendRequestFromMe = (player: IUser): boolean =>
  !!player?.friendRequests?.includes(userStore.user?.nickname ?? '')

const hasFriendRequestFromPlayer = (player: IUser): boolean =>
  !!userStore.user?.friendRequests?.includes(player.nickname)

const handleAcceptFriendRequest = async (player: IUser): Promise<void> => {
  try {
    const res = await acceptFriendRequest(player.nickname)

    if (res) {
      await emit('refresh-data', searchQuery.value, true)
      await userStore.updateProfile()

      showToast(`${t('users.toasts.inviteAccepted')} ${player.nickname}`, 'success')
    }
  } catch {
    showToast(`${t('users.toasts.inviteAcceptFailed')} ${player.nickname}`, 'error')
  }
}

const handleRejectFriendRequest = async (player: IUser): Promise<void> => {
  try {
    const res = await rejectFriendRequest(player.nickname)

    if (res) {
      await emit('refresh-data')
      await userStore.updateProfile()

      showToast(`${t('users.toasts.inviteRejected')} ${player.nickname}`, 'success')
    }
  } catch {
    showToast(`${t('users.toasts.inviteRejectFailed')} ${player.nickname}`, 'error')
  }
}

const handleUsersListRefresh = async (): Promise<void> => {
  await emit('fetch-players', searchQuery.value, true)
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const startPolling = () => {
  if (pollInterval.value) clearInterval(pollInterval.value)
  pollInterval.value = setInterval(async () => {
    if (!props.isLoadingPlayers) {
      await emit('fetch-players', searchQuery.value, true)
    }
  }, 60000) // Poll every 60 seconds
}

onMounted(async () => {
  await emit('fetch-players', searchQuery.value, true)
  startPolling()

  window.addEventListener('users:list-refresh', handleUsersListRefresh)

  observer = new IntersectionObserver(
    (entries) => {
      const target = entries[0]
      if (target.isIntersecting && props.hasMorePlayers && !props.isLoadingPlayers) {
        emit('fetch-players', searchQuery.value)
      }
    },
    {
      root: document.querySelector('.scroll-container'),
      rootMargin: '300px',
      threshold: 0.1
    }
  )

  nextTick(() => {
    if (observerTarget.value) {
      observer?.observe(observerTarget.value)
    }
  })
})

onUnmounted(() => {
  if (observer) observer.disconnect()
  if (pollInterval.value) clearInterval(pollInterval.value)
  window.removeEventListener('users:list-refresh', handleUsersListRefresh)
})
</script>

<template>
  <div class="players-page-container">
    <div class="relative flex flex-col w-full flex-1 min-h-0">
      <div class="players-header flex items-center justify-between gap-4 mb-6">
        <div class="search-bar">
          <i class="fas fa-search"></i>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('users.searchPlaceholder')"
            @input="handleSearchInput"
          />
        </div>

        <div class="header-actions">
          <button v-if="isMod" class="info-btn" @click="showInstruction = !showInstruction">
            <i class="fas fa-terminal"></i>
          </button>
        </div>

        <Transition name="fade-slide">
          <div v-if="showInstruction" class="instruction-panel">
            <div class="instruction-header">
              <h3>{{ t('users.keywords.title') }}</h3>
              <button class="close-instruction" @click="showInstruction = false">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="instruction-content">
              <div class="keyword-item">
                <code>q:hwid</code> <span>{{ t('users.keywords.hwid') }}</span>
              </div>
              <div class="keyword-item">
                <code>q:nohwid</code> <span>{{ t('users.keywords.nohwid') }}</span>
              </div>
              <div class="keyword-item">
                <code>q:hwid>x</code> <span>{{ t('users.keywords.hwidCount') }}</span>
              </div>
              <div class="keyword-item">
                <code>hwid:[hwid]</code> <span>{{ t('users.keywords.hwidSpecific') }}</span>
              </div>
              <div class="keyword-item">
                <code>q:banned</code> <span>{{ t('users.keywords.banned') }}</span>
              </div>
              <div class="keyword-item">
                <code>q:online</code> <span>{{ t('users.keywords.online') }}</span>
              </div>
              <div class="keyword-item"><code>role:admin</code> <span>Filter by role</span></div>
              <div class="keyword-item">
                <code>ip:1.2.3.4</code> <span>Filter by IP address</span>
              </div>
              <div class="keyword-item">
                <code>email:test@gg.pl</code> <span>Filter by email</span>
              </div>
              <div class="keyword-item"><code>id:uuid</code> <span>Filter by UUID/MCID</span></div>
            </div>
            <div class="instructions-section">
              <h4>Tips</h4>
              <div class="keywords-grid">
                <div class="keyword-item">
                  <span>Combine filters for precision: <code>q:online q:hwid>1</code></span>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <div class="filter-section mb-6">
        <div class="filter-header">
          <h4>{{ t('users.filters.title') }}</h4>
          <button
            v-if="activeFilters.length > 0"
            class="clear-filters-btn"
            @click="clearAllFilters"
          >
            <i class="fas fa-times-circle"></i>
            {{ t('users.filters.clearAll') }}
          </button>
        </div>

        <div class="filter-controls-row">
          <div class="filter-groups">
            <div v-for="group in filterGroups" :key="group.label" class="filter-group">
              <span class="group-label">{{ group.label }}</span>
              <div class="filter-chips-wrapper">
                <button
                  v-for="filter in group.filters"
                  :key="filter.value"
                  class="filter-chip"
                  :class="{ active: isFilterActive(filter.value) }"
                  @click="toggleFilter(filter.value)"
                >
                  <i :class="filter.icon"></i>
                  <span>{{ filter.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="pagination-limit-selector">
            <span class="limit-label">{{ t('users.showMax', 'Pokazuj max:') }}</span>
            <div class="limit-dropdown-wrapper">
              <select
                :value="itemsPerPage"
                class="limit-select"
                @change="(e) => $emit('update-limit', parseInt((e.target as any).value))"
              >
                <option :value="-1">{{ t('users.limitAll', 'Wszystkie') }}</option>
                <option :value="100">100</option>
                <option :value="50">50</option>
                <option :value="25">25</option>
                <option :value="10">10</option>
              </select>
              <i class="fas fa-chevron-down select-icon"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="players-scroll-container scroll-container">
        <TransitionGroup
          v-if="filteredPlayers.length > 0"
          name="list"
          tag="div"
          class="players-grid"
        >
          <article
            v-for="player in filteredPlayers"
            :key="player.nickname"
            class="player-card"
            :class="{ 'is-banned': player.isBanned }"
            @click="handleOpenUserProfile(player)"
          >
            <div class="player-card-inner">
              <div class="player-avatar-wrapper">
                <img
                  v-if="player.headUrl"
                  :src="player.headUrl"
                  class="player-avatar-img"
                  alt="Avatar"
                />
                <div v-else class="player-avatar-placeholder">
                  <i class="fas fa-user"></i>
                </div>

                <div v-if="player.isBanned" class="banned-overlay">
                  <i class="fas fa-gavel"></i>
                </div>

                <div v-if="player.isOnline" class="online-indicator"></div>

                <div
                  v-if="!player.machineId"
                  class="no-hwid-badge-avatar"
                  :title="t('users.keywords.nohwid')"
                >
                  <i class="fas fa-microchip"></i>
                </div>

                <div
                  v-if="player.isMcOpened"
                  class="mc-opened-indicator"
                  :title="t('users.gameRunning')"
                >
                  <i class="fas fa-gamepad"></i>
                </div>
              </div>

              <div class="player-card-info">
                <h2 class="player-nickname">
                  {{ player.nickname }}
                  <i v-if="player.discordId" class="fab fa-discord text-[#5865F2] ml-1 text-sm" title="Konto Discord połączone"></i>
                </h2>
                <div class="flex items-center gap-2 justify-center flex-wrap">
                  <span class="player-role-label">{{ player.role }}</span>
                  <span
                    v-if="player.machineId && (player.hwidAccountCount ?? 0) > 1"
                    class="shared-hwid-badge"
                    :title="`${player.hwidAccountCount} accounts sharing this HWID`"
                  >
                    <i class="fas fa-users-cog"></i>
                    <span>{{ player.hwidAccountCount }} ACCOUNTS</span>
                  </span>
                </div>
              </div>

              <div class="player-card-actions" @click.stop>
                <div class="action-group">
                  <template
                    v-if="
                      userStore.user &&
                      !player.isBanned &&
                      getPlayerID(player) !== getPlayerID(userStore.user)
                    "
                  >
                    <button
                      v-if="
                        !isFriend(player) &&
                        !hasFriendRequestFromMe(player) &&
                        !hasFriendRequestFromPlayer(player)
                      "
                      class="card-action-btn"
                      :title="t('users.requestFriend')"
                      @click="handleRequestFriend(player)"
                    >
                      <i class="fas fa-user-plus"></i>
                    </button>
                    <button
                      v-if="hasFriendRequestFromMe(player)"
                      class="card-action-btn warning"
                      :title="t('users.cancelRequest')"
                      @click="handleCancelRequest(player)"
                    >
                      <i class="fas fa-user-clock"></i>
                    </button>
                    <button
                      v-if="!isFriend(player) && hasFriendRequestFromPlayer(player)"
                      class="card-action-btn success"
                      :title="t('users.acceptFriend')"
                      @click="handleAcceptFriendRequest(player)"
                    >
                      <i class="fas fa-check"></i>
                    </button>
                    <button
                      v-if="!isFriend(player) && hasFriendRequestFromPlayer(player)"
                      class="card-action-btn danger"
                      :title="t('users.rejectFriend')"
                      @click="handleRejectFriendRequest(player)"
                    >
                      <i class="fas fa-times"></i>
                    </button>
                    <button
                      v-if="isFriend(player)"
                      class="card-action-btn danger"
                      :title="t('users.removeFriend')"
                      @click="handleRemoveFriend(player)"
                    >
                      <i class="fas fa-user-minus"></i>
                    </button>
                  </template>
                </div>

                <div
                  v-if="
                    isMod &&
                    (
                      [UserRole.DEV, UserRole.DEV_EN, UserRole.OWNER].includes(userStore.user?.role?.toLowerCase() as UserRole) ||
                      ![UserRole.OWNER, UserRole.ADMIN, UserRole.DEV, UserRole.DEV_EN, UserRole.MODERATOR, UserRole.MOD].includes(
                        player.role?.toLowerCase() as UserRole
                      )
                    )
                  "
                  class="action-group mod-actions"
                >
                  <button
                    v-if="!player?.isBanned"
                    class="card-action-btn danger"
                    title="Ban Player"
                    @click="$emit('ban-player', player)"
                  >
                    <i class="fas fa-ban"></i>
                  </button>
                  <button
                    v-else
                    class="card-action-btn success"
                    title="Unban Player"
                    @click="$emit('unban-player', player)"
                  >
                    <i class="fas fa-undo"></i>
                  </button>
                  <button
                    v-if="player?.accountType !== AccountType.MICROSOFT"
                    class="card-action-btn"
                    title="Reset Password"
                    @click="$emit('reset-password', player)"
                  >
                    <i class="fas fa-key"></i>
                  </button>
                </div>

                <!-- Technical actions (visible even for staff targets) -->
                <div
                  v-if="((userStore.user?.role === UserRole.DEV || userStore.user?.role === UserRole.DEV_EN) || userStore.user?.role === UserRole.OWNER) && player.isMcOpened"
                  class="action-group tech-actions"
                >
                  <button
                    class="card-action-btn danger"
                    :title="t('users.killGame')"
                    @click="handleKillPlayerGame(player)"
                  >
                    <i class="fas fa-stop-circle"></i>
                  </button>
                </div>
              </div>
            </div>
          </article>
        </TransitionGroup>

        <div ref="observerTarget" class="w-full py-4 flex justify-center items-center h-20 mt-2">
          <div v-if="isLoadingPlayers" class="flex flex-col items-center gap-2">
            <i class="fas fa-circle-notch fa-spin text-2xl text-[var(--primary)]"></i>
            <span class="text-xs opacity-70">{{ t('users.loading') }}</span>
          </div>
          <div v-if="!hasMorePlayers" class="flex flex-col items-center gap-2">
            <span class="text-xs opacity-70">{{ t('users.endOfResults') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 1.25rem;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.filter-controls-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  flex-wrap: wrap;
}

.filter-groups {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.pagination-limit-selector {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 170px;
}

.limit-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  padding-left: 2px;
}

.limit-dropdown-wrapper {
  position: relative;
  width: 100%;
}

.limit-select {
  appearance: none;
  background: #141419;
  border: 1.5px solid #ff4081;
  border-radius: 12px;
  padding: 0.6rem 2.5rem 0.6rem 1rem;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  transition: all 0.2s ease;
}

.limit-select:hover {
  background: #1a1a22;
  box-shadow: 0 0 15px rgba(255, 64, 129, 0.2);
}

.select-icon {
  position: absolute;
  right: 1.1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 0.8rem;
  color: #fff;
}

.limit-select option {
  background: var(--bg-card);
  color: var(--text-primary);
}

.select-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.players-page-container {
  padding: 1.5rem 2rem;
  width: 100%;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.players-header {
  position: relative;
  z-index: 10;
}

.search-bar {
  flex: 1;
  max-width: 400px;
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 0.25rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s;
}

.search-bar:focus-within {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(var(--primary-rgb), 0.3);
  box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.1);
}

.search-bar i {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.search-bar input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 0.9rem;
  width: 100%;
  padding: 0.6rem 0;
}

.search-bar input:focus {
  outline: none;
}

.info-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1.2rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.info-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.instruction-panel {
  position: absolute;
  top: calc(100% + 15px);
  right: 0;
  width: 320px;
  background: var(--bg-card);
  backdrop-filter: blur(24px);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.instruction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.instruction-header h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--primary);
}

.close-instruction {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.keyword-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.keyword-item code {
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--primary);
  font-family: inherit;
  font-weight: 700;
}

.players-scroll-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1.5rem;
}

.player-card {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.player-card:hover {
  transform: translateY(-6px);
  border-color: rgba(var(--primary-rgb), 0.3);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}

.player-card.is-banned {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.2);
}

.player-card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.2rem;
}

.player-avatar-wrapper {
  position: relative;
  width: 90px;
  height: 90px;
}

.player-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 28px;
  object-fit: cover;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s;
}

.player-card:hover .player-avatar-img {
  transform: scale(1.05) rotate(2deg);
}

.player-avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--text-secondary);
}

.online-indicator {
  position: absolute;
  bottom: 0px;
  right: 0px;
  width: 14px;
  height: 14px;
  background: #22c55e;
  border: 3px solid var(--bg-card);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
}

.mc-opened-indicator {
  position: absolute;
  top: 0px;
  right: 0px;
  width: 24px;
  height: 24px;
  background: var(--primary);
  border: 2px solid var(--bg-card);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.7rem;
  box-shadow: 0 4px 10px rgba(var(--primary-rgb), 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.banned-overlay {
  position: absolute;
  inset: 0;
  background: rgba(239, 68, 68, 0.4);
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.8rem;
  border: 2px solid #ef4444;
}

.player-card-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.player-nickname {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
}

.player-role-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  opacity: 0.6;
}

.no-hwid-badge-avatar i {
  font-size: 0.6rem;
}

.shared-hwid-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.45rem;
  background: rgba(var(--primary-rgb), 0.1);
  border: 1px solid rgba(var(--primary-rgb), 0.2);
  border-radius: 6px;
  color: var(--primary);
  font-size: 0.5rem;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.shared-hwid-badge i {
  font-size: 0.55rem;
}

.no-hwid-badge-avatar {
  position: absolute;
  bottom: -4px;
  left: -4px;
  width: 24px;
  height: 24px;
  background: #eab308;
  border: 2px solid var(--bg-card);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-size: 0.7rem;
  box-shadow: 0 0 10px rgba(234, 179, 8, 0.4);
  z-index: 5;
}

.player-card-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s;
}

.player-card:hover .player-card-actions {
  opacity: 1;
  transform: translateY(0);
}

.action-group {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.card-action-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.card-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  transform: scale(1.1);
}

.card-action-btn.success:hover {
  background: #22c55e;
  color: white;
}
.card-action-btn.danger:hover {
  background: #ef4444;
  color: white;
}
.card-action-btn.warning:hover {
  background: #eab308;
  color: black;
}

.filter-section {
  margin-bottom: 1rem;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.filter-header h4 {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.clear-filters-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-filters-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.filter-groups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.group-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  opacity: 0.7;
  min-width: 80px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.filter-chips-wrapper {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex: 1;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  white-space: nowrap;
}

.filter-chip i {
  font-size: 0.65rem;
}

.filter-chip:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.1);
}

.filter-chip.active {
  background: rgba(var(--primary-rgb), 0.1);
  border-color: rgba(var(--primary-rgb), 0.3);
  color: var(--primary);
  box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.15);
}

.filter-chip.active i {
  color: var(--primary);
}

.filter-chip i {
  font-size: 0.85rem;
  opacity: 0.7;
  transition: all 0.2s;
}

.filter-chip:hover i {
  opacity: 1;
}

/* Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
```
