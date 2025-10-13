import { Ref, ref } from 'vue'

interface FTPService {
  currentFolderFiles: Ref<FTPFile[]>
  currentFolder: Ref<string>
  getFolderContent: () => Promise<void>
  isFolder: (name: string) => boolean
  changeFolder: (name: string) => Promise<void>
  restoreFolder: (name: string) => Promise<void>
}

interface FTPFile {
  name: string
  type: number
  size: number
  rawModifiedAt: string
}

export const useFTP = (): FTPService => {
  const currentFolder = ref<string>('')
  const currentFolderFiles = ref<FTPFile[]>([])

  const getFolderContent = async (folder: string = 'mc'): Promise<void> => {
    const folderPath = currentFolder.value.length ? currentFolder.value + '/' + folder : folder
    const res = await window.electron.ipcRenderer?.invoke('ftp:list-files', folderPath)

    currentFolder.value = folderPath
    currentFolderFiles.value = res
  }

  const isFolder = (name: string): boolean => {
    // eslint-disable-next-line no-useless-escape
    return !/^[^\\\/:\*\?"<>\|]+(\.[^\\\/:\*\?"<>\|]+)+$/.test(name)
  }

  const changeFolder = async (name: string): Promise<void> => {
    await getFolderContent(name)
  }

  const restoreFolder = async (name: string): Promise<void> => {
    console.log(currentFolder.value.slice(currentFolder.value.lastIndexOf(name)))
  }

  return {
    currentFolderFiles,
    getFolderContent,
    isFolder,
    currentFolder,
    changeFolder,
    restoreFolder
  }
}
