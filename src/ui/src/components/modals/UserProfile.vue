<!-- eslint-disable @typescript-eslint/no-unused-vars -->
// PlayerProfileModal.vue

<script lang="ts" setup>
import { IUser } from '@ui/env'
import useUserStore from '@ui/stores/user-store'
import { AccountType, UserRole } from '@ui/types/app'
import { differenceInMilliseconds, format, intervalToDuration, parseISO } from 'date-fns'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SkinViewer from '@ui/components/SkinViewer.vue'
import ChangeSkinModal from '@ui/components/modals/ChangeSkinModal.vue'
import ChangeNicknameModal from '@ui/components/modals/ChangeNicknameModal.vue'
import DeleteAccountConfirm from '@ui/components/modals/DeleteAccountConfirm.vue'
import { useChatsStore } from '@ui/stores/chats-store'
import { usePlayersStore } from '@ui/stores/players-store'
import {
  acceptFriendRequest,
  getFriendRequests,
  getFriends,
  rejectFriendRequest,
  removeFriend
} from '@ui/api/endpoints'
import { getHeadUrl, showToast } from '@ui/utils'
import { useUserCacheStore } from '@ui/stores/user-cache-store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'refresh-data', query?: string, reset?: boolean): Promise<void>
  (e: 'ban-player', player: IUser): Promise<void>
  (e: 'unban-player', player: IUser): Promise<void>
  (e: 'reset-password', player: IUser): Promise<void>
  (e: 'delete-account', player: IUser): Promise<void>
}>()

const apiURL = import.meta.env.RENDERER_VITE_API_URL
const skinUrl = computed(() => {
  return `${apiURL}/skins/image/${player.value?.nickname}`
})

const chatsStore = useChatsStore()
const userStore = useUserStore()
const playersStore = usePlayersStore()
const player = computed(() => userStore.selectedProfile)
const friends = ref<IUser[]>([])
const friendRequests = ref<IUser[]>([])
const isFriendsLoading = ref<boolean>(false)
const isFriendRequestsLoading = ref<boolean>(false)

const deleteAccountConfirmRef = ref()

const userCache = useUserCacheStore()

const fetchPlayerFriends = async (opts?: { force?: boolean }): Promise<void> => {
  if (!player.value) return
  try {
    isFriendsLoading.value = true

    const ownerNickname = player.value.nickname

    if (!opts?.force) {
      const cached = userCache.getFriendsCached(ownerNickname)
      if (cached) {
        friends.value = cached
        return
      }
    }

    const result = await getFriends(ownerNickname)
    if (result?.length) {
      const enriched = await Promise.all(
        result.map(async (friend) => ({
          ...friend,
          headUrl: await getHeadUrl(friend)
        }))
      )
      friends.value = enriched
      userCache.cacheFriends(ownerNickname, enriched)
    } else {
      friends.value = []
      userCache.cacheFriends(ownerNickname, [])
    }
  } catch {
    friends.value = []
  } finally {
    isFriendsLoading.value = false
  }
}
const fetchPlayerFriendRequests = async (): Promise<void> => {
  if (!userStore.user) return
  try {
    isFriendRequestsLoading.value = true

    let pending = userStore.user.friendRequests ?? []

    // fallback: jeśli pusto, odśwież profil i spróbuj jeszcze raz
    if (!pending.length) {
      await userStore.updateProfile()
      pending = userStore.user.friendRequests ?? []
    }

    if (!pending.length) {
      friendRequests.value = []
      return
    }

    const result = await getFriendRequests(pending)
    if (result?.length) {
      const enriched = await Promise.all(
        result.map(async (friend) => ({
          ...friend,
          headUrl: await getHeadUrl(friend)
        }))
      )
      friendRequests.value = enriched
    } else {
      friendRequests.value = []
    }
  } catch {
    friendRequests.value = []
  } finally {
    isFriendRequestsLoading.value = false
  }
}

const handleFriendRequestRefresh = async (): Promise<void> => {
  // odświeżaj tylko gdy modal pokazuje profil zalogowanego użytkownika
  if (userStore.user?.nickname && player.value?.nickname === userStore.user.nickname) {
    // micro-debounce, aby backend i userStore zdążyły zaktualizować friendRequests
    requestAnimationFrame(async () => {
      await fetchPlayerFriendRequests()
    })
  }
}

const handleFriendsListRefresh = async (): Promise<void> => {
  if (player.value?.nickname) {
    requestAnimationFrame(async () => {
      await fetchPlayerFriends({ force: true })
    })
  }
}

onMounted(() => {
  window.addEventListener('friends:request-refresh', handleFriendRequestRefresh)
  window.addEventListener('friends:list-refresh', handleFriendsListRefresh)
})

onBeforeUnmount(() => {
  window.removeEventListener('friends:request-refresh', handleFriendRequestRefresh)
  window.removeEventListener('friends:list-refresh', handleFriendsListRefresh)
})

watch(player, async () => {
  if (player.value) {
    timerInterval.value = window.setInterval(() => {
      now.value = new Date()
    }, 1000)

    await fetchPlayerFriends()
    await fetchPlayerFriendRequests()

    window.addEventListener('keydown', handleEscape)
  }
})

const closeModal = (): void => {
  userStore.resetSelectedProfile()
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
  window.removeEventListener('keydown', handleEscape)
}

const changeSkinModalRef = ref()
const openChangeSkinModal = (): void => {
  if (userStore?.user && player.value && userStore.user.uuid === player.value.uuid)
    changeSkinModalRef.value?.openModal()
}

const changeNicknameModalRef = ref()
const openChangeNicknameModal = (): void => {
  if (player.value && isAdmin.value) {
    changeNicknameModalRef.value?.openModal(player.value)
  }
}

const getPlayerID = (player: IUser): string => {
  if (player?.mcid) return player.mcid
  if (player?.uuid) return player.uuid
  return `(${t('modals.userProfile.none')})`
}

const isAdmin = computed(() => {
  const role = userStore.user?.role?.toLowerCase() ?? UserRole.USER
  return [UserRole.OWNER, UserRole.ADMIN, UserRole.DEV, UserRole.DEV_EN, UserRole.MODERATOR, UserRole.MOD].includes(role as UserRole)
})

const isTechnik = computed(() => {
  const role = userStore.user?.role?.toLowerCase() ?? UserRole.USER
  return (role === UserRole.DEV || role === UserRole.DEV_EN) || role === UserRole.OWNER
})

const onlyForAdmin = (player: IUser): boolean => {
  const myRole = userStore.user?.role?.toLowerCase() as UserRole
  if ((myRole === UserRole.DEV || myRole === UserRole.DEV_EN) || myRole === UserRole.OWNER) {
    return true
  }

  const staffRoles = [
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.DEV, UserRole.DEV_EN,
    UserRole.MODERATOR,
    UserRole.MOD,
    UserRole.HELPER,
    UserRole.POMOCNIK
  ]
  return isAdmin.value && !staffRoles.includes(player.role?.toLowerCase() as UserRole)
}

const now = ref(new Date())
const timerInterval = ref<number | undefined>(undefined)

const pad = (num: number): string => String(num).padStart(2, '0')

const formattedBanTime = computed(() => {
  const banEndDateString = player.value?.banEndDate

  if (!banEndDateString) {
    return t('modals.userProfile.perm')
  }

  const banEndDate =
    typeof banEndDateString === 'string' ? parseISO(banEndDateString) : banEndDateString
  const remainingMs = differenceInMilliseconds(banEndDate, now.value)

  if (remainingMs <= 0) {
    return t('modals.userProfile.banEnded')
  }

  const duration = intervalToDuration({
    start: now.value,
    end: banEndDate
  })

  const totalHours = (duration.days || 0) * 24 + (duration.hours || 0)
  const hours = pad(totalHours)
  const minutes = pad(duration.minutes || 0)
  const seconds = pad(duration.seconds || 0)

  return t('modals.userProfile.remaining', { time: `${hours}:${minutes}:${seconds}` })
})

const handleAcceptFriendRequest = async (player: IUser): Promise<void> => {
  try {
    const res = await acceptFriendRequest(player.nickname)

    if (res) {
      await emit('refresh-data')
      await userStore.updateProfile()
      userCache.invalidateFriends(userStore.user!.nickname)
      await fetchPlayerFriends()
      await fetchPlayerFriendRequests()

      await fetchPlayerFriendRequests()

      showToast(
        t('modals.userProfile.friendRequestAccepted', { nickname: player.nickname }),
        'success'
      )
    }
  } catch {
    showToast(
      t('modals.userProfile.friendRequestAcceptFailed', { nickname: player.nickname }),
      'error'
    )
  }
}

const handleRejectFriendRequest = async (player: IUser): Promise<void> => {
  try {
    const res = await rejectFriendRequest(player.nickname)

    if (res) {
      await emit('refresh-data')
      await userStore.updateProfile()
      userCache.invalidateFriends(userStore.user!.nickname)
      await fetchPlayerFriends()
      await fetchPlayerFriendRequests()

      await fetchPlayerFriendRequests()

      showToast(
        t('modals.userProfile.friendRequestRejected', { nickname: player.nickname }),
        'success'
      )
    }
  } catch {
    showToast(
      t('modals.userProfile.friendRequestRejectFailed', { nickname: player.nickname }),
      'error'
    )
  }
}

const handleRemoveFriend = async (playerToRemove: IUser): Promise<void> => {
  try {
    const res = await removeFriend(playerToRemove.nickname)

    if (res) {
      await emit('refresh-data')
      await userStore.updateProfile()

      const ownerNick = player.value?.nickname ?? userStore.user?.nickname
      if (ownerNick) {
        userCache.invalidateFriends(ownerNick)
      }

      await fetchPlayerFriends({ force: true })

      chatsStore.removeActiveChat(playerToRemove)

      chatsStore.removeActiveChat(playerToRemove)

      showToast(
        t('modals.userProfile.friendRemoved', { nickname: playerToRemove.nickname }),
        'success'
      )
    }
  } catch {
    showToast(
      t('modals.userProfile.friendRemoveFailed', { nickname: playerToRemove.nickname }),
      'error'
    )
  }
}

const handleCopy = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text)
}

const handleEscape = (e: KeyboardEvent): void => {
  if (e.key === 'Escape') {
    closeModal()
  }
}

const getIsOnline = (friend: IUser): boolean => {
  const storePlayer = playersStore.allPlayers.find((p) => p.nickname === friend.nickname)
  return storePlayer ? storePlayer.isOnline : friend.isOnline
}

const getIsMcOpened = (friend: IUser): boolean => {
  const storePlayer = playersStore.allPlayers.find((p) => p.nickname === friend.nickname)
  return storePlayer ? storePlayer.isMcOpened : friend.isMcOpened
}

const handleDeleteAccount = (): void => {
  if (!player.value) return
  deleteAccountConfirmRef.value?.openModal(player.value)
}
</script>

<template>
  <div class="modal-container" :class="{ active: player }">
    <div v-if="player" class="modal-overlay" @click="closeModal"></div>
    <Transition name="fade-left">
      <div v-if="player" class="modal-card">
        <Transition name="slide-up">
          <div v-if="player.isBanned" class="ban-status-banner mb-2 w-full!">
            <i class="fas fa-exclamation-triangle"></i>
            <div class="ban-content">
              <div class="ban-header">
                <span class="ban-title">{{ t('modals.userProfile.accountBlocked') }}</span>
                <span class="ban-timer">{{
                  player.banEndDate ? formattedBanTime : t('modals.userProfile.perm')
                }}</span>
              </div>
              <div v-if="player.banReason" class="ban-reason">
                <span class="reason-label">{{ t('modals.userProfile.banReason') }}:</span>
                <span class="reason-text">{{ player.banReason }}</span>
              </div>
            </div>
          </div>
        </Transition>

        <div class="user-profile-header">
          <div class="avatar-container" @click="openChangeSkinModal">
            <SkinViewer :skin="skinUrl" />
            <div class="edit-overlay">
              <i class="fas fa-pen"></i>
            </div>
          </div>

          <div class="user-info">
            <h1 class="username" :style="{ fontSize: player.nickname.length > 12 ? '1.1rem' : player.nickname.length > 9 ? '1.3rem' : '1.5rem' }">
              {{ player.nickname }}
              <i v-if="player.discordId" class="fab fa-discord text-[#5865F2] ml-1 text-[0.8em]" title="Konto Discord połączone"></i>
            </h1>
            <div class="badges">
              <span
                class="role-badge"
                :style="{ background: 'var(--primary)', color: 'var(--text-primary)' }"
              >
                {{ player.role }}
              </span>
            </div>
          </div>

          <div class="header-actions">
            <button class="nav-icon close-btn" @click="closeModal">
              <i class="fa fa-times"></i>
            </button>
          </div>
        </div>

        <div class="user-stats-grid">
          <div class="stat-item">
            <i class="fas fa-clock"></i>
            <span>{{ t('modals.userProfile.lastLogin') }}</span>
            <strong>{{
              player.lastLoginAt ? format(player.lastLoginAt, 'dd.MM.yyyy') : '-'
            }}</strong>
          </div>

          <div class="stat-item">
            <i class="fas fa-calendar-alt"></i>
            <span>{{ t('modals.userProfile.registered') }}</span>
            <strong>{{ player.createdAt ? format(player.createdAt, 'dd.MM.yyyy') : '-' }}</strong>
          </div>

          <div
            v-if="player.machineId"
            class="stat-item click-copy"
            @click="handleCopy(player.machineId)"
          >
            <i class="fas fa-desktop"></i>
            <span>HWID</span>
            <strong>{{ player.machineId.substring(0, 8) }}...</strong>
          </div>
        </div>

        <div v-if="isAdmin && onlyForAdmin(player)" class="admin-actions">
          <h4>{{ t('modals.userProfile.adminActions') }}</h4>
          <div class="action-buttons">
            <button
              v-if="!player?.isBanned"
              class="action-btn danger"
              @click="$emit('ban-player', player)"
            >
              <i class="fas fa-ban"></i> {{ t('modals.userProfile.ban') }}
            </button>
            <button v-else class="action-btn success" @click="$emit('unban-player', player)">
              <i class="fas fa-rotate-left"></i> {{ t('modals.userProfile.unban') }}
            </button>

            <button
              v-if="player?.accountType !== AccountType.MICROSOFT"
              class="action-btn warning"
              @click="$emit('reset-password', player)"
            >
              <i class="fas fa-key"></i> {{ t('modals.userProfile.resetPass') }}
            </button>

            <button class="action-btn info" @click="openChangeNicknameModal">
              <i class="fas fa-user-edit"></i> {{ t('modals.changeNickname.title') }}
            </button>

            <button
              v-if="isTechnik && player?.accountType !== AccountType.MICROSOFT"
              class="action-btn danger highlight"
              @click="handleDeleteAccount"
            >
              <i class="fas fa-trash-alt"></i> {{ t('modals.userProfile.deleteAccount') }}
            </button>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Friend Requests -->
        <template
          v-if="
            player.friendRequests &&
            userStore.user?.nickname === player.nickname &&
            friendRequests.length > 0
          "
        >
          <div class="section-title">
            <h3>{{ t('modals.userProfile.friendRequestsTitle') }}</h3>
            <span class="count">{{ friendRequests.length }}</span>
          </div>

          <div class="friend-requests-list">
            <div v-for="friend in friendRequests" :key="friend.uuid" class="friend-request-item">
              <div class="friend-info">
                <div class="avatar-wrapper">
                  <img :src="friend.headUrl || ''" class="friend-avatar" alt="Avatar" />
                </div>
                <div class="friend-details">
                  <span class="friend-name">{{ friend.nickname }}</span>
                  <span class="friend-role">{{ friend.role || 'Player' }}</span>
                </div>
              </div>
              <div class="request-actions">
                <button
                  class="icon-btn success"
                  title="Accept"
                  @click.stop="handleAcceptFriendRequest(friend)"
                >
                  <i class="fas fa-check"></i>
                </button>
                <button
                  class="icon-btn danger"
                  title="Reject"
                  @click.stop="handleRejectFriendRequest(friend)"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </template>

        <div
          class="section-title"
          :class="{
            'mt-4':
              player.friendRequests &&
              userStore.user?.nickname === player.nickname &&
              friendRequests.length > 0
          }"
        >
          <h3>{{ t('modals.userProfile.friends') }}</h3>
          <span class="count">{{ player.friends?.length || 0 }}</span>
        </div>

        <!-- Friends list -->
        <div class="flex flex-col gap-1 overflow-y-auto overflow-x-hidden pr-1">
          <!-- Skeletons: friends -->
          <div v-if="isFriendsLoading" class="flex flex-col gap-1">
            <div v-for="n in 5" :key="n" class="skeleton-row px-4 py-2 rounded-xl">
              <div class="skeleton-avatar"></div>
              <div class="skeleton-text w-28"></div>
              <div class="skeleton-actions">
                <div class="skeleton-button w-6"></div>
                <div class="skeleton-button w-6"></div>
              </div>
            </div>
          </div>

          <!-- Actual friends -->
          <div v-else-if="player.friends?.length" class="flex flex-col gap-1">
            <div
              v-for="friend in friends"
              :key="friend.uuid"
              class="friend-item"
              @click="userStore.updateSelectedProfile(friend)"
            >
              <div class="friend-info">
                <div class="avatar-wrapper">
                  <img
                    v-if="friend.headUrl"
                    :src="friend.headUrl"
                    class="friend-avatar"
                    alt="Avatar"
                  />
                  <div v-else class="friend-avatar-placeholder">
                    <i class="fas fa-user"></i>
                  </div>
                  <div
                    class="status-indicator"
                    :class="{ online: getIsOnline(friend), offline: !getIsOnline(friend) }"
                    :title="getIsOnline(friend) ? t('users.online') : t('users.offline')"
                  ></div>

                  <div
                    v-if="getIsMcOpened(friend)"
                    class="mc-status-dot"
                    :title="t('users.gameRunning')"
                  >
                    <i class="fas fa-gamepad"></i>
                  </div>
                </div>
                <div class="friend-details">
                  <span class="friend-name">{{ friend.nickname }}</span>
                  <span class="friend-role">{{ friend.role || 'Player' }}</span>
                </div>
              </div>

              <div class="friend-actions">
                <button
                  v-if="userStore.user?.nickname === userStore.selectedProfile?.nickname"
                  class="icon-btn chat"
                  title="Message"
                  @click.stop="
                    () => {
                      chatsStore.addActiveChat(friend)
                      closeModal()
                    }
                  "
                >
                  <i class="fa fa-comment"></i>
                </button>
                <button
                  v-if="userStore.user?.nickname === userStore.selectedProfile?.nickname"
                  class="icon-btn remove"
                  title="Remove Friend"
                  @click.stop="handleRemoveFriend(friend)"
                >
                  <i class="fas fa-user-minus"></i>
                </button>
                <button class="icon-btn view" title="View Profile">
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Empty state for friends -->
          <span v-else class="text-xs text-[var(--text-muted)]">
            {{
              userStore.user && getPlayerID(player) === getPlayerID(userStore.user)
                ? t('modals.userProfile.noFriendsUser')
                : t('modals.userProfile.noFriendsPlayer')
            }}
          </span>
        </div>
      </div>
    </Transition>

    <ChangeSkinModal ref="changeSkinModalRef" />
    <ChangeNicknameModal ref="changeNicknameModalRef" @refresh-data="$emit('refresh-data')" />
    <DeleteAccountConfirm ref="deleteAccountConfirmRef" @refresh-data="$emit('refresh-data')" />
  </div>
</template>

<style scoped>
.modal-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 500;
  pointer-events: none;
}

.modal-container.active {
  pointer-events: auto;
}

.modal-overlay {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.error-message {
  background: var(--text-primary);
  backdrop-filter: blur(10px);
}

.modal-card {
  pointer-events: auto;
  position: absolute;
  top: calc(60px + 1rem); /* Header height (60px) + margin */
  left: 8rem; /* Sidebar width (7rem) + margin (1rem) */
  height: calc(100vh - 60px - 2rem); /* Full height - header - top/bottom margins */
  width: 25vw;
  min-width: 350px;
  padding: 0.75rem 1.5rem; /* Match Sidebar's my-3 (0.75rem) vertical spacing */
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 5px 10px 30px rgba(0, 0, 0, 0.2);
  border-radius: 24px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-left: none;
  transform-origin: left center;
}

/* User Profile Header */
.user-profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
  position: relative;
}

.avatar-container {
  width: 80px;
  height: 80px;
  min-width: 80px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
  background: var(--bg-dark);
}

.avatar-container:hover {
  transform: scale(1.05);
}

.edit-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.avatar-container:hover .edit-overlay {
  opacity: 1;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.username {
  font-size: 1.5rem;
  font-weight: 800;
  max-width: 220px;
  overflow: hidden;
  color: var(--text-primary);
  line-height: 1;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.role-badge,
.status-badge {
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  letter-spacing: 0.5px;
}

.status-badge.banned {
  display: none; /* Removed in favor of banner */
}

/* Ban Status Banner */
.ban-status-banner {
  margin-top: 0.5rem;
  background: var(--gradient-banned);
  border-radius: 12px; /* Slightly less rounded for header look */
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  animation: pulse-glow-banned 2s infinite;
}

.ban-status-banner i {
  font-size: 1.1rem;
  color: white;
}

.ban-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.ban-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ban-title {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  color: white;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.ban-timer {
  font-size: 0.7rem;
  color: white;
  font-weight: 600;
  white-space: nowrap;
}

.ban-reason {
  font-size: 0.6rem;
  display: flex;
  gap: 4px;
}

.reason-label {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 700;
  text-transform: uppercase;
}

.reason-text {
  color: white;
  font-weight: 500;
  word-break: break-all;
}

@keyframes pulse-glow-banned {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.header-actions {
  align-self: flex-start;
}

.nav-icon.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.nav-icon.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

/* Stats Grid */
.user-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.stat-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  position: relative;
  overflow: hidden;
}

.stat-item i {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 1.5rem;
  opacity: 0.1;
  transform: rotate(-15deg);
}

.stat-item span {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 600;
}

.stat-item strong {
  font-size: 1rem;
  color: var(--text-primary);
}

.stat-item.click-copy {
  cursor: pointer;
  transition: background 0.2s;
}

.stat-item.click-copy:active {
  background: rgba(255, 255, 255, 0.05);
}

/* Admin Actions */
.admin-actions {
  margin-bottom: 1.5rem;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  padding: 1rem;
}

.admin-actions h4 {
  color: #ef4444;
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.action-btn.danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.action-btn.danger:hover {
  background: #ef4444;
  color: white;
}

.action-btn.success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.action-btn.success:hover {
  background: #22c55e;
  color: white;
}

.action-btn.warning {
  background: rgba(234, 179, 8, 0.1);
  color: #eab308;
}

.action-btn.warning:hover {
  background: #eab308;
  color: black;
}

.action-btn.info {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.action-btn.info:hover {
  background: #3b82f6;
  color: white;
}

/* Section Dividers */
.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 0 0 1.5rem 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.section-title h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.count {
  background: var(--bg-light);
  color: var(--text-secondary);
  font-size: 0.7rem;
  padding: 0.1rem 0.5rem;
  border-radius: 99px;
  font-weight: 600;
}

/* Friend Requests */
.friend-requests-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.friend-request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* Friends List */
.friend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  margin-bottom: 0.25rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.friend-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}

.friend-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.avatar-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.friend-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  object-fit: cover;
  background: var(--bg-dark);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.friend-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--text-muted);
}

.status-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--bg-card);
  background: #6b7280; /* Default gray */
}

.status-indicator.online {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.status-indicator.offline {
  background: #ef4444;
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

.mc-status-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  background: var(--primary);
  border: 2px solid var(--bg-card);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  color: white;
  box-shadow: 0 0 8px rgba(var(--primary-rgb), 0.4);
  z-index: 2;
}

.mc-status-dot i {
  transform: scale(0.8);
}

.friend-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
}

.friend-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.friend-role {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  opacity: 0.6;
}

.friend-actions {
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.friend-item:hover .friend-actions {
  opacity: 1;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
  transform: translateY(-2px);
}

.icon-btn.chat:hover {
  background: rgba(var(--primary-rgb), 0.2);
  color: var(--primary);
}

.icon-btn.remove:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.icon-btn.view:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Animations */
.fade-left-enter-active,
.fade-left-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-left-enter-from,
.fade-left-leave-to {
  transform: translateX(-15px) scaleX(0.9);
  opacity: 0;
}

/* Scrollbar within modal */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>
