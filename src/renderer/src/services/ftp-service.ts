import { showToast } from '@renderer/utils'
import { Ref, ref } from 'vue'

interface FTPService {
  currentFileName: Ref<string>
  currentFileContent: Ref<string>
  currentFolderFiles: Ref<FTPFile[]>
  currentFolder: Ref<string>
  getFolderContent: () => Promise<void>
  isFolder: (name: string) => boolean
  changeFolder: (name: string) => Promise<void>
  restoreFolder: (name: string) => Promise<void>
  uploadFile: () => Promise<void>
  removeFile: (name: string) => Promise<void>
  openFile: (name: string) => Promise<void>
  saveFile: () => Promise<void>
}

interface FTPFile {
  name: string
  type: number
  size: number
  rawModifiedAt: string
}

export const useFTP = (inputFile?: Ref<HTMLInputElement | null>): FTPService => {
  const currentFileName = ref<string>('')
  const currentFileContent = ref<string>('')
  const currentFolder = ref<string>('')
  const currentFolderFiles = ref<FTPFile[]>([])

  const getFolderContent = async (folder: string = 'mc'): Promise<void> => {
    const folderPath =
      currentFolder.value.length && !currentFolder.value.endsWith(folder)
        ? currentFolder.value + '/' + folder
        : folder
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
    const prevFolder = currentFolder.value.substring(
      0,
      currentFolder.value.indexOf(name) + name.length
    )

    currentFolder.value = ''
    await getFolderContent(prevFolder)
  }

  const uploadFile = async (): Promise<void> => {
    if (!inputFile?.value?.files?.length) return

    const files = Array.from(inputFile.value.files)

    if (files.some((file) => file.size > 100 * 1024 * 1024)) {
      showToast('Rozmiar pliku lub plików przekracza 100MB')
      return
    }

    try {
      const res = await Promise.all(
        files.map(async (file) => {
          const res = await window.electron.ipcRenderer?.invoke(
            'ftp:upload-file',
            currentFolder.value,
            await file.arrayBuffer(),
            file.name
          )

          if (res) {
            showToast('Pomyślnie przesłano plik ' + file.name)
          }

          return res
        })
      )

      if (res) {
        await getFolderContent(currentFolder.value)
      }
    } catch (err) {
      console.log(err)
      showToast('Wystąpił błąd podczas przesyłania plików.', 'error')
    } finally {
      inputFile.value.value = ''
    }
  }

  const removeFile = async (name: string): Promise<void> => {
    try {
      const res = await window.electron.ipcRenderer?.invoke(
        'ftp:remove-file',
        currentFolder.value,
        name
      )

      if (res) {
        showToast('Pomyślnie usunięto plik')
        currentFileContent.value = res
      }
    } catch (err) {
      console.log(err)
      showToast('Wystąpił błąd podczas usuwania pliku ' + name, 'error')
    }
  }

  const openFile = async (name: string): Promise<void> => {
    currentFileName.value = name

    try {
      const res = await window.electron.ipcRenderer?.invoke(
        'ftp:read-file',
        currentFolder.value,
        name
      )
      if (res) {
        currentFileContent.value = res
      }
    } catch (err) {
      console.log(err)
      showToast('Wystąpił błąd podczas otwierania pliku ' + name, 'error')
    }
  }

  const saveFile = async (): Promise<void> => {
    try {
      const fileBlob = new Blob([currentFileContent.value])
      const fileBuffer = await fileBlob.arrayBuffer()

      const res = await window.electron.ipcRenderer?.invoke(
        'ftp:upload-file',
        currentFolder.value,
        fileBuffer,
        currentFileName.value
      )

      if (res) {
        currentFileContent.value = ''
        currentFileName.value = ''
        await getFolderContent(currentFolder.value)
        showToast('Pomyślnie zapisano plik ' + currentFileName.value)
      }
    } catch (err) {
      console.log(err)
      showToast('Wystąpił błąd podczas zapisywania pliku ' + currentFileName.value, 'error')
    }
  }

  return {
    currentFileName,
    currentFileContent,
    currentFolderFiles,
    getFolderContent,
    isFolder,
    currentFolder,
    changeFolder,
    restoreFolder,
    uploadFile,
    removeFile,
    openFile,
    saveFile
  }
}
