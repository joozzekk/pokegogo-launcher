import io, { type Socket } from 'socket.io-client'

export const useSocket = (): Socket => {
  const socket = io(import.meta.env.RENDERER_VITE_API_URL)

  socket.on('connect', async () => {
    console.log('Connected to websocket.')
  })

  socket.on('disconnect', () => {
    console.log('Disconected from websocket')
  })

  return socket
}
