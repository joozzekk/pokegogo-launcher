import { fetchProfile } from '@ui/api/endpoints'
import { type IUser } from '@ui/env'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { type SavedAccount } from '@ui/types/app'
import { useChatsStore } from '@ui/stores/chats-store'
import { loadCustomOrFallbackHead } from '@ui/utils'

const useUserStore = defineStore('user', () => {
  const selectedProfile = ref<IUser | null>(null)
  const chatsStore = useChatsStore()

  const savedAccounts = ref<SavedAccount[]>(
    JSON.parse(localStorage.getItem('savedAccounts') ?? '[]')
  )
  const hwidBanned = ref<boolean>(false)
  const user = ref(null as IUser | null)
  const router = useRouter()

  const setUser = async (newUser: IUser): Promise<void> => {
    newUser.headUrl = await loadCustomOrFallbackHead(newUser)

    user.value = newUser
  }

  const resetUser = (): void => {
    user.value = null
  }

  const removeSavedAccount = (savedAccount: SavedAccount): void => {
    savedAccounts.value = savedAccounts.value.filter(
      (account) => account.nickname !== savedAccount.nickname
    )
    localStorage.setItem('savedAccounts', JSON.stringify(savedAccounts.value))
  }

  const logout = async (): Promise<void> => {
    resetUser()
    chatsStore.resetChats()
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('mcToken')
    router.push('/')
  }

  const updateProfile = async (): Promise<void> => {
    const profile = await fetchProfile()

    setUser(profile)
  }

  const updateSelectedProfile = (player: IUser): void => {
    selectedProfile.value = player
  }

  const resetSelectedProfile = (): void => {
    selectedProfile.value = null
  }

  return {
    user,
    hwidBanned,
    savedAccounts,
    selectedProfile,
    updateSelectedProfile,
    resetSelectedProfile,
    setUser,
    resetUser,
    logout,
    removeSavedAccount,
    updateProfile
  }
})

export default useUserStore
