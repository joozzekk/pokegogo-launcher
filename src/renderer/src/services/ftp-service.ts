import { showToast } from '@renderer/utils'
import { Ref, ref } from 'vue'
import { LOGGER } from './logger-service'

interface FTPService {
  currentFileName: Ref<string>
  currentFileContent: Ref<string>
  currentFolderFiles: Ref<FTPFile[]>
  currentFolder: Ref<string>
  getFolderContent: () => Promise<void>
  changeFolder: (name: string) => Promise<void>
  restoreFolder: (name: string) => Promise<void>
  uploadFile: () => Promise<void>
  uploadFolder: () => Promise<void>
  removeFile: (name: string) => Promise<void>
  openFile: (name: string) => Promise<void>
  saveFile: () => Promise<void>
}

interface FTPFile {
  name: string
  type: number
  size: number
  modifiedAt: string
  isDirectory: boolean
  isFile: boolean
}

export const useFTP = (
  inputFile?: Ref<HTMLInputElement | null>,
  inputFolder?: Ref<HTMLInputElement | null>
): FTPService => {
  const currentFileName = ref<string>('')
  const currentFileContent = ref<string>('')
  const currentFolder = ref<string>('')
  const currentFolderFiles = ref<FTPFile[]>([])

  const getFolderContent = async (folder: string = ''): Promise<void> => {
    const folderPath =
      currentFolder.value.length && !currentFolder.value.endsWith(folder)
        ? currentFolder.value + '/' + folder
        : folder
    const res = await window.electron.ipcRenderer?.invoke('ftp:list-files', folderPath)

    currentFolder.value = folderPath
    currentFolderFiles.value = res
  }

  const changeFolder = async (name: string): Promise<void> => {
    await getFolderContent(name)
  }

  const uploadFolder = async (): Promise<void> => {
    if (!inputFolder?.value?.files?.length) return

    const files = Array.from(inputFolder.value.files).map(async (file) => ({
      path: file.webkitRelativePath || file.name,
      buffer: await file.arrayBuffer()
    }))

    try {
      // Resolve all file buffers before sending
      const resolvedFiles = await Promise.all(files)

      const res = await window.electron.ipcRenderer?.invoke(
        'ftp:upload-folder',
        currentFolder.value, // FTP remote folder
        resolvedFiles // array of {path, buffer}
      )

      if (res) {
        showToast('Folder pomyślnie przesłano.')
        await getFolderContent(currentFolder.value)
      }
    } catch (err) {
      LOGGER.err(err as string)
      showToast('Wystąpił błąd podczas przesyłania folderu.', 'error')
    } finally {
      inputFolder.value.value = ''
    }
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
      LOGGER.err(err as string)
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
        showToast('Pomyślnie usunięto ' + name)
        currentFileContent.value = res
        await getFolderContent(currentFolder.value)
      }
    } catch (err) {
      LOGGER.err(err as string)
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
      LOGGER.err(err as string)
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
      LOGGER.err(err as string)
      showToast('Wystąpił błąd podczas zapisywania pliku ' + currentFileName.value, 'error')
    }
  }

  return {
    currentFileName,
    currentFileContent,
    currentFolderFiles,
    getFolderContent,
    currentFolder,
    changeFolder,
    restoreFolder,
    uploadFile,
    uploadFolder,
    removeFile,
    openFile,
    saveFile
  }
}
