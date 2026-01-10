import io, { type Socket } from 'socket.io-client'
import { LOGGER } from './logger-service'
import api from '@ui/utils/client'
import { isMachineIDBanned, showToast } from '@ui/utils'
import useUserStore from '@ui/stores/user-store'
import { useRouter } from 'vue-router'
import { IChat, useChatsStore } from '@ui/stores/chats-store'
import { connectPlayer, disconnectPlayer } from '@ui/api/endpoints'
import { IMessage } from '@ui/types/app'
import { useUserCacheStore } from '@ui/stores/user-cache-store'

export const useSocketService = (): {
  connect: (uuid: string) => void
} => {
  let socket: Socket | null = null
  const chatsStore = useChatsStore()
  const userStore = useUserStore()
  const userCache = useUserCacheStore()
  const router = useRouter()

  const refreshToken = async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refresh_token')

    api
      .post('/auth/refresh', { refreshToken })
      .then(({ data }) => {
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
      })
      .catch((err) => {
        LOGGER.with('Socket Service').log(err)
      })
  }

  const connect = (uuid: string): void => {
    if (socket) return
    socket = io(import.meta.env.RENDERER_VITE_SOCKET_URL, {
      query: {
        uuid
      }
    })

    socket.on('connect', async () => {
      LOGGER.with('Socket Service').success(`Connected to websocket as ${userStore.user?.nickname}`)
      await connectPlayer()
      if (userStore.user) await userStore.updateProfile()
    })

    socket.on('error', (err) => {
      LOGGER.with('Socket Service').err('Error with socket connection: ', err)
    })

    socket.on('disconnect', async () => {
      await disconnectPlayer()
      LOGGER.with('Socket Service').success('Disconected from websocket')
    })

    socket.on('player:banned', async (data) => {
      await isMachineIDBanned()
      const isCurrentPlayerBanned =
        userStore.user?.machineId === data.uuid || userStore.user?.uuid === data.uuid

      userStore.user!.banReason = data.reason

      if (isCurrentPlayerBanned) {
        await refreshToken()
        await userStore.updateProfile()
      }
    })

    socket.on('player:clear-storage', async () => {
      localStorage.clear()
      userStore.logout()
      showToast('Administrator zresetował zapisane ustawienia launchera', 'success')
    })

    socket.on('player:unbanned', async (data) => {
      await isMachineIDBanned()
      const isCurrentPlayerUnbanned =
        userStore.user?.machineId === data.uuid || userStore.user?.uuid === data.uuid

      if (isCurrentPlayerUnbanned) {
        await refreshToken()
        await userStore.updateProfile()

        showToast('Zostałeś odbanowany', 'success')
      }
    })

    socket.on('player:update-profile', async (data) => {
      const isCurrentPlayer = userStore.user?.uuid === data.uuid

      if (isCurrentPlayer) {
        await refreshToken()
        await userStore.updateProfile()
        router.go(0)
      }
    })

    async function ensureActiveChatOpened(
      senderUUID: string,
      senderNickname?: string
    ): Promise<IChat | null> {
      const chat = chatsStore.activeChats.find((c) => c.uuid === senderUUID)
      if (chat) {
        chat.chatToggled = true
        return chat
      }

      const user = await userCache.getOrFetchUser({ uuid: senderUUID, nickname: senderNickname })
      if (!user) return null

      const messages: IMessage[] = []

      const newChat: IChat = {
        ...user,
        headUrl: user.headUrl || '',
        messages,
        chatToggled: true
      }

      chatsStore.activeChats.push(newChat)
      return chatsStore.activeChats.find((c) => c.uuid === senderUUID) ?? null
    }

    // socket handler
    socket.on(
      'player:receive-message',
      async (data: { senderUUID: string; senderNickname?: string; message: string }) => {
        const { senderUUID, senderNickname, message } = data

        const chat = await ensureActiveChatOpened(senderUUID, senderNickname)
        if (!chat || !userStore.user) return

        chat.messages.push({
          sender: senderUUID,
          receiver: userStore.user.uuid,
          content: message,
          read: false
        })
      }
    )

    socket.on('friends:request', async (nickname: string) => {
      LOGGER.with('Socket Service').log('Player received friend request from: ', nickname)
      showToast('Nowe zaproszenie do znajomych od: ' + nickname)
      await userStore.updateProfile()
    })
  }

  return {
    connect
  }
}
