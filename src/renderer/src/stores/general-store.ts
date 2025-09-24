import { defineStore } from 'pinia'
import { ref } from 'vue'

const useGeneralStore = defineStore('general', () => {
  const appVersion = ref<string>('dev')

  const changeVersion = (newVer: string): void => {
    appVersion.value = newVer
  }

  return {
    appVersion,
    changeVersion
  }
})

export default useGeneralStore
