import { defineStore } from 'pinia'
import { ref } from 'vue'

const useGeneralStore = defineStore('general', () => {
  const appVersion = ref<string>('dev')
  const isUpdateAvailable = ref<boolean>(false)

  const changeVersion = (newVer: string): void => {
    appVersion.value = newVer
  }

  const setUpdateAvailable = (update: boolean): void => {
    isUpdateAvailable.value = update
  }

  return {
    appVersion,
    changeVersion,
    isUpdateAvailable,
    setUpdateAvailable
  }
})

export default useGeneralStore
