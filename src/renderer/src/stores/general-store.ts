import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

const useGeneralStore = defineStore('general', () => {
  const appVersion = ref<string>('dev')
  const isUpdateAvailable = ref<boolean>(false)
  const settings = reactive({
    resolution: '1366x768'
  })

  const changeVersion = (newVer: string): void => {
    appVersion.value = newVer
  }

  const setUpdateAvailable = (update: boolean): void => {
    isUpdateAvailable.value = update
  }

  return {
    settings,
    appVersion,
    changeVersion,
    isUpdateAvailable,
    setUpdateAvailable
  }
})

export default useGeneralStore
