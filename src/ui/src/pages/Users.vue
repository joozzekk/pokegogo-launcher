<script lang="ts" setup>
import {
  acceptFriendRequest,
  getFriends,
  getPlayers,
  rejectFriendRequest,
  removeFriend,
  requestFriend
} from '@ui/api/endpoints'
import BanPlayerModal from '@ui/components/modals/BanPlayerModal.vue'
import PasswordResetConfirm from '@ui/components/modals/PasswordResetConfirm.vue'
import { IUser } from '@ui/env'
import { IChat, useChatsStore } from '@ui/stores/chats-store'
import useUserStore from '@ui/stores/user-store'
import { AccountType, UserRole } from '@ui/types/app'
import { loadCustomOrFallbackHead, showToast } from '@ui/utils'
import { nextTick } from 'process'
import { ref, onMounted, onUnmounted } from 'vue'

const chatsStore = useChatsStore()
const userStore = useUserStore()

const allPlayers = ref<IUser[]>([])
const isLoadingPlayers = ref<boolean>(false)
const hasMorePlayers = ref<boolean>(true)
const observerTarget = ref<HTMLElement | null>(null)
const filteredPlayers = ref<IUser[]>([])
const searchQuery = ref('')
const banPlayerModalRef = ref()
const passwordResetModalRef = ref()

const currentPage = ref(1)
const itemsPerPage = ref(14)
let observer: IntersectionObserver | null = null

async function fetchPlayers(query?: string, reset: boolean = false): Promise<void> {
  if (isLoadingPlayers.value || (!hasMorePlayers.value && !reset)) return

  isLoadingPlayers.value = true

  if (reset) {
    currentPage.value = 1
    hasMorePlayers.value = true
  }

  try {
    const res = await getPlayers(currentPage.value, itemsPerPage.value, query ?? searchQuery.value)

    if (res) {
      if (res.length < itemsPerPage.value) {
        hasMorePlayers.value = false
      }

      const mappedPlayers = await Promise.all(
        res.map(async (player) => {
          const headUrl = await loadCustomOrFallbackHead(player)
          return {
            ...player,
            headUrl
          }
        })
      )

      if (reset) {
        allPlayers.value = mappedPlayers
        filteredPlayers.value = mappedPlayers
      } else {
        allPlayers.value = [...allPlayers.value, ...mappedPlayers]
        filteredPlayers.value = [...filteredPlayers.value, ...mappedPlayers]
      }

      if (res.length > 0) {
        currentPage.value++
      }
    } else {
      hasMorePlayers.value = false
    }
  } catch (error) {
    console.error('Błąd pobierania graczy:', error)
    showToast('Błąd pobierania listy graczy', 'error')
  } finally {
    isLoadingPlayers.value = false
  }
}

const debounce = (func: () => void | Promise<void>, delay: number) => {
  let timeout: ReturnType<typeof setTimeout>

  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(func, delay)
  }
}

const debounceSearchInput = debounce(async () => {
  await fetchPlayers(searchQuery.value, true)
}, 500)

const handleSearchInput = (): void => {
  debounceSearchInput()
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

const handleRequestFriend = async (player: IUser): Promise<void> => {
  try {
    const res = await requestFriend(getPlayerID(player))

    if (res) {
      await fetchPlayers(searchQuery.value, true)
      await userStore.updateProfile()

      showToast(`Wysłano zaproszenie do ${player.nickname}`, 'success')
    }
  } catch {
    showToast(`Nie udało się wysłać zaproszenia do ${player.nickname}`, 'error')
  }
}

const handleAcceptFriendRequest = async (player: IUser): Promise<void> => {
  try {
    const res = await acceptFriendRequest(player.uuid)

    if (res) {
      await fetchPlayers(searchQuery.value, true)
      await userStore.updateProfile()
      await chatsStore.setFriends(await getFriends())

      showToast(`Zaakceptowano zaproszenie od ${player.nickname}`, 'success')
    }
  } catch {
    showToast(`Nie udało się zaakceptować zaproszenia od ${player.nickname}`, 'error')
  }
}

const handleRejectFriendRequest = async (player: IUser): Promise<void> => {
  try {
    const res = await rejectFriendRequest(player.uuid)

    if (res) {
      await fetchPlayers(searchQuery.value, true)
      await userStore.updateProfile()
      await chatsStore.setFriends(await getFriends())

      showToast(`Odrzucono zaproszenie od ${player.nickname}`, 'success')
    }
  } catch {
    showToast(`Nie udało się odrzucić zaproszenia od ${player.nickname}`, 'error')
  }
}

const handleRemoveFriend = async (player: IUser): Promise<void> => {
  try {
    const res = await removeFriend(player.uuid)

    if (res) {
      await fetchPlayers(searchQuery.value, true)
      await userStore.updateProfile()
      await chatsStore.setFriends(await getFriends())

      showToast(`Usunięto ${player.nickname} z listy znajomych`, 'success')
    }
  } catch {
    showToast(`Nie udało się usunąć ${player.nickname} z listy znajomych`, 'error')
  }
}

const refreshPlayerList = ref()

const isFriend = (player: IUser): boolean => !!userStore.user?.friends?.includes(player.uuid)

const sentRequest = (player: IUser): boolean =>
  !!player?.friendRequests?.includes(userStore.user?.uuid ?? '')

const hasFriendRequest = (player: IUser): boolean =>
  !!userStore.user?.friendRequests?.includes(player.uuid)

onMounted(async () => {
  await fetchPlayers(searchQuery.value, true)

  observer = new IntersectionObserver(
    (entries) => {
      const target = entries[0]
      if (target.isIntersecting && hasMorePlayers.value && !isLoadingPlayers.value) {
        fetchPlayers()
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
  clearInterval(refreshPlayerList.value)
  if (observer) observer.disconnect()
})
</script>

<template>
  <div class="users-container h-full flex">
    <div v-if="chatsStore.friends.length" class="flex flex-col gap-2 h-full w-12">
      <div v-for="friend in chatsStore.friends" :key="friend.uuid" class="!relative !w-10 !h-10">
        <img
          v-if="friend.headUrl"
          :src="friend.headUrl"
          class="!w-10 !h-10 !shrink-0 rounded-full cursor-pointer hover:opacity-80"
          alt="Avatar"
          @click="chatsStore.addActiveChat(friend as IChat)"
        />
        <div
          v-else
          class="!w-10 !h-10 !shrink-0 rounded-full overflow-hidden flex items-center justify-center"
        >
          <i class="fas fa-user"></i>
        </div>
        <div
          class="absolute -bottom-1 right-0 z-10 w-2 h-2 rounded-full"
          :style="{ background: !friend?.isOnline ? '#ff4757' : '#00ff88' }"
        ></div>
      </div>
    </div>

    <div class="flex flex-col w-full">
      <div class="search-input-wrapper mb-2">
        <i class="fas fa-search search-icon !text-[0.9rem] ml-3"></i>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input !p-2 !py-1 !pl-8 !text-[0.8rem]"
          :placeholder="`Wyszukaj gracza po nicku${[UserRole.ADMIN, UserRole.MODERATOR, UserRole.DEV].includes(userStore.user?.role ?? UserRole.USER) ? ', UUID/MCID, Machine ID lub Mac adresie lub słowach kluczowych: banned, premium, nohwid, online, role:rola' : ''}...`"
          @input="handleSearchInput"
        />
      </div>

      <div class="h-[calc(100vh-54.5px)] overflow-y-auto scroll-container">
        <TransitionGroup
          v-if="filteredPlayers.length > 0"
          name="list"
          tag="div"
          class="w-full grid grid-cols-2 gap-2"
        >
          <article
            v-for="player in filteredPlayers"
            :key="player.mcid ? player.mcid : player.uuid"
            class="flex flex-col gap-2 backdrop-blur-xl border rounded-xl px-4 py-3 border-[var(--primary)]/10"
            :class="player.isBanned ? 'bg-red-400/20' : 'bg-[var(--bg-card)]'"
          >
            <div class="flex gap-2 w-full justify-between shrink-0">
              <div class="news-thumbnail !relative">
                <img
                  v-if="player.headUrl"
                  :src="player.headUrl"
                  class="!w-16 !h-16 !shrink-0 rounded-full"
                  alt="Avatar"
                />
                <div
                  v-else
                  class="!w-16 !h-16 !shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                >
                  <i class="fas fa-user"></i>
                </div>
                <div
                  class="online-dot absolute !bottom-0 !right-0"
                  :style="{ background: !player?.isOnline ? '#ff4757' : '#00ff88' }"
                ></div>
              </div>
              <div class="flex w-full">
                <div class="flex justify-between w-full">
                  <div class="flex h-1/3 gap-2">
                    <div>
                      <h1 class="font-bold text-lg">{{ player.nickname }}</h1>
                    </div>

                    <span
                      v-if="isFriend(player)"
                      :style="`
                      background: #ff4757;
                      color: white;
                      font-size: 0.6rem;
                      padding: 2px 6px;
                      border-radius: 4px;
                      margin-top: 4px;
                      height: 1.2rem;
                      font-weight: 800;
                    `"
                    >
                      <i class="fas fa-user-friends"></i>
                      Friends
                    </span>
                    <span
                      v-if="sentRequest(player)"
                      :style="`
                      background: #ff4757;
                      color: white;
                      font-size: 0.6rem;
                      padding: 2px 6px;
                      border-radius: 4px;
                      margin-top: 4px;
                      height: 1.2rem;
                      font-weight: 800;
                    `"
                    >
                      <i class="fas fa-user-friends"></i>
                      Request sent
                    </span>

                    <span
                      v-if="player.isBanned"
                      :style="`
                      background: #ff4757;
                      color: white;
                      font-size: 0.6rem;
                      padding: 2px 6px;
                      border-radius: 4px;
                      margin-top: 4px;
                      height: 1.2rem;
                      font-weight: 800;
                    `"
                    >
                      Banned
                    </span>
                    <span
                      v-if="player.mcid"
                      :style="`
                      background: var(--primary);
                      font-size: 0.6rem;
                      color: white;
                      padding: 2px 6px;
                      border-radius: 4px;
                      font-weight: 800;
                      height: 1.2rem;
                      margin-top: 4px;
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
                      height: 1.2rem;
                      margin-top: 4px;
                    `"
                    >
                      Missing HWID
                    </span>
                  </div>
                  <div
                    v-if="
                      userStore.user &&
                      !player.isBanned &&
                      getPlayerID(player) !== getPlayerID(userStore.user) &&
                      !sentRequest(player)
                    "
                    class="flex gap-2 flex-row-reverse w-2/5"
                  >
                    <button
                      v-if="userStore.user.friendRequests?.includes(player.uuid)"
                      class="nav-icon !w-1/2 gap-2"
                      @click="handleRejectFriendRequest(player)"
                    >
                      <i :class="'fas fa-envelope-open'" />
                      Reject
                    </button>
                    <button
                      v-if="userStore.user.friendRequests?.includes(player.uuid)"
                      class="nav-icon !w-1/2 gap-2"
                      @click="handleAcceptFriendRequest(player)"
                    >
                      <i :class="'fas fa-envelope-open'" />
                      Accept
                    </button>

                    <button
                      v-if="!isFriend(player) && !hasFriendRequest(player)"
                      class="nav-icon !w-full gap-2"
                      @click="handleRequestFriend(player)"
                    >
                      <i :class="'fas fa-user-plus'" />
                      Add to friends
                    </button>
                    <button
                      v-if="isFriend(player)"
                      class="nav-icon !w-full gap-2"
                      @click="handleRemoveFriend(player)"
                    >
                      <i :class="'fas fa-user-minus'" />
                      Remove from friends
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex gap-2 flex-row-reverse">
              <template
                v-if="
                  [UserRole.ADMIN, UserRole.DEV, UserRole.MODERATOR].includes(
                    userStore.user?.role ?? UserRole.USER
                  ) && ![UserRole.ADMIN, UserRole.DEV, UserRole.MODERATOR].includes(player.role)
                "
              >
                <button v-if="userStore.user?.role === UserRole.ADMIN" class="nav-icon">
                  <i class="fa fa-trash" />
                </button>

                <button
                  v-if="!player?.isBanned"
                  class="nav-icon"
                  @click="handleLauncherBan(player)"
                >
                  <i :class="'fas fa-ban text-red-400'"></i>
                </button>

                <button v-else class="nav-icon" @click="handleLauncherUnban(player)">
                  <i :class="'fas fa-rotate-left text-green-400'"></i>
                </button>

                <button
                  v-if="player?.accountType !== AccountType.MICROSOFT"
                  class="nav-icon"
                  @click="handleResetPassword(player)"
                >
                  <i :class="'fas fa-key'"></i>
                </button>
              </template>
            </div>
          </article>
        </TransitionGroup>

        <div ref="observerTarget" class="w-full py-4 flex justify-center items-center h-20 mt-2">
          <div v-if="isLoadingPlayers" class="flex flex-col items-center gap-2">
            <i class="fas fa-circle-notch fa-spin text-2xl text-[var(--primary)]"></i>
            <span class="text-xs opacity-70">Ładowanie graczy...</span>
          </div>
          <div v-if="!hasMorePlayers" class="flex flex-col items-center gap-2">
            <span class="text-xs opacity-70">Koniec wyników</span>
          </div>
        </div>
      </div>
    </div>

    <BanPlayerModal ref="banPlayerModalRef" @refresh-data="fetchPlayers" />
    <PasswordResetConfirm ref="passwordResetModalRef" />
  </div>
</template>

<style scoped>
.users-container {
  padding: 0.5rem;
  width: 100%;
  height: calc(100vh - 54.5px);
  overflow: hidden;
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
  width: 4px;
  height: 4px;
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

.list-move,
.list-enter-active,
.list-leave-active {
  transition: transform 0.5s ease-in-out;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
}

.list-leave-active {
  position: absolute;
}
</style>
