// PlayerProfileModal.vue

<script lang="ts" setup>
import { IUser } from '@ui/env'
import useUserStore from '@ui/stores/user-store'
import { AccountType, UserRole } from '@ui/types/app'
import { differenceInMilliseconds, intervalToDuration, parseISO } from 'date-fns'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SkinViewer from '@ui/components/SkinViewer.vue'
import ChangeSkinModal from '@ui/components/modals/ChangeSkinModal.vue'
import { useChatsStore } from '@ui/stores/chats-store'
import {
  acceptFriendRequest,
  getFriendRequests,
  getFriends,
  rejectFriendRequest,
  removeFriend
} from '@ui/api/endpoints'
import { getHeadUrl, showToast } from '@ui/utils'
import { useUserCacheStore } from '@ui/stores/user-cache-store'

const emit = defineEmits<{
  (e: 'refresh-data', query?: string, reset?: boolean): Promise<void>
  (e: 'ban-player', player: IUser): Promise<void>
  (e: 'unban-player', player: IUser): Promise<void>
  (e: 'reset-password', player: IUser): Promise<void>
}>()

const apiURL = import.meta.env.RENDERER_VITE_API_URL
const skinUrl = computed(() => {
  return `${apiURL}/skins/image/${player.value?.nickname}`
})

const chatsStore = useChatsStore()
const userStore = useUserStore()
const player = computed(() => userStore.selectedProfile)
const friends = ref<IUser[]>([])
const friendRequests = ref<IUser[]>([])
const isFriendsLoading = ref<boolean>(false)
const isFriendRequestsLoading = ref<boolean>(false)

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

const getPlayerID = (player: IUser): string => {
  if (player?.mcid) return player.mcid
  if (player?.uuid) return player.uuid
  return '(Brak)'
}

const isFriend = (player: IUser): boolean => !!userStore.user?.friends?.includes(player.nickname)

const hasFriendRequestFromMe = (player: IUser): boolean =>
  !!player?.friendRequests?.includes(userStore.user?.nickname ?? '')

const now = ref(new Date())
const timerInterval = ref<number | undefined>(undefined)

const pad = (num: number): string => String(num).padStart(2, '0')

const formattedBanTime = computed(() => {
  if (!userStore.selectedProfile?.isBanned) return

  const banEndDateString = userStore.selectedProfile?.banEndDate as string | null

  if (!banEndDateString?.length) {
    return 'Permanentnie'
  }

  const banEndDate = parseISO(banEndDateString)
  const remainingMs = differenceInMilliseconds(banEndDate, now.value)

  if (remainingMs <= 0) {
    clearInterval(timerInterval.value)
    return 'Blokada zakończyła się'
  }

  const duration = intervalToDuration({
    start: now.value,
    end: banEndDate
  })

  const totalHours = (duration.days || 0) * 24 + (duration.hours || 0)
  const hours = pad(totalHours)
  const minutes = pad(duration.minutes || 0)
  const seconds = pad(duration.seconds || 0)

  return `Pozostało: ${hours}:${minutes}:${seconds}`
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

      showToast(`Zaakceptowano zaproszenie od ${player.nickname}`, 'success')
    }
  } catch {
    showToast(`Nie udało się zaakceptować zaproszenia od ${player.nickname}`, 'error')
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

      showToast(`Odrzucono zaproszenie od ${player.nickname}`, 'success')
    }
  } catch {
    showToast(`Nie udało się odrzucić zaproszenia od ${player.nickname}`, 'error')
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

      showToast(`Usunięto ${playerToRemove.nickname} z listy znajomych`, 'success')
    }
  } catch {
    showToast(`Nie udało się usunąć ${playerToRemove.nickname} z listy znajomych`, 'error')
  }
}

const handleEscape = (e: KeyboardEvent): void => {
  if (e.key === 'Escape') {
    closeModal()
  }
}
</script>

<template>
  <div class="modal-container">
    <Transition name="fade-left">
      <div v-if="player" class="modal-card">
        <div class="flex gap-2 w-full justify-between shrink-0">
          <div v-if="userStore.user" class="">
            <div
              class="flex w-[100px] h-[100px] player-profile rounded-2xl! hover:bg-[var(--bg-light)]/40! hover:cursor-pointer"
              @click="openChangeSkinModal"
            >
              <SkinViewer :skin="skinUrl" />
            </div>
          </div>
          <div class="flex w-full">
            <div class="flex justify-between w-full">
              <div class="flex flex-col">
                <h1 class="font-bold text-lg">{{ player.nickname }}</h1>
                <span
                  :style="`
                      background: var(--primary);
                      color: white;
                      font-size: 0.6rem;
                      padding: 2px 6px;
                      border-radius: 4px;
                      margin-top: 4px;
                      height: 1.2rem;
                      font-weight: 800;
                      flex-shrink: 0 !important;
                      max-width: max-content !important;
                      `"
                  class="capitalize"
                >
                  {{ player.role }}
                </span>
              </div>
            </div>
            <div class="flex gap-2 flex-col">
              <div class="nav-icon" @click="closeModal">
                <i class="fa fa-times"></i>
              </div>
              <div
                v-if="
                  [UserRole.ADMIN, UserRole.DEV, UserRole.MODERATOR].includes(
                    userStore.user?.role ?? UserRole.USER
                  ) && ![UserRole.ADMIN, UserRole.DEV, UserRole.MODERATOR].includes(player.role)
                "
                class="flex flex-col gap-2"
              >
                <button
                  v-if="!player?.isBanned"
                  class="nav-icon"
                  @click="$emit('ban-player', player)"
                >
                  <i :class="'fas fa-ban text-red-400'"></i>
                </button>

                <button v-else class="nav-icon" @click="$emit('unban-player', player)">
                  <i :class="'fas fa-rotate-left text-green-400'"></i>
                </button>

                <button
                  v-if="player?.accountType !== AccountType.MICROSOFT"
                  class="nav-icon"
                  @click="$emit('reset-password', player)"
                >
                  <i :class="'fas fa-key'"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        <span
          v-if="player.isBanned"
          :style="`
                      background: var(--primary);
                      font-size: 0.6rem;
                      color: white;
                      padding: 2px 6px;
                      border-radius: 4px;
                      font-weight: 800;
                      height: 1.2rem;
                      margin-top: 4px;
                      flex-shrink: 0 !important;
                      max-width: max-content !important;
                    `"
          class="mx-auto"
        >
          Konto zablokowane. {{ formattedBanTime }}
        </span>

        <div class="flex flex-col text-xs mt-2">
          <div
            v-if="isFriend(player)"
            :style="`
                      background: var(--text-secondary);
                      color: black;
                      font-size: 0.6rem;
                      padding: 2px 6px;
                      border-radius: 4px;
                      margin-top: 4px;
                      height: 1.2rem;
                      font-weight: 800;
                      flex-shrink: 0 !important;
                      max-width: max-content !important;
                    `"
            class="mx-auto"
          >
            <i class="fas fa-user-friends"></i>
            Jesteście znajomymi
          </div>
          <div
            v-if="hasFriendRequestFromMe(player)"
            :style="`
                      background: var(--text-secondary);
                      color: black;
                      font-size: 0.6rem;
                      padding: 2px 6px;
                      border-radius: 4px;
                      margin-top: 4px;
                      height: 1.2rem;
                      font-weight: 800;
                      flex-shrink: 0 !important;
                      max-width: max-content !important;
                    `"
            class="mx-auto"
          >
            <i class="fas fa-user-friends"></i>
            Wysłano zaproszenie do znajomych
          </div>
          <div
            v-if="
              userStore.user &&
              !player.isBanned &&
              getPlayerID(player) !== getPlayerID(userStore.user)
            "
            class="flex gap-2 my-2"
          ></div>
        </div>

        <template v-if="player.friendRequests">
          <div
            v-for="friend in friendRequests"
            :key="friend.uuid"
            class="flex gap-2 items-center justify-between px-4 py-2 bg-[var(--bg-card)] rounded-xl"
          >
            <div class="flex gap-2 items-center">
              <div class="!relative">
                <img
                  v-if="friend.headUrl"
                  :src="friend.headUrl"
                  class="!w-10 !h-10 !shrink-0 rounded-full"
                  alt="Avatar"
                />
                <div
                  v-else
                  class="!wfull !shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                >
                  <i class="fas fa-user"></i>
                </div>
              </div>
              {{ friend.nickname }}
            </div>
            <div
              v-if="userStore.user?.nickname === userStore.selectedProfile?.nickname"
              class="flex gap-2"
            >
              <button
                class="nav-icon !text-green-400"
                @click.stop="handleAcceptFriendRequest(friend)"
              >
                <i :class="'fas fa-user-plus'" />
              </button>
              <button
                class="nav-icon !text-red-400"
                @click.stop="handleRejectFriendRequest(friend)"
              >
                <i :class="'fas fa-user-xmark'" />
              </button>
            </div>
          </div>
        </template>

        <h1 class="flex flex-wrap gap-2 my-2 text-lg font-black">
          Znajomi
          <span
            :style="`
                      background: var(--text-secondary);
                      font-size: 0.6rem;
                      color: black;
                      padding: 2px 6px;
                      border-radius: 4px;
                      font-weight: 800;
                      height: 1.2rem;
                      margin-top: 4px;
                      flex-shrink: 0 !important;
                      max-width: max-content !important;
                    `"
          >
            {{ player.friends?.length }}
          </span>
        </h1>

        <!-- Friends list -->
        <div class="flex flex-col gap-1 overflow-y-auto">
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
              class="flex gap-2 items-center justify-between px-4 py-2 bg-[var(--bg-card)] rounded-xl"
            >
              <div class="flex gap-2 items-center">
                <div class="!relative">
                  <img
                    v-if="friend.headUrl"
                    :src="friend.headUrl"
                    class="!w-10 !h-10 !shrink-0 rounded-full"
                    alt="Avatar"
                  />
                  <div
                    v-else
                    class="!wfull !shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                  >
                    <i class="fas fa-user"></i>
                  </div>
                </div>
                {{ friend.nickname }}
              </div>
              <div
                v-if="userStore.user?.nickname === userStore.selectedProfile?.nickname"
                class="flex gap-1"
              >
                <button
                  class="nav-icon"
                  @click="
                    () => {
                      chatsStore.addActiveChat(friend)
                      closeModal()
                    }
                  "
                >
                  <i class="fa fa-comment"></i>
                </button>
                <button class="nav-icon !text-red-400" @click="handleRemoveFriend(friend)">
                  <i :class="'fas fa-user-minus'" />
                </button>
              </div>
            </div>
          </div>

          <!-- Empty state for friends -->
          <span v-else class="text-xs text-[var(--text-muted)]">
            Aktualnie
            {{
              userStore.user && getPlayerID(player) === getPlayerID(userStore.user)
                ? 'nie masz'
                : 'gracz nie ma'
            }}
            żadnych znajomych.
          </span>
        </div>
      </div>
    </Transition>

    <ChangeSkinModal ref="changeSkinModalRef" />
  </div>
</template>

<style scoped>
.modal-container {
  position: absolute;
  top: 54.5px;
  left: 0;
  height: calc(100vh - 54.5px);
  color: white;
  display: flex;
  align-items: end;
  z-index: 500;
}

.error-message {
  background: white;
  backdrop-filter: blur(10px);
}

.modal-card {
  height: 100%;
  width: 35vw;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 1rem var(--border-2);
  background: var(--bg-card);
  border-top-right-radius: 1rem;
  border-bottom-right-radius: 1rem;
  border: 1px dashed var(--border-2);
  backdrop-filter: blur(24px);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.modal-content {
  flex: 1;
  margin-bottom: 1.5rem;
}

.online-dot {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--bg-dark);
  border-radius: 50%;
}

.fade-left-enter-active,
.fade-left-leave-active {
  transition: all 0.5s cubic-bezier(0.075, 0.82, 0.165, 1);
  transform: translateX(0%);
}

.fade-left-enter-from,
.fade-left-leave-to {
  transform: translateX(-100%);
}

/* Skeleton styles */
.skeleton-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
}

.skeleton-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  background: var(--border-2);
  opacity: 0.6;
  animation: pulse 1.4s ease-in-out infinite;
}

.skeleton-text {
  height: 0.9rem;
  border-radius: 0.25rem;
  background: var(--border-2);
  opacity: 0.6;
  animation: pulse 1.4s ease-in-out infinite;
}

.skeleton-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.skeleton-button {
  height: 1.5rem;
  border-radius: 0.375rem;
  background: var(--border-2);
  opacity: 0.6;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    opacity: 0.6;
  }
}
</style>
