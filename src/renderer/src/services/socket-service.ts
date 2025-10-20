import io, { type Socket } from 'socket.io-client'
import { LOGGER } from './logger-service'

export const useSocket = (): Socket => {
  const socket = io(import.meta.env.RENDERER_VITE_SOCKET_URL)

  socket.on('connect', async () => {
    LOGGER.success('Connected to websocket.')
  })

  socket.on('error', (err) => {
    LOGGER.err('Error with socket connection: ', err)
  })

  socket.on('disconnect', () => {
    LOGGER.success('Disconected from websocket')
  })

  return socket
}
