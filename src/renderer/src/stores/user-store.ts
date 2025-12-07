import { type IUser } from '@renderer/env'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const useUserStore = defineStore('user', () => {
  const prevAccounts = ref<Partial<IUser & { password: string; skinURL?: string }>[]>(
    JSON.parse(localStorage.getItem('prevAccounts') ?? '[]')
  )
  const hwidBanned = ref<boolean>(false)
  const user = ref(null as IUser | null)
  const accountType = localStorage.getItem('LOGIN_TYPE')
  const router = useRouter()

  const setUser = (newUser: IUser): void => {
    user.value = newUser
  }

  const resetUser = (): void => {
    user.value = null
  }

  const logout = async (): Promise<void> => {
    resetUser()
    localStorage.removeItem('LOGIN_TYPE')
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('mcToken')
    router.push('/')
  }

  return {
    user,
    hwidBanned,
    prevAccounts,
    accountType,
    setUser,
    resetUser,
    logout
  }
})

export default useUserStore
