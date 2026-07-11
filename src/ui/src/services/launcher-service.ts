/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPlayers, updateMachineData, updateProfileData } from '@ui/api/endpoints'
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import {
  isMachineIDBanned,
  loadCustomOrFallbackHead,
  refreshMicrosoftToken,
  showToast
} from '@ui/utils'
import { ref, watch, computed, type Ref } from 'vue'
import { useSocketService } from './socket-service'
import { AccountType } from '@ui/types/app'
import { IUser } from '@ui/env'
import { usePlayersStore } from '@ui/stores/players-store'
import { useEventsStore } from '@ui/stores/events-store'
import { LOGGER } from './logger-service'

export const useLauncherService = (): {
  useVariables: () => {
    refreshInterval: Ref<any>
    events: Ref<any[]>
    allPlayers: Ref<IUser[]>
    filteredPlayers: Ref<IUser[]>
    isLoadingPlayers: Ref<boolean>
    hasMorePlayers: Ref<boolean>
    itemsPerPage: Ref<number>
  }
  useFetches: () => {
    fetchUpdateData: () => Promise<void>
    fetchEvents: () => Promise<void>
    fetchPlayers: (query?: string, reset?: boolean) => Promise<void>
  }
  useMethods: () => {
    startMicrosoftTokenRefreshInterval: () => void
    setMachineData: () => Promise<void>
    handleRefreshDataAndProfile: () => Promise<void>
    setItemsPerPage: (limit: number) => void
    disconnect: () => void
  }
} => {
  const playersStore = usePlayersStore()
  const itemsPerPage = ref(
    localStorage.getItem('players_limit') ? parseInt(localStorage.getItem('players_limit')!) : -1
  )
  let fetchAbortController: AbortController | null = null

  const refreshInterval = ref<any>(null)
  const generalStore = useGeneralStore()
  const userStore = useUserStore()
  const { connect, disconnect } = useSocketService()
  const eventsStore = useEventsStore()

  // Remove local events ref

  watch(
    () => userStore.user,
    () => {
      if (userStore.user) connect(userStore.user.uuid, userStore.user.nickname)
    }
  )

  const startMicrosoftTokenRefreshInterval = (): void => {
    if (userStore.user?.accountType === 'microsoft') {
      refreshInterval.value = setInterval(
        async () => {
          const res = await refreshMicrosoftToken(
            localStorage.getItem(`msToken:${userStore.user?.nickname?.toLowerCase()}`)
          )

          if (res) {
            localStorage.setItem(`msToken:${userStore.user?.nickname?.toLowerCase()}`, res.msToken)
            localStorage.setItem('mcToken', res.mcToken)
          }
        },
        1000 * 60 * 60
      )
    }
  }

  const setMachineData = async (): Promise<void> => {
    let machineData = {
      machineId: '',
      macAddress: '',
      ipAddress: ''
    }

    try {
      machineData = await window.electron?.ipcRenderer?.invoke('data:machine')
    } catch {
      // ignore
    }

    // Fallback logic for safety (should be handled by main process now)
    if (!machineData?.machineId) {
      machineData.machineId = generalStore.settings.machineId || 'unknown-device'
    }

    if (machineData) {
      generalStore.setMachineData(
        machineData.machineId,
        machineData.macAddress,
        machineData.ipAddress
      )
    }
  }

  const fetchUpdateData = async (): Promise<void> => {
    try {
      await userStore.updateProfile()
      await setMachineData()

      if (userStore.user) {
        // Prepare machine data
        const mData = {
          machineId: generalStore.settings.machineId || 'unknown-device',
          macAddress: generalStore.settings.macAddress || '',
          ipAddress: generalStore.settings.ipAddress || ''
        }

        // 1. Update Profile Metadata
        await updateProfileData({
          accountType: userStore.user?.accountType
            ? userStore.user?.mcid
              ? AccountType.MICROSOFT
              : AccountType.BACKEND
            : AccountType.BACKEND
        })

        // 2. Sync HWID / Machine Data (with small delay to ensure store update)
        setTimeout(async () => {
          try {
            await updateMachineData(mData)
            LOGGER.with('Launcher Service').success('Dane HWID zsynchronizowane pomyślnie.')
          } catch (err) {
            LOGGER.with('Launcher Service').warn(
              'Błąd synchronizacji HWID, zostanie ponowiony przy następnej okazji.',
              `${err}`
            )
          }
        }, 2000)

        // 3. Global ban check
        await isMachineIDBanned()
      }
    } catch (err) {
      LOGGER.with('Launcher Service').err('Błąd podczas aktualizacji danych launchera:', `${err}`)
    }
  }

  const fetchEvents = async (): Promise<void> => {
    await eventsStore.fetchEvents()
  }

  async function fetchPlayers(query?: string, reset: boolean = false): Promise<void> {
    // If not a reset (infinite scroll), and already loading or no more items, skip
    if (!reset && (playersStore.isLoading || !playersStore.hasMore)) return

    // If it's a reset (search/refresh), abort previous request if in flight
    if (reset && fetchAbortController) {
      fetchAbortController.abort()
    }

    playersStore.isLoading = true

    if (reset) {
      playersStore.reset()
    }

    fetchAbortController = new AbortController()

    try {
      const q = query ?? generalStore.searchQuery
      const isFixedLimit = itemsPerPage.value !== -1
      const limit = isFixedLimit ? itemsPerPage.value : 20

      const res = await getPlayers(playersStore.currentPage, limit, q)

      if (res) {
        if (isFixedLimit) {
          playersStore.hasMore = false
        } else if (res.length < limit) {
          playersStore.hasMore = false
        }

        const mappedPlayers = await Promise.all(
          res.map(async (player: IUser) => {
            const headUrl = await loadCustomOrFallbackHead(player)
            return {
              ...player,
              headUrl
            }
          })
        )

        if (reset) {
          playersStore.setPlayers(mappedPlayers)
        } else {
          playersStore.appendPlayers(mappedPlayers)
        }
      } else {
        playersStore.hasMore = false
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('Błąd pobierania graczy:', error)
      showToast('Błąd pobierania listy graczy', 'error')
    } finally {
      playersStore.isLoading = false
      fetchAbortController = null
    }
  }

  function setItemsPerPage(limit: number): void {
    itemsPerPage.value = limit
    localStorage.setItem('players_limit', limit.toString())
    fetchPlayers(generalStore.searchQuery, true)
  }

  const handleRefreshDataAndProfile = async (): Promise<void> => {
    await fetchPlayers(generalStore.searchQuery, true)

    if (userStore.selectedProfile) {
      const newProfile = playersStore.allPlayers.find(
        (player) => player.uuid === userStore.selectedProfile?.uuid
      )

      if (newProfile) userStore.updateSelectedProfile(newProfile)
    }
  }

  return {
    useVariables: () => ({
      refreshInterval,
      events: computed(() => eventsStore.events),
      allPlayers: computed(() => playersStore.allPlayers),
      filteredPlayers: computed(() => playersStore.filteredPlayers),
      isLoadingPlayers: computed(() => playersStore.isLoading),
      hasMorePlayers: computed(() => playersStore.hasMore),
      itemsPerPage
    }),
    useFetches: () => ({
      fetchUpdateData,
      fetchEvents,
      fetchPlayers
    }),
    useMethods: () => ({
      startMicrosoftTokenRefreshInterval,
      setMachineData,
      handleRefreshDataAndProfile,
      setItemsPerPage,
      disconnect
    })
  }
}
