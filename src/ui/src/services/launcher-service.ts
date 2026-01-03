/* eslint-disable @typescript-eslint/no-explicit-any */
import { getEvents, getFriends, updateMachineData, updateProfileData } from '@ui/api/endpoints'
import useGeneralStore from '@ui/stores/general-store'
import useUserStore from '@ui/stores/user-store'
import { isMachineIDBanned, refreshMicrosoftToken } from '@ui/utils'
import { ref, type Ref } from 'vue'
import { useSocketService } from './socket-service'
import { AccountType } from '@ui/types/app'
import { useChatsStore } from '@ui/stores/chats-store'

export const useLauncherService = (): {
  useVariables: () => {
    refreshInterval: Ref<any>
    events: Ref<any[]>
  }
  useFetches: () => {
    fetchUpdateData: () => Promise<void>
    fetchEvents: () => Promise<void>
    fetchFriends: () => Promise<void>
  }
  useMethods: () => {
    startMicrosoftTokenRefreshInterval: () => void
    setMachineData: () => Promise<void>
  }
} => {
  const refreshInterval = ref<any>(null)
  const generalStore = useGeneralStore()
  const userStore = useUserStore()
  const chatsStore = useChatsStore()
  const { connect } = useSocketService()

  const events = ref<any[]>([])

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

      connect(userStore.user.uuid)
    }
  }

  const fetchEvents = async (): Promise<void> => {
    events.value = await getEvents()
  }

  const fetchFriends = async (): Promise<void> => {
    chatsStore.setFriends(await getFriends())
  }

  return {
    useVariables: () => ({
      refreshInterval,
      events
    }),
    useFetches: () => ({
      fetchUpdateData,
      fetchEvents,
      fetchFriends
    }),
    useMethods: () => ({
      startMicrosoftTokenRefreshInterval,
      setMachineData
    })
  }
}
