import { defineStore } from 'pinia'
import { ref } from 'vue'
import { IMessage } from '@ui/types/app'
import { IUser } from '@ui/env'
import { loadCustomOrFallbackHead } from '@ui/utils'
import { getMessages } from '@ui/api/endpoints'

export type IChat = IUser & {
  headUrl: string
  messages: IMessage[]
  chatToggled: boolean
}

export type IFriend = IUser & {
  headUrl: string
}

export const useChatsStore = defineStore('chats', () => {
  const activeChats = ref<IChat[]>([])
  const friends = ref<IFriend[]>([])

  const setFriends = async (newFriends: IFriend[]): Promise<void> => {
    for (const friend of newFriends) {
      const headUrl = await loadCustomOrFallbackHead(friend)
      friend.headUrl = headUrl
    }

    friends.value = newFriends
  }

  const addActiveChat = async (user: IUser): Promise<void> => {
    if (activeChats.value.find((chat) => chat.uuid === user.uuid)) return

    const headUrl = await loadCustomOrFallbackHead(user)
    const messages = await getMessages(user.uuid)

    activeChats.value.push({ ...user, messages, headUrl, chatToggled: true })
  }

  const removeActiveChat = (user: IUser): void => {
    activeChats.value = activeChats.value.filter((chat) => chat.uuid !== user.uuid)
  }

  const resetChats = (): void => {
    activeChats.value = []
  }

  return {
    resetChats,
    activeChats,
    friends,
    setFriends,
    addActiveChat,
    removeActiveChat
  }
})
