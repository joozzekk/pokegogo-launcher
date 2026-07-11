import { defineStore } from 'pinia'
import { ref } from 'vue'
import { IUser } from '@ui/env'

export const usePlayersStore = defineStore('players', () => {
  const allPlayers = ref<IUser[]>([])
  const filteredPlayers = ref<IUser[]>([])
  const isLoading = ref<boolean>(false)
  const hasMore = ref<boolean>(true)
  const currentPage = ref(1)

  function updatePlayerStatus(identifier: string, isOnline: boolean): void {
    const updateInList = (list: IUser[]): void => {
      const player = list.find((p) => p.uuid === identifier || p.nickname === identifier)
      if (player) {
        player.isOnline = isOnline
      }
    }

    updateInList(allPlayers.value)
    updateInList(filteredPlayers.value)
  }

  function updatePlayerMcStatus(nickname: string, isMcOpened: boolean): void {
    const updateInList = (list: IUser[]): void => {
      const player = list.find((p) => p.nickname === nickname)
      if (player) {
        player.isMcOpened = isMcOpened
      }
    }

    updateInList(allPlayers.value)
    updateInList(filteredPlayers.value)
  }

  function setPlayers(players: IUser[]): void {
    // Ensure uniqueness by nickname just in case API returns duplicates
    const uniquePlayers = players.filter(
      (player, index, self) => index === self.findIndex((p) => p.nickname === player.nickname)
    )

    allPlayers.value = uniquePlayers
    filteredPlayers.value = uniquePlayers
    currentPage.value = 2 // Since we already fetched the first page
  }

  function appendPlayers(players: IUser[]): void {
    const existingNicknames = new Set(allPlayers.value.map((p) => p.nickname))
    const newPlayers = players.filter((p) => !existingNicknames.has(p.nickname))

    allPlayers.value = [...allPlayers.value, ...newPlayers]
    filteredPlayers.value = [...filteredPlayers.value, ...newPlayers]
    currentPage.value++
  }

  function reset(): void {
    allPlayers.value = []
    filteredPlayers.value = []
    hasMore.value = true
    currentPage.value = 1
  }

  return {
    allPlayers,
    filteredPlayers,
    isLoading,
    hasMore,
    currentPage,
    updatePlayerStatus,
    updatePlayerMcStatus,
    setPlayers,
    appendPlayers,
    reset
  }
})
