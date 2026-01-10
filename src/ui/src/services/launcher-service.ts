/* eslint-disable @typescript-eslint/no-explicit-any */
import { getEvents, getPlayers, updateMachineData, updateProfileData } from '@ui/api/endpoints'
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import {
  isMachineIDBanned,
  loadCustomOrFallbackHead,
  refreshMicrosoftToken,
  showToast
} from '@ui/utils'
import { ref, watch, type Ref } from 'vue'
import { useSocketService } from './socket-service'
import { AccountType } from '@ui/types/app'
import { IUser } from '@ui/env'

export const useLauncherService = (): {
  useVariables: () => {
    refreshInterval: Ref<any>
    events: Ref<any[]>
    allPlayers: Ref<IUser[]>
    filteredPlayers: Ref<IUser[]>
    isLoadingPlayers: Ref<boolean>
    hasMorePlayers: Ref<boolean>
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
    disconnect: () => void
  }
} => {
  const currentPage = ref(1)
  const itemsPerPage = ref(24)
  const allPlayers = ref<IUser[]>([])
  const filteredPlayers = ref<IUser[]>([])
  const isLoadingPlayers = ref<boolean>(false)
  const hasMorePlayers = ref<boolean>(true)

  const refreshInterval = ref<any>(null)
  const generalStore = useGeneralStore()
  const userStore = useUserStore()
  const { connect, disconnect } = useSocketService()

  const events = ref<any[]>([])

  watch(
    () => userStore.user,
    () => {
      if (userStore.user) connect(userStore.user.uuid)
    }
  )

  const startMicrosoftTokenRefreshInterval = (): void => {
    if (userStore.user?.accountType === 'microsoft') {
      refreshInterval.value = setInterval(
        async () => {
          const res = await refreshMicrosoftToken(
            localStorage.getItem(`msToken:${userStore.user?.nickname}`)
          )

          if (res) {
            localStorage.setItem(`msToken:${userStore.user?.nickname}`, res.msToken)
            localStorage.setItem('mcToken', res.mcToken)
          }
        },
        1000 * 60 * 60
      )
    }
  }

  const setMachineData = async (): Promise<void> => {
    const machineData = await window.electron?.ipcRenderer?.invoke('data:machine')

    if (machineData)
      generalStore.setMachineData(
        machineData.machineId,
        machineData.macAddress,
        machineData.ipAddress
      )
  }

  const fetchUpdateData = async (): Promise<void> => {
    await userStore.updateProfile()
    await setMachineData()

    if (userStore.user) {
      await updateProfileData({
        accountType: userStore.user?.accountType
          ? userStore.user?.mcid
            ? AccountType.MICROSOFT
            : AccountType.BACKEND
          : AccountType.BACKEND
      })

      await updateMachineData({
        machineId: generalStore.settings.machineId,
        macAddress: generalStore.settings.macAddress,
        ipAddress: generalStore.settings.ipAddress
      })

      await isMachineIDBanned()
    }
  }

  const fetchEvents = async (): Promise<void> => {
    events.value = await getEvents()
  }

  async function fetchPlayers(query?: string, reset: boolean = false): Promise<void> {
    if (isLoadingPlayers.value || (!hasMorePlayers.value && !reset)) return

    isLoadingPlayers.value = true

    if (reset) {
      currentPage.value = 1
      hasMorePlayers.value = true
    }

    try {
      const res = await getPlayers(
        currentPage.value,
        itemsPerPage.value,
        query ?? generalStore.searchQuery
      )

      if (res) {
        if (res.length < itemsPerPage.value) {
          hasMorePlayers.value = false
        }

        const mappedPlayers = await Promise.all(
          res.map(async (player) => {
            const headUrl = await loadCustomOrFallbackHead(player)
            return {
              ...player,
              headUrl
            }
          })
        )

        if (reset) {
          allPlayers.value = mappedPlayers
          filteredPlayers.value = mappedPlayers
        } else {
          allPlayers.value = [...allPlayers.value, ...mappedPlayers]
          filteredPlayers.value = [...filteredPlayers.value, ...mappedPlayers]
        }

        if (res.length > 0) {
          currentPage.value++
        }
      } else {
        hasMorePlayers.value = false
      }
    } catch (error) {
      console.error('Błąd pobierania graczy:', error)
      showToast('Błąd pobierania listy graczy', 'error')
    } finally {
      isLoadingPlayers.value = false
    }
  }

  const handleRefreshDataAndProfile = async (): Promise<void> => {
    await fetchPlayers(generalStore.searchQuery, true)

    if (userStore.selectedProfile) {
      const newProfile = allPlayers.value.find(
        (player) => player.uuid === userStore.selectedProfile?.uuid
      )

      if (newProfile) userStore.updateSelectedProfile(newProfile)
    }
  }

  return {
    useVariables: () => ({
      refreshInterval,
      events,
      allPlayers,
      filteredPlayers,
      isLoadingPlayers,
      hasMorePlayers
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
      disconnect
    })
  }
}
