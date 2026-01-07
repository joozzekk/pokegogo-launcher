<script lang="ts" setup>
import { cancelFriendRequest, getFriends, removeFriend, requestFriend } from '@ui/api/endpoints'
import { IUser } from '@ui/env'
import { useChatsStore } from '@ui/stores/chats-store'
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import { UserRole } from '@ui/types/app'
import { showToast } from '@ui/utils'
import { nextTick } from 'process'
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  filteredPlayers: IUser[]
  hasMorePlayers: boolean
  isLoadingPlayers: boolean
  allPlayers: IUser[]
}>()

const emit = defineEmits<{
  (e: 'fetch-players', query?: string, reset?: boolean): Promise<void>
  (e: 'refresh-data', query?: string, reset?: boolean): Promise<void>
}>()

const generalStore = useGeneralStore()
const chatsStore = useChatsStore()
const userStore = useUserStore()

const searchQuery = ref<string>(generalStore.searchQuery ?? '')
const observerTarget = ref<HTMLElement | null>(null)

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
  return '(Brak)'
}

const handleRequestFriend = async (player: IUser): Promise<void> => {
  try {
    const res = await requestFriend(getPlayerID(player))

    if (res) {
      await emit('fetch-players', searchQuery.value, true)
      await userStore.updateProfile()

      showToast(`Wysłano zaproszenie do ${player.nickname}`, 'success')
    }
  } catch {
    showToast(`Nie udało się wysłać zaproszenia do ${player.nickname}`, 'error')
  }
}

const handleCancelRequest = async (player: IUser): Promise<void> => {
  try {
    const res = await cancelFriendRequest(getPlayerID(player))
    if (res) {
      await emit('fetch-players', searchQuery.value, true)
      await userStore.updateProfile()

      showToast(`Cofnięto zaproszenie do ${player.nickname}`, 'success')
    }
  } catch {
    showToast(`Nie udało się anulować zaproszenia do ${player.nickname}`, 'error')
  }
}

const handleRemoveFriend = async (player: IUser): Promise<void> => {
  try {
    const res = await removeFriend(player.uuid)

    if (res) {
      await emit('fetch-players', searchQuery.value, true)
      await userStore.updateProfile()
      await chatsStore.setFriends(await getFriends(userStore.user!.uuid))

      showToast(`Usunięto ${player.nickname} z listy znajomych`, 'success')
    }
  } catch {
    showToast(`Nie udało się usunąć ${player.nickname} z listy znajomych`, 'error')
  }
}

const handleOpenUserProfile = (player: IUser): void => {
  userStore.updateSelectedProfile(player)
}

const isFriend = (player: IUser): boolean => !!userStore.user?.friends?.includes(player.uuid)

const sentRequest = (player: IUser): boolean =>
  !!player?.friendRequests?.includes(userStore.user?.uuid ?? '')

const hasFriendRequest = (player: IUser): boolean =>
  !!userStore.user?.friendRequests?.includes(player.uuid)

onMounted(async () => {
  await emit('fetch-players', searchQuery.value, true)

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
})
</script>

<template>
  <div class="users-container h-full flex">
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
          class="w-full grid grid-cols-6 gap-2"
        >
          <article
            v-for="player in filteredPlayers"
            :key="player.mcid ? player.mcid : player.uuid"
            class="flex flex-col gap-2 backdrop-blur-xl border rounded-xl px-4 py-3 border-[var(--primary)]/10"
            :class="player.isBanned ? 'bg-red-400/20' : 'bg-[var(--bg-card)]'"
          >
            <div class="flex flex-col shrink-0">
              <div class="!relative p-4">
                <img
                  v-if="player.headUrl"
                  :src="player.headUrl"
                  class="!w-full !shrink-0 rounded-full"
                  alt="Avatar"
                />
                <div
                  v-else
                  class="!wfull !shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                >
                  <i class="fas fa-user"></i>
                </div>
              </div>
              <h1 class="font-bold text-lg text-center">{{ player.nickname }}</h1>
            </div>
            <div class="flex gap-2 flex-col">
              <button class="nav-icon !w-full gap-2" @click="handleOpenUserProfile(player)">
                <i class="fa fa-user" />
                Profile
              </button>
              <div
                v-if="
                  userStore.user &&
                  !player.isBanned &&
                  getPlayerID(player) !== getPlayerID(userStore.user)
                "
                class="flex gap-2 flex-col"
              >
                <button
                  v-if="!isFriend(player) && !hasFriendRequest(player) && !sentRequest(player)"
                  class="nav-icon !w-full gap-2 text-xs"
                  @click="handleRequestFriend(player)"
                >
                  <i :class="'fas fa-user-plus'" />
                  Add to friends
                </button>
                <button
                  v-if="sentRequest(player)"
                  class="nav-icon !w-full gap-2 text-xs"
                  @click="handleCancelRequest(player)"
                >
                  <i :class="'fas fa-user-minus'" />
                  Cancel request
                </button>
                <button
                  v-if="isFriend(player)"
                  class="nav-icon !w-full gap-2 text-xs"
                  @click="handleRemoveFriend(player)"
                >
                  <i :class="'fas fa-user-minus'" />
                  Remove friend
                </button>
              </div>
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
  width: 1rem;
  height: 1rem;
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
