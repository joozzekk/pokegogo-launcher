import { defineStore } from 'pinia'
import { ref } from 'vue'
import { IMessage } from '@ui/types/app'

export const useChatsStore = defineStore('chats', () => {
  const messages = ref<IMessage[]>([])

  const setMessages = (newMessages: IMessage[]): void => {
    messages.value = newMessages
  }

  const addMessage = (message: IMessage): void => {
    messages.value.push(message)
  }

  return {
    messages,
    setMessages,
    addMessage
  }
})
