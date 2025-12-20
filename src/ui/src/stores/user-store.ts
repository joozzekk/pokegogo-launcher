import { fetchProfile } from '@ui/api/endpoints'
import { type IUser } from '@ui/env'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { type SavedAccount } from '@ui/types/app'

const useUserStore = defineStore('user', () => {
  const savedAccounts = ref<SavedAccount[]>(
    JSON.parse(localStorage.getItem('savedAccounts') ?? '[]')
  )
  const hwidBanned = ref<boolean>(false)
  const user = ref(null as IUser | null)
  const router = useRouter()

  const setUser = (newUser: IUser): void => {
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
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('mcToken')
    router.push('/')
  }

  const updateProfile = async (): Promise<void> => {
    const profile = await fetchProfile()

    setUser(profile)
  }

  return {
    user,
    hwidBanned,
    savedAccounts,
    setUser,
    resetUser,
    logout,
    removeSavedAccount,
    updateProfile
  }
})

export default useUserStore
