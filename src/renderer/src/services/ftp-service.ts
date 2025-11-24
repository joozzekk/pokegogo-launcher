import { showProgressToast, showToast } from '@renderer/utils'
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
  openTextFile: (name: string) => Promise<void>
  openImageFile: (name: string) => Promise<void>
  saveFile: () => Promise<void>
  createFolder: (newFolder: string) => Promise<void>
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

  const createFolder = async (newFolder: string): Promise<void> => {
    try {
      const res = await window.electron.ipcRenderer?.invoke(
        'ftp:create-folder',
        currentFolder.value,
        newFolder
      )

      if (res) {
        showToast('Folder pomyślnie utworzony.')
        await getFolderContent(currentFolder.value)
      }
    } catch (err) {
      LOGGER.err(err as string)
      showToast('Wystąpił błąd podczas tworzenia folderu.', 'error')
    }
  }

  const uploadFolder = async (): Promise<void> => {
    if (!inputFolder?.value?.files?.length) return
    const files = Array.from(inputFolder.value.files)

    try {
      const resolvedFiles = await Promise.all(
        files.map(async (file) => ({
          path: file.webkitRelativePath || file.name,
          buffer: await file.arrayBuffer()
        }))
      )

      const progress = showProgressToast(`Wysyłanie folderu... Status: 0/${resolvedFiles.length}`)

      window.electron.ipcRenderer?.on('ftp:upload-folder-progress', (_event, completed: number) => {
        progress?.update(`Wysyłanie folderu... Status: ${completed}/${resolvedFiles.length}`)
      })

      try {
        const res = await window.electron.ipcRenderer?.invoke(
          'ftp:upload-folder',
          currentFolder.value,
          resolvedFiles,
          0
        )

        window.electron.ipcRenderer.removeAllListeners('ftp:upload-folder-progress')

        if (res) {
          progress?.close(`Pomyślnie przesłano folder.`, 'success')
          await getFolderContent(currentFolder.value)
        } else {
          progress?.close('Wystąpił błąd podczas przesyłania folderu.', 'error')
          showToast('Wystąpił błąd podczas przesyłania folderu.', 'error')
        }
      } catch (err) {
        progress?.close('Wystąpił błąd podczas przesyłania folderu.', 'error')
        throw err
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

    const progress = showProgressToast(`Wysyłanie plików: 0/${files.length}`)

    try {
      let succeeded = 0
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const res = await window.electron.ipcRenderer?.invoke(
            'ftp:upload-file',
            currentFolder.value,
            await file.arrayBuffer(),
            file.name
          )

          if (res) {
            succeeded++
            progress?.update(`Wysyłanie plików: ${succeeded}/${files.length}`)
            showToast('Pomyślnie przesłano plik ' + file.name)
          }
        } catch (err) {
          LOGGER.err(err as string)
          // continue with next file
          progress?.update(
            `Wysyłanie plików: ${succeeded}/${files.length} (błąd przy ${file.name})`
          )
        }
      }

      if (succeeded > 0) await getFolderContent(currentFolder.value)

      progress?.close(`Wysłano pliki: ${succeeded}/${files.length}`, 'success')
    } catch (err) {
      LOGGER.err(err as string)
      progress?.close('Wystąpił błąd podczas przesyłania plików.', 'error')
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

  const openTextFile = async (name: string): Promise<void> => {
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

  const openImageFile = async (name: string): Promise<void> => {
    currentFileName.value = name

    try {
      const base64Content: string = await window.electron.ipcRenderer?.invoke(
        'ftp:read-image',
        currentFolder.value,
        name
      )

      if (base64Content) {
        const fileExtension = name.split('.').pop()?.toLowerCase() || 'png'
        const mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}` // obsługa .jpg -> image/jpeg

        const imageUrl = `data:${mimeType};base64,${base64Content}`

        currentFileContent.value = imageUrl
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

      const progress = showProgressToast(`Zapisuję plik ${currentFileName.value}...`)

      const res = await window.electron.ipcRenderer?.invoke(
        'ftp:upload-file',
        currentFolder.value,
        fileBuffer,
        currentFileName.value
      )

      if (res) {
        progress?.close(`Pomyślnie zapisano plik ${currentFileName.value}`, 'success')
        currentFileContent.value = ''
        currentFileName.value = ''
        await getFolderContent(currentFolder.value)
      } else {
        progress?.close('Wystąpił błąd podczas zapisywania pliku.', 'error')
        showToast('Wystąpił błąd podczas zapisywania pliku ' + currentFileName.value, 'error')
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
    openTextFile,
    openImageFile,
    createFolder,
    saveFile
  }
}
