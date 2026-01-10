// useChatsStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { IMessage } from '@ui/types/app'
import { IUser } from '@ui/env'
import { getHeadUrl } from '@ui/utils'
import { getMessages } from '@ui/api/endpoints'
import { useUserCacheStore } from '@ui/stores/user-cache-store'

export type IChat = IUser & { headUrl: string; messages: IMessage[]; chatToggled: boolean }
export type IFriend = IUser & { headUrl: string }

export const useChatsStore = defineStore('chats', () => {
  const activeChats = ref<IChat[]>([])
  const userCache = useUserCacheStore()

  const addActiveChat = async (user: IUser): Promise<void> => {
    if (activeChats.value.find((chat) => chat.uuid === user.uuid)) return

    const headUrl = await getHeadUrl(user)
    const messages = await getMessages(user.uuid) // wiadomości zwykle nie cache’ujemy długim TTL

    activeChats.value.push({ ...user, messages, headUrl, chatToggled: true })
    userCache.cacheUser(user)
  }

  const removeActiveChat = (user: IUser): void => {
    activeChats.value = activeChats.value.filter((chat) => chat.uuid !== user.uuid)
  }

  const resetChats = (): void => {
    activeChats.value = []
  }

  return { resetChats, activeChats, addActiveChat, removeActiveChat }
})
