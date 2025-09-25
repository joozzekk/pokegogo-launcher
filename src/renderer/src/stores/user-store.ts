import { defineStore } from 'pinia'
import { ref } from 'vue'

interface IUser {
  uuid: string
  nickname: string
}

const useUserStore = defineStore('user', () => {
  const user = ref(null as IUser | null)

  const setUser = (newUser: IUser): void => {
    user.value = newUser
  }

  const resetUser = (): void => {
    user.value = null
  }

  return {
    user,
    setUser,
    resetUser
  }
})

export default useUserStore
