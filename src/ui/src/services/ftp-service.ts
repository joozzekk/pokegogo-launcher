/* eslint-disable @typescript-eslint/no-explicit-any */
import { showProgressToast, showToast, traverseFileTree } from '@ui/utils'
import { computed, ComputedRef, Ref, ref } from 'vue'
import { LOGGER } from './logger-service'
import { FTPChannel } from '@ui/types/ftp'
import CreateFolderModal from '@ui/components/modals/CreateFolderModal.vue'

interface FTPService {
  currentFileName: Ref<string>
  currentFileContent: Ref<string>
  currentFolderFiles: Ref<FTPFile[]>
  currentFolder: Ref<string>
  getFolderContent: (folder?: string) => Promise<void>
  changeFolder: (name: string) => Promise<void>
  restoreFolder: (name: string) => Promise<void>
  uploadFile: () => Promise<void>
  uploadFolder: () => Promise<void>
  removeFile: (name: string) => Promise<void>
  openTextFile: (name: string) => Promise<void>
  openImageFile: (name: string) => Promise<void>
  saveFile: () => Promise<void>
  createFolder: (newFolder: string) => Promise<void>
  zipFolder: (folderName: string) => Promise<void> // Nowa metoda
  handleDrop: (ev: DragEvent) => Promise<void>
  loadingStatuses: Ref<boolean>
  dragActive: Ref<boolean>
  downloadFile: (name: string) => Promise<void>
  downloadFolder: (name: string) => Promise<void>
  searchQuery: Ref<string>
  fileIsImportant: (file: FTPFile) => boolean
  toggleImportant: (file: FTPFile) => Promise<void>
  handleZipFolder: (file: FTPFile) => Promise<void>
  mapPathToBreadCrumbs: (path: string) => string[]
  openCreateFolderModal: () => void
  filteredFiles: ComputedRef<FTPFile[]>
  breadcrumbs: ComputedRef<string[]>
  handleUploadFile: () => void
  handleUploadFolder: () => void
  isTextFile: (name: string) => boolean
  isImageFile: (name: string) => boolean
  isKnownFile: (name: string) => boolean
  inputFile: Ref<HTMLInputElement | null>
  inputFolder: Ref<HTMLInputElement | null>
  createFolderModal: Ref<InstanceType<typeof CreateFolderModal> | null>
}

export interface FTPFile {
  name: string
  type: number // lub string, zależnie od tego co zwraca ssh2-sftp-client (zazwyczaj 'd' lub '-')
  size: number
  modifiedAt: string
  isDirectory: boolean
  isFile: boolean
  // Nowe pola z Manifestu
  flag?: 'important' | 'ignore'
  isZipped?: boolean
  status?: 'normal' | 'zipped' | 'zipped-dirty'
  hash?: string
}

export const useFTP = (): FTPService => {
  const searchQuery = ref<string>('')
  const dragActive = ref<boolean>(false)
  const currentFileName = ref<string>('')
  const currentFileContent = ref<string>('')
  const currentFolder = ref<string>('')
  const currentFolderFiles = ref<FTPFile[]>([])
  const loadingStatuses = ref<boolean>(false)
  const createFolderModal = ref<InstanceType<typeof CreateFolderModal> | null>(null)

  const inputFile = ref<HTMLInputElement | null>(null)
  const inputFolder = ref<HTMLInputElement | null>(null)

  const getFolderContent = async (folder: string = ''): Promise<void> => {
    loadingStatuses.value = true
    const folderPath =
      currentFolder.value.length && !currentFolder.value.endsWith(folder)
        ? currentFolder.value + '/' + folder
        : folder

    try {
      const res = await window.electron.ipcRenderer?.invoke(FTPChannel.LIST_FILES, folderPath)

      currentFolder.value = folderPath
      currentFolderFiles.value = res.sort((a: FTPFile, b: FTPFile) => {
        if (a.isDirectory === b.isDirectory) {
          return a.name.localeCompare(b.name)
        }
        return a.isDirectory ? -1 : 1
      })
    } catch (err) {
      LOGGER.err(err as string)
      showToast('Nie udało się pobrać zawartości folderu', 'error')
      currentFolderFiles.value = []
    } finally {
      loadingStatuses.value = false
    }
  }

  const changeFolder = async (name: string): Promise<void> => {
    await getFolderContent(name)
  }

  const createFolder = async (newFolder: string): Promise<void> => {
    try {
      const res = await window.electron.ipcRenderer?.invoke(
        FTPChannel.CREATE_FOLDER,
        currentFolder.value,
        newFolder
      )

      if (res) {
        showToast('Folder pomyślnie utworzony.')
        await getFolderContent(currentFolder.value) // odświeżamy ten sam folder
      }
    } catch (err) {
      LOGGER.err(err as string)
      showToast('Wystąpił błąd podczas tworzenia folderu.', 'error')
    }
  }

  const zipFolder = async (folderName: string): Promise<void> => {
    const fullPath = currentFolder.value ? `${currentFolder.value}/${folderName}` : folderName

    const progress = showProgressToast(`Rozpoczynam pakowanie ${folderName}...`)
    progress?.updateProgress(0, 100, 'Inicjalizacja...')

    const progressHandler = (_event: any, data: { percent: number; message: string }): void => {
      progress?.updateProgress(data.percent, 100, data.message)
    }

    try {
      window.electron.ipcRenderer?.on(FTPChannel.ZIP_PROGRESS, progressHandler)

      await window.electron.ipcRenderer?.invoke(FTPChannel.ZIP_FOLDER, fullPath)

      progress?.updateProgress(100, 100, 'Gotowe!')
      progress?.close('Folder został spakowany pomyślnie.', 'success')

      await getFolderContent(currentFolder.value)
    } catch (err) {
      LOGGER.err(err as string)
      progress?.close('Błąd podczas pakowania folderu.', 'error')
    } finally {
      window.electron.ipcRenderer?.removeAllListeners('ftp:zip-progress')
    }
  }

  const uploadFolder = async (): Promise<void> => {
    if (!inputFolder?.value?.files?.length) return
    const files = Array.from(inputFolder.value.files)

    try {
      const progress = showProgressToast(`Wczytywanie plików...`)
      const resolvedFiles = await Promise.all(
        files.map(async (file) => ({
          path: file.webkitRelativePath || file.name,
          buffer: await file.arrayBuffer()
        }))
      )

      progress?.updateProgress(0, resolvedFiles.length, 'Przesyłanie plików...')

      window.electron.ipcRenderer?.on(
        FTPChannel.UPLOAD_FOLDER_PROGRESS,
        (_event, completed: number) => {
          progress?.updateProgress(completed, resolvedFiles.length, 'Przesyłanie plików...')
        }
      )

      try {
        const res = await window.electron.ipcRenderer?.invoke(
          FTPChannel.UPLOAD_FOLDER,
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
        }
      } catch (err) {
        progress?.close('Wystąpił błąd podczas przesyłania folderu.', 'error')
        throw err
      }
    } catch (err) {
      LOGGER.err(err as string)
      showToast('Wystąpił błąd inicjalizacji przesyłania.', 'error')
    } finally {
      if (inputFolder.value) inputFolder.value.value = ''
    }
  }

  const restoreFolder = async (name: string): Promise<void> => {
    if (!name) {
      currentFolder.value = ''
      await getFolderContent('')
      return
    }

    const prevFolder = currentFolder.value.substring(
      0,
      currentFolder.value.indexOf(name) + name.length
    )

    currentFolder.value = '' // Reset, żeby getFolderContent użył argumentu poprawnie
    await getFolderContent(prevFolder)
  }

  const uploadFile = async (): Promise<void> => {
    if (!inputFile?.value?.files?.length) return
    const files = Array.from(inputFile.value.files)
    const progress = showProgressToast(`Wysyłanie plików...`)

    try {
      let succeeded = 0
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const res = await window.electron.ipcRenderer?.invoke(
            FTPChannel.UPLOAD_FILE,
            currentFolder.value,
            await file.arrayBuffer(),
            file.name
          )
          if (res) succeeded++
          progress?.updateProgress(succeeded, files.length, 'Wysyłanie plików...')
        } catch (err) {
          LOGGER.err(err as string)
        }
      }

      if (succeeded > 0) await getFolderContent(currentFolder.value)
      progress?.close(`Wysłano pliki: ${succeeded}/${files.length}`, 'success')
    } catch (err) {
      LOGGER.err(err as string)
      progress?.close('Błąd przesyłania.', 'error')
    } finally {
      if (inputFile.value) inputFile.value.value = ''
    }
  }

  const downloadFile = async (name: string): Promise<void> => {
    const localPath = await window.electron.ipcRenderer?.invoke(FTPChannel.SELECT_DIRECTORY)
    if (!localPath) return

    const progress = showProgressToast(`Pobieranie pliku...`)
    try {
      const res = await window.electron.ipcRenderer?.invoke(
        FTPChannel.DOWNLOAD_FILE,
        localPath,
        currentFolder.value,
        name
      )

      if (res) {
        progress?.close(`Pomyślnie pobrano ${name}`, 'success')
        await getFolderContent(currentFolder.value)
      }
    } catch (err) {
      LOGGER.err(err as string)
      progress?.close('Wystąpił błąd podczas pobierania pliku.', 'error')
    }
  }

  const downloadFolder = async (name: string): Promise<void> => {
    const localPath = await window.electron.ipcRenderer?.invoke(FTPChannel.SELECT_DIRECTORY)
    if (!localPath) return

    const progress = showProgressToast(`Pobieranie folderu ${name}...`)

    window.electron.ipcRenderer?.on(
      FTPChannel.DOWNLOAD_FOLDER_PROGRESS,
      (_event, { completed, total }: { completed: number; total: number }) => {
        progress?.updateProgress(completed, total, `Pobieranie folderu ${name}...`)
      }
    )

    try {
      const res = await window.electron.ipcRenderer?.invoke(
        FTPChannel.DOWNLOAD_FOLDER,
        localPath,
        currentFolder.value,
        name
      )

      if (res) {
        progress?.close(`Pomyślnie pobrano folder ${name}`, 'success')
        await getFolderContent(currentFolder.value)
      }
    } catch (err) {
      LOGGER.err(err as string)
      progress?.close('Wystąpił błąd podczas pobierania folderu.', 'error')
    }
  }

  const removeFile = async (name: string): Promise<void> => {
    const progress = showProgressToast(`Usuwanie...`)
    try {
      const res = await window.electron.ipcRenderer?.invoke(
        FTPChannel.REMOVE_FILE,
        currentFolder.value,
        name
      )

      if (res) {
        progress?.close(`Pomyślnie usunięto ${name}`, 'success')
        await getFolderContent(currentFolder.value)
      }
    } catch (err) {
      LOGGER.err(err as string)
      progress?.close('Wystąpił błąd podczas usuwania.', 'error')
    }
  }

  const openTextFile = async (name: string): Promise<void> => {
    searchQuery.value = ''

    currentFileName.value = name
    try {
      const res = await window.electron.ipcRenderer?.invoke(
        FTPChannel.READ_FILE,
        currentFolder.value,
        name
      )
      if (res) currentFileContent.value = res
    } catch (err) {
      LOGGER.err(err as string)
      showToast('Błąd otwierania pliku', 'error')
    }
  }

  const openImageFile = async (name: string): Promise<void> => {
    searchQuery.value = ''

    currentFileName.value = name
    try {
      const base64Content: string = await window.electron.ipcRenderer?.invoke(
        FTPChannel.READ_IMAGE,
        currentFolder.value,
        name
      )
      if (base64Content) {
        const ext = name.split('.').pop()?.toLowerCase() || 'png'
        const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`
        currentFileContent.value = `data:${mime};base64,${base64Content}`
      }
    } catch (err) {
      LOGGER.err(err as string)
      showToast('Błąd otwierania obrazu', 'error')
    }
  }

  const saveFile = async (): Promise<void> => {
    try {
      const fileBlob = new Blob([currentFileContent.value])
      const fileBuffer = await fileBlob.arrayBuffer()
      const progress = showProgressToast(`Zapisuję plik...`)

      const res = await window.electron.ipcRenderer?.invoke(
        FTPChannel.UPLOAD_FILE,
        currentFolder.value,
        fileBuffer,
        currentFileName.value
      )

      if (res) {
        progress?.close('Zapisano pomyślnie.', 'success')
        currentFileContent.value = ''
        currentFileName.value = ''
        await getFolderContent(currentFolder.value)
      }
    } catch (err) {
      LOGGER.err(err as string)
      showToast('Błąd zapisu', 'error')
    }
  }

  const handleDrop = async (ev: DragEvent): Promise<void> => {
    ev.preventDefault()
    dragActive.value = false
    const dt = ev.dataTransfer
    if (!dt) return

    if (dt.items && dt.items.length) {
      const items = Array.from(dt.items)
      const hasDirectory = items.some((it) => (it as any).webkitGetAsEntry?.()?.isDirectory)

      if (hasDirectory) {
        const entries = items.map((it) => (it as any).webkitGetAsEntry())
        const fileEntriesArr = await Promise.all(
          entries.map((e) => (e ? traverseFileTree(e, '') : Promise.resolve([])))
        )
        const all = fileEntriesArr.flat()

        if (!all.length) return

        try {
          const progress = showProgressToast(`Wczytywanie plików...`)
          const resolvedFiles = await Promise.all(
            all.map(async ({ path, file }) => ({ path, buffer: await file.arrayBuffer() }))
          )

          progress?.updateProgress(0, resolvedFiles.length, 'Przesyłanie plików...')

          window.electron.ipcRenderer?.on(
            FTPChannel.UPLOAD_FOLDER_PROGRESS,
            (_event, completed: number) => {
              progress?.updateProgress(completed, resolvedFiles.length, 'Przesyłanie plików...')
            }
          )

          try {
            const res = await window.electron.ipcRenderer?.invoke(
              FTPChannel.UPLOAD_FOLDER,
              currentFolder.value,
              resolvedFiles,
              0
            )

            if (res) {
              window.electron.ipcRenderer.removeAllListeners('ftp:upload-folder-progress')
              await getFolderContent(currentFolder.value)
              progress?.updateProgress(
                resolvedFiles.length,
                resolvedFiles.length,
                'Przesyłanie plików...'
              )
              progress?.close(
                `Folder został przesłany: ${resolvedFiles.length}/${resolvedFiles.length}`,
                'success'
              )
            } else {
              progress?.close('Wystąpił błąd podczas przesyłania folderu.', 'error')
            }
          } catch (err) {
            progress?.close('Wystąpił błąd podczas przesyłania folderu.', 'error')
            LOGGER.with('FTP').err((err as Error).message ?? err)
          }
        } catch (err) {
          LOGGER.with('FTP').err((err as Error).message ?? err)
        }

        return
      }
    }

    if (dt.files && dt.files.length) {
      const files = Array.from(dt.files)
      const progress = showProgressToast(`Wysyłanie plików...`)

      try {
        let succeeded = 0
        for (const file of files) {
          try {
            const res = await window.electron.ipcRenderer?.invoke(
              FTPChannel.UPLOAD_FILE,
              currentFolder.value,
              await file.arrayBuffer(),
              file.name
            )

            if (res) {
              succeeded++
              progress?.updateProgress(succeeded, files.length)
              showToast(`Plik ${file.name} został przesłany pomyślnie.`)
            }
          } catch (err) {
            LOGGER.with('FTP').err((err as Error).message ?? err)
            progress?.updateProgress(succeeded, files.length)
          }
        }

        if (succeeded > 0) await getFolderContent()
        progress?.updateProgress(succeeded, files.length)
        progress?.close(`Wysłano pliki: ${succeeded}/${files.length}`, 'success')
      } catch (err) {
        LOGGER.with('FTP').err((err as Error).message ?? err)
        progress?.close('Wystąpił błąd podczas przesyłania plików.', 'error')
      }
    }
  }

  const fileIsImportant = (file: FTPFile): boolean => {
    return file.flag === 'important'
  }

  const toggleImportant = async (file: FTPFile): Promise<void> => {
    const newFlag = file.flag === 'important' ? 'ignore' : 'important'

    const progress = showProgressToast(`Aktualizuję status...`)

    try {
      await window.electron.ipcRenderer?.invoke(
        FTPChannel.SET_HASH_FLAG,
        currentFolder.value,
        file.name,
        newFlag
      )

      await getFolderContent(currentFolder.value)
      progress?.close('Pomyślnie zaktualizowano.', 'success')
    } catch (e) {
      LOGGER.with('FTP').err((e as Error).message)
      progress?.close('Błąd aktualizacji.', 'error')
    }
  }

  const handleZipFolder = async (file: FTPFile): Promise<void> => {
    if (!file.isDirectory) return
    await zipFolder(file.name)
  }

  const mapPathToBreadCrumbs = (path: string): string[] => {
    return path.split('/').filter(Boolean)
  }

  const openCreateFolderModal = (): void => {
    createFolderModal.value?.openModal()
  }

  const filteredFiles = computed(() => {
    const files = currentFolderFiles.value
      ? [...currentFolderFiles.value]
          .sort((a: FTPFile) => (a.name?.endsWith('.zip') ? 1 : -1))
          .sort((a: FTPFile) => (a.isDirectory ? -1 : 1))
          .sort((a: FTPFile) => (a.isZipped ? -1 : 1))
      : []

    if (!searchQuery.value) return files

    const query = searchQuery.value.toLowerCase()
    return files.filter((file) => file.name.toLowerCase().includes(query))
  })

  const breadcrumbs = computed(() => {
    return mapPathToBreadCrumbs(currentFolder.value)
  })

  const handleUploadFile = (): void => {
    inputFile.value?.click()
  }

  const handleUploadFolder = (): void => {
    inputFolder.value?.click()
  }

  const isTextFile = (name: string): boolean => {
    return /\.(txt|log|md|csv|json|xml|yml|yaml|conf|properties|js|ts|css|html|vue|hashes)$/i.test(
      name
    )
  }

  const isImageFile = (name: string): boolean => {
    return /\.(png|jpg|jpeg|gif|bmp|svg|webp)$/i.test(name)
  }

  const isKnownFile = (name: string): boolean => isTextFile(name) || isImageFile(name)

  return {
    searchQuery,
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
    saveFile,
    dragActive,
    handleDrop,
    zipFolder,
    loadingStatuses,
    downloadFile,
    downloadFolder,
    fileIsImportant,
    toggleImportant,
    handleZipFolder,
    mapPathToBreadCrumbs,
    openCreateFolderModal,
    filteredFiles,
    breadcrumbs,
    handleUploadFile,
    handleUploadFolder,
    isTextFile,
    isImageFile,
    isKnownFile,
    inputFile,
    inputFolder,
    createFolderModal
  }
}
