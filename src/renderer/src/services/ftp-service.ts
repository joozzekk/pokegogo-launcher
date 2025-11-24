/* eslint-disable @typescript-eslint/no-explicit-any */
import { showProgressToast, showToast, traverseFileTree } from '@renderer/utils'
import { Ref, ref } from 'vue'
import { LOGGER } from './logger-service'

interface FTPService {
  currentFileName: Ref<string>
  currentFileContent: Ref<string>
  currentFolderFiles: Ref<FTPFile[]>
  currentFolder: Ref<string>
  getFolderContent: () => Promise<void>
  getHashesForFolder: () => Promise<Record<string, { hash: string; flag?: 'important' | 'ignore' }>>
  currentHashes: Ref<Record<string, { hash: string; flag?: 'important' | 'ignore' }>>
  changeFolder: (name: string) => Promise<void>
  restoreFolder: (name: string) => Promise<void>
  uploadFile: () => Promise<void>
  uploadFolder: () => Promise<void>
  removeFile: (name: string) => Promise<void>
  openTextFile: (name: string) => Promise<void>
  openImageFile: (name: string) => Promise<void>
  saveFile: () => Promise<void>
  createFolder: (newFolder: string) => Promise<void>
  handleDrop: (ev: DragEvent) => Promise<void>
  isFolderAllImportant?: (folderName: string, manageLoading?: boolean) => Promise<boolean>
  loadingStatuses: Ref<boolean>
  dragActive: Ref<boolean>
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
  const dragActive = ref<boolean>(false)
  const currentFileName = ref<string>('')
  const currentFileContent = ref<string>('')
  const currentFolder = ref<string>('')
  const currentFolderFiles = ref<FTPFile[]>([])
  const currentHashes = ref<Record<string, { hash: string; flag?: 'important' | 'ignore' }>>({})
  const loadingStatuses = ref<boolean>(false)

  const getFolderContent = async (folder: string = ''): Promise<void> => {
    const folderPath =
      currentFolder.value.length && !currentFolder.value.endsWith(folder)
        ? currentFolder.value + '/' + folder
        : folder
    const res = await window.electron.ipcRenderer?.invoke('ftp:list-files', folderPath)

    currentFolder.value = folderPath
    currentFolderFiles.value = res
    try {
      const hashesRes = await window.electron.ipcRenderer?.invoke(
        'ftp:get-hash-entries',
        folderPath
      )
      if (hashesRes) currentHashes.value = hashesRes.entries ?? {}
    } catch {
      currentHashes.value = {}
    }
  }

  const getHashesForFolder = async (): Promise<
    Record<string, { hash: string; flag?: 'important' | 'ignore' }>
  > => {
    try {
      const hashesRes = await window.electron.ipcRenderer?.invoke(
        'ftp:get-hash-entries',
        currentFolder.value
      )
      if (hashesRes) {
        currentHashes.value = hashesRes.entries ?? {}
        return currentHashes.value
      }
    } catch {
      // ignore
    }
    return {}
  }

  const changeFolder = async (name: string): Promise<void> => {
    await getFolderContent(name)
  }

  const listFilesRecursive = async (folderPath: string): Promise<any[]> => {
    const results: any[] = []
    try {
      const list = await window.electron.ipcRenderer?.invoke('ftp:list-files', folderPath)
      if (!list) return results

      for (const item of list) {
        const childPath = folderPath.length ? `${folderPath}/${item.name}` : item.name
        if (item.isDirectory) {
          results.push({ path: childPath, isDirectory: true })
          const nested = await listFilesRecursive(childPath)
          results.push(...nested)
        } else {
          results.push({ path: childPath, isDirectory: false, name: item.name })
        }
      }
    } catch (err) {
      // ignore
    }
    return results
  }

  const isFolderAllImportant = async (
    folderName: string,
    manageLoading = true
  ): Promise<boolean> => {
    if (manageLoading) loadingStatuses.value = true
    try {
      const baseFolder = currentFolder.value.length
        ? `${currentFolder.value}/${folderName}`
        : folderName

      const checkDir = async (dirPath: string): Promise<boolean> => {
        try {
          const list = await window.electron.ipcRenderer?.invoke('ftp:list-files', dirPath)
          const hashesRes = await window.electron.ipcRenderer?.invoke(
            'ftp:get-hash-entries',
            dirPath
          )
          const hashes = hashesRes?.entries ?? {}

          for (const item of list) {
            const childPath = dirPath.length ? `${dirPath}/${item.name}` : item.name
            if (item.isDirectory) {
              const ok = await checkDir(childPath)
              if (!ok) return false
            } else {
              const entry = hashes[item.name]
              if (!entry || entry.flag !== 'important') return false
            }
          }
          return true
        } catch {
          return false
        }
      }

      const res = await checkDir(baseFolder)
      if (manageLoading) loadingStatuses.value = false
      return res
    } catch {
      if (manageLoading) loadingStatuses.value = false
      return false
    }
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
      const progress = showProgressToast(`Wczytywanie plików...`)
      const resolvedFiles = await Promise.all(
        files.map(async (file) => ({
          path: file.webkitRelativePath || file.name,
          buffer: await file.arrayBuffer()
        }))
      )

      // initialize progress bar to 0/N
      progress?.updateProgress(0, resolvedFiles.length, 'Przesyłanie plików...')

      window.electron.ipcRenderer?.on('ftp:upload-folder-progress', (_event, completed: number) => {
        progress?.updateProgress(completed, resolvedFiles.length, 'Przesyłanie plików...')
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
          progress?.updateProgress(
            resolvedFiles.length,
            resolvedFiles.length,
            'Pomyślnie przesłano folder. Status:'
          )
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

    const progress = showProgressToast(`Wysyłanie plików...`)

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
            progress?.updateProgress(succeeded, files.length, 'Wysyłanie plików...')
            showToast('Pomyślnie przesłano plik ' + file.name)
          }
        } catch (err) {
          LOGGER.err(err as string)
          // continue with next file
          progress?.updateProgress(succeeded, files.length, 'Wysyłanie plików...')
        }
      }

      if (succeeded > 0) await getFolderContent(currentFolder.value)

      progress?.updateProgress(succeeded, files.length, 'Wysyłanie plików...')
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
    const operationId = `remove-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    const progress = showProgressToast(`Usuwanie...`)

    const handler = (
      _event: any,
      data: { id?: string; total?: number; deleted?: number; current?: string }
    ): void => {
      if (!data || data.id !== operationId) return
      const total = data.total ?? 0
      const deleted = data.deleted ?? 0
      progress?.updateProgress(deleted, total, 'Usuwanie plików...')
      if (total && deleted >= total) {
        progress?.close(`Usunięto: ${deleted}/${total}`, 'success')
        window.electron.ipcRenderer.removeAllListeners('ftp:remove-progress')
      }
    }

    try {
      window.electron.ipcRenderer?.on('ftp:remove-progress', handler)

      const res = await window.electron.ipcRenderer?.invoke(
        'ftp:remove-file',
        currentFolder.value,
        name,
        operationId
      )

      window.electron.ipcRenderer.removeAllListeners('ftp:remove-progress')

      if (res) {
        progress?.close(`Pomyślnie usunięto ${name}`, 'success')
        currentFileContent.value = res
        await getFolderContent(currentFolder.value)
      }
    } catch (err) {
      LOGGER.err(err as string)
      window.electron.ipcRenderer.removeAllListeners('ftp:remove-progress')
      progress?.close('Wystąpił błąd podczas usuwania.', 'error')
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
            'ftp:upload-folder-progress',
            (_event, completed: number) => {
              progress?.updateProgress(completed, resolvedFiles.length, 'Przesyłanie plików...')
            }
          )

          try {
            const res = await window.electron.ipcRenderer?.invoke(
              'ftp:upload-folder',
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
            console.error(err)
          }
        } catch (err) {
          console.error(err)
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
              'ftp:upload-file',
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
            console.error(err)
            progress?.updateProgress(succeeded, files.length)
          }
        }

        if (succeeded > 0) await getFolderContent()
        progress?.updateProgress(succeeded, files.length)
        progress?.close(`Wysłano pliki: ${succeeded}/${files.length}`, 'success')
      } catch (err) {
        console.error(err)
        progress?.close('Wystąpił błąd podczas przesyłania plików.', 'error')
      }
    }
  }

  return {
    currentFileName,
    currentFileContent,
    currentFolderFiles,
    currentHashes,
    getFolderContent,
    getHashesForFolder,
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
    isFolderAllImportant,
    loadingStatuses
  }
}
