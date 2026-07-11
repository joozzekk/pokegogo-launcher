// useSocketService.ts

import io, { type Socket } from 'socket.io-client'
import { LOGGER } from './logger-service'
import api from '@ui/utils/client'
import { isMachineIDBanned, showToast } from '@ui/utils'
import useUserStore from '@ui/stores/user-store'
import { useRouter } from 'vue-router'
import { IChat, useChatsStore } from '@ui/stores/chats-store'
import { connectPlayer, disconnectPlayer } from '@ui/api/endpoints'
import type { IMessage } from '@ui/types/app'
import { useUserCacheStore } from '@ui/stores/user-cache-store'
import { usePlayersStore } from '@ui/stores/players-store'
import useGeneralStore from '@ui/stores/general-store'
import { useEventsStore } from '@ui/stores/events-store'

// Global shared instances (Singleton)
let socket: Socket | null = null

export const useSocketService = (): {
  connect: (uuid: string, nickname?: string) => void
  disconnect: () => void
  emit: (event: string, data: unknown) => void
} => {
  const chatsStore = useChatsStore()
  const userStore = useUserStore()
  const userCache = useUserCacheStore()
  const playersStore = usePlayersStore()
  const generalStore = useGeneralStore()
  const eventsStore = useEventsStore()
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

  const disconnect = (): void => {
    socket?.disconnect()
  }

  const connect = (uuid: string, nickname?: string): void => {
    if (socket) return

    // Dołączamy do pokoi uuid i (opcjonalnie) nickname
    socket = io(import.meta.env.RENDERER_VITE_SOCKET_URL, {
      query: { uuid, nickname }
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

    // BAN FLOW
    socket.on(
      'player:banned',
      async (data: { uuid?: string; nickname?: string; reason: string }) => {
        await isMachineIDBanned()
        const isCurrentPlayerBanned =
          userStore.user?.machineId === data.uuid ||
          userStore.user?.uuid === data.uuid ||
          userStore.user?.nickname === data.nickname

        if (isCurrentPlayerBanned) {
          if (userStore.user) {
            userStore.user.isBanned = true
            userStore.user.banReason = data.reason
          }
          generalStore.setCurrentState('start')

          await refreshToken()
          await userStore.updateProfile()

          // KILL GAME ON BAN
          window.electron?.ipcRenderer?.invoke('launch:exit')
          showToast(`Zostałeś zbanowany! Powód: ${data.reason}`, 'error')
        }
      }
    )

    socket.on('player:unbanned', async (data: { uuid?: string; nickname?: string }) => {
      await isMachineIDBanned()
      const isCurrentPlayerUnbanned =
        userStore.user?.machineId === data.uuid ||
        userStore.user?.uuid === data.uuid ||
        userStore.user?.nickname === data.nickname

      if (isCurrentPlayerUnbanned) {
        await refreshToken()
        await userStore.updateProfile()
        showToast('Zostałeś odbanowany', 'success')
      }
    })

    socket.on('player:update-profile', async (data: { uuid?: string; nickname?: string }) => {
      const isCurrentPlayer =
        userStore.user?.uuid === data.uuid || userStore.user?.nickname === data.nickname

      if (isCurrentPlayer) {
        await refreshToken()
        await userStore.updateProfile()
        router.go(0)
      }
    })

    socket.on('player:online', (data: { uuid: string; nickname: string }) => {
      playersStore.updatePlayerStatus(data.uuid, true)
      playersStore.updatePlayerStatus(data.nickname, true)
    })

    socket.on('player:offline', (data: { uuid: string; nickname: string }) => {
      playersStore.updatePlayerStatus(data.uuid, false)
      playersStore.updatePlayerStatus(data.nickname, false)
    })

    socket.on('player:mc-status-update', (data: { nickname: string; isMcOpened: boolean }) => {
      playersStore.updatePlayerMcStatus(data.nickname, data.isMcOpened)
    })

    socket.on('player:force-kill-game', async () => {
      LOGGER.with('Socket Service').log('Remote kill command received from admin')
      await window.electron?.ipcRenderer?.invoke('launch:exit')

      // Sync local state
      generalStore.setCurrentState('start')
      generalStore.setIsOpeningGame(false)
      generalStore.mcInstance = null

      showToast('Twoja gra została zdalnie wyłączona przez administratora', 'warning')
    })

    socket.on('player:force-reinstall', async () => {
      LOGGER.with('Socket Service').log('Force reinstall command received from server')
      await window.electron?.ipcRenderer?.invoke('launch:force-reinstall')
      showToast('Zlecono wymuszoną reinstalację plików gry na tobie przez technika', 'warning')
    })

    socket.on('events:refresh', async () => {
      LOGGER.with('Socket Service').log('Global events:refresh received')
      await eventsStore.fetchEvents()
    })

    // CHAT FLOW
    async function ensureActiveChatOpened(
      senderUUID: string,
      senderNickname?: string
    ): Promise<IChat | null> {
      let chat: IChat | undefined | null = chatsStore.activeChats.find((c) => c.uuid === senderUUID)
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
      chat = chatsStore.activeChats.find((c) => c.uuid === senderUUID) ?? null
      if (chat) chat.chatToggled = true
      return chat
    }

    socket.on(
      'player:receive-message',
      async (data: {
        senderUUID: string
        senderNickname?: string
        receiverUUID?: string
        receiverNickname?: string
        message: string
        timestamp?: number
      }) => {
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

    socket.on(
      'friends:request',
      async (payload: { inviterUUID?: string; inviterNickname: string }) => {
        LOGGER.with('Socket Service').log(
          'Player received friend request from: ' + payload.inviterNickname
        )

        await userStore.updateProfile()

        window.dispatchEvent(new CustomEvent('friends:request-refresh'))

        showToast('Nowe zaproszenie do znajomych od: ' + payload.inviterNickname, 'success')
      }
    )

    socket.on(
      'friends:cancel-request',
      async (payload: { inviterUUID?: string; inviterNickname: string }) => {
        LOGGER.with('Socket Service').log('Friend request cancelled by: ', payload.inviterNickname)

        await userStore.updateProfile()

        window.dispatchEvent(new CustomEvent('friends:request-refresh'))

        showToast(`${payload.inviterNickname} cofnął zaproszenie do znajomych`, 'success')
      }
    )

    socket.on(
      'friends:accept-request',
      async (payload: { invitedUUID?: string; invitedNickname: string }) => {
        await userStore.updateProfile()
        window.dispatchEvent(new CustomEvent('friends:list-refresh'))
        window.dispatchEvent(new CustomEvent('friends:request-refresh'))
        showToast(`${payload.invitedNickname} zaakceptował Twoje zaproszenie`, 'success')
      }
    )

    socket.on(
      'friends:reject-request',
      async (payload: { rejectedUUID?: string; rejectedNickname: string }) => {
        await userStore.updateProfile()
        window.dispatchEvent(
          new CustomEvent('users:list-refresh', {
            detail: { reason: 'reject', nickname: payload.rejectedNickname }
          })
        )
        window.dispatchEvent(new CustomEvent('friends:request-refresh'))
        showToast(`${payload.rejectedNickname} odrzucił Twoje zaproszenie`, 'error')
      }
    )

    socket.on(
      'friends:remove',
      async (payload: { friendUUID?: string; friendNickname?: string }) => {
        const removedNick = payload.friendNickname ?? 'Znajomy'
        LOGGER.with('Socket Service').log('Friend removed you: ', removedNick)

        await userStore.updateProfile()

        if (userStore.user?.nickname) {
          userCache.invalidateFriends(userStore.user.nickname)
        }

        window.dispatchEvent(new CustomEvent('friends:request-refresh'))
        window.dispatchEvent(new CustomEvent('friends:list-refresh'))
        window.dispatchEvent(
          new CustomEvent('users:list-refresh', {
            detail: { reason: 'reject', nickname: payload.friendNickname }
          })
        )

        showToast(`${removedNick} usunął Cię ze znajomych`, 'success')
      }
    )
  }

  const emit = (event: string, data: unknown): void => {
    socket?.emit(event, data)
  }

  return { disconnect, connect, emit }
}
