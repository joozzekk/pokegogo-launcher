import io, { type Socket } from 'socket.io-client'
import { LOGGER } from './logger-service'
import api from '@ui/utils/client'
import { isMachineIDBanned, showToast } from '@ui/utils'
import useUserStore from '@ui/stores/user-store'

export const useSocketService = (): {
  connect: (uuid: string) => void
} => {
  let socket: Socket | null = null
  const userStore = useUserStore()

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
    socket = io(import.meta.env.RENDERER_VITE_SOCKET_URL, {
      query: {
        uuid
      }
    })

    socket.on('connect', async () => {
      LOGGER.with('Socket Service').success(`Connected to websocket with uuid: `, uuid)
    })

    socket.on('error', (err) => {
      LOGGER.with('Socket Service').err('Error with socket connection: ', err)
    })

    socket.on('disconnect', () => {
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
        location.reload()
      }
    })
  }

  return {
    connect
  }
}
