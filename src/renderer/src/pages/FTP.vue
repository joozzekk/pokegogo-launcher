<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import CreateFolderModal from '@renderer/components/modals/CreateFolderModal.vue'
import { useFTP } from '@renderer/services/ftp-service'
import { format } from 'date-fns'
import { computed, onMounted, ref, watch } from 'vue'
import { showProgressToast } from '@renderer/utils'

const showSearchInput = ref<boolean>(false)
const searchQuery = ref<string>('')
const inputFile = ref<HTMLInputElement | null>(null)
const inputFolder = ref<HTMLInputElement | null>(null)
const createFolderModal = ref<InstanceType<typeof CreateFolderModal> | null>(null)

const {
  currentFileName,
  currentFileContent,
  currentFolderFiles,
  currentHashes,
  getHashesForFolder,
  getFolderContent,
  changeFolder,
  currentFolder,
  restoreFolder,
  uploadFile,
  uploadFolder,
  createFolder,
  removeFile,
  openTextFile,
  openImageFile,
  saveFile,
  dragActive,
  handleDrop,
  isFolderAllImportant,
  loadingStatuses
} = useFTP(inputFile, inputFolder)

const folderImportantStatus = ref<Record<string, boolean>>({})

const refreshFolderStatuses = async (): Promise<void> => {
  const dirs = currentFolderFiles.value?.filter((f: any) => f.isDirectory) ?? []
  loadingStatuses.value = true
  try {
    for (const d of dirs) {
      try {
        // If parent hashes already contain a direct flag for this folder, prefer that
        const directParentFlag = currentHashes.value[d.name]?.flag === 'important'
        if (directParentFlag) {
          folderImportantStatus.value[d.name] = true
          continue
        }

        // Also consider parent hashes that reference files under this folder
        // e.g. entries like "1.21.1-fabric/1.21.1-fabric.json"
        const parentEntries = Object.entries(currentHashes.value).filter(
          ([k]) => k === d.name || k.startsWith(d.name + '/')
        )

        if (parentEntries.length) {
          // if all referenced entries under parent are marked important, treat folder as important
          const allImportant = parentEntries.every(([, v]) => v.flag === 'important')
          if (allImportant) {
            folderImportantStatus.value[d.name] = true
            continue
          }
        }

        // fallback: perform recursive check inside the folder
        const res = await isFolderAllImportant?.(d.name, false)
        folderImportantStatus.value[d.name] = !!res
      } catch {
        folderImportantStatus.value[d.name] = false
      }
    }
  } finally {
    loadingStatuses.value = false
  }
}

watch(currentFolderFiles, () => {
  refreshFolderStatuses()
})

const fileIsImportant = (file: any): boolean => {
  if (file.isDirectory) return !!folderImportantStatus.value[file.name]
  return currentHashes.value[file.name] && currentHashes.value[file.name].flag === 'important'
}

const toggleImportant = async (file: any): Promise<void> => {
  const current = currentHashes.value[file.name]?.flag
  const newFlag = current === 'important' ? 'ignore' : 'important'

  // If directory - use folder handler
  if (file.isDirectory) {
    const operationId = `set-flag-folder-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    const progress = showProgressToast(`Aktualizuję ustawienie folderu...`)

    const handler = (
      _event: any,
      data: { id?: string; total?: number; completed?: number; current?: string }
    ): void => {
      if (!data || data.id !== operationId) return
      progress?.updateProgress(data.completed ?? 0, data.total ?? 0, 'Aktualizuję pliki...')
      if ((data.total ?? 0) && (data.completed ?? 0) >= (data.total ?? 0)) {
        progress?.close(`Pomyślnie zaktualizowano folder.`, 'success')
        window.electron.ipcRenderer.removeAllListeners('ftp:set-flag-folder-progress')
      }
    }

    try {
      window.electron.ipcRenderer?.on('ftp:set-flag-folder-progress', handler)
      await window.electron.ipcRenderer?.invoke(
        'ftp:set-hash-flag-folder',
        currentFolder.value,
        file.name,
        newFlag,
        operationId
      )
      await getHashesForFolder()
      await refreshFolderStatuses()
    } catch (e) {
      console.error(e)
      progress?.close('Wystąpił błąd podczas aktualizacji folderu.', 'error')
      window.electron.ipcRenderer.removeAllListeners('ftp:set-flag-folder-progress')
    }

    return
  }

  // Single file
  const progress = showProgressToast(`Aktualizuję ustawienie pobierania...`)

  try {
    await window.electron.ipcRenderer?.invoke(
      'ftp:set-hash-flag',
      currentFolder.value,
      file.name,
      newFlag
    )
    await getHashesForFolder()
    progress?.close('Pomyślnie zaktualizowano ustawienie.', 'success')
  } catch (e) {
    console.error(e)
    progress?.close('Wystąpił błąd podczas aktualizacji.', 'error')
  }
}

const mapPathToBreadCrumbs = (path: string): string[] => {
  return path.split('/')
}

const openCreateFolderModal = (): void => {
  createFolderModal.value?.openModal()
}

const sortedFiles = computed(() => {
  const files = currentFolderFiles.value

  return (
    files
      ?.sort((a) => {
        // eslint-disable-next-line no-useless-escape
        return !/^[^\\\/:\*\?"<>\|]+(\.[^\\\/:\*\?"<>\|]+)+$/.test(a.name) ? -1 : 1
      })
      ?.sort((a) => (a.isDirectory ? -1 : 1))
      .filter((file) => !['hashes.txt'].includes(file.name)) ?? []
  )
})

const filteredFiles = computed(() => {
  return searchQuery.value?.length
    ? sortedFiles.value.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.value?.toLowerCase())
      )
    : sortedFiles.value
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

const handleShowSearch = (): void => {
  showSearchInput.value = !showSearchInput.value
  searchQuery.value = ''
}

const onDragEnter = (ev: DragEvent): void => {
  ev.preventDefault()
  dragActive.value = true
}

const onDragOver = (ev: DragEvent): void => {
  ev.preventDefault()
  dragActive.value = true
}

const onDragLeave = (ev: DragEvent): void => {
  ev.preventDefault()
  // Only deactivate when leaving the root element
  dragActive.value = false
}

const isTextFile = (name: string): boolean => {
  return ['.txt', '.log', '.md', '.csv', '.json', '.xml', '.yml', '.yaml', '.conf'].includes(
    name.slice(name.lastIndexOf('.'))
  )
}

const isImageFile = (name: string): boolean => {
  return ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'].includes(
    name.slice(name.lastIndexOf('.'))
  )
}

const isKnownFile = (name: string): boolean => {
  return [
    '.properties',
    '.txt',
    '.css',
    '.js',
    '.ts',
    '.html',
    '.json',
    '.scss',
    '.vue',
    '.yml',
    '.yaml',
    '.conf',
    '.toml',
    '.csv',
    '.md',
    '.lst',
    '.log'
  ].includes(name.slice(name.lastIndexOf('.')))
}

onMounted(async () => {
  await getFolderContent()
})
</script>

<template>
  <div
    class="relative flex flex-col w-full text-[var(--text-secondary)] max-h-full rounded-xl border-dashed border-1 border-[var(--border)]"
    :class="{
      'border bg-[var(--bg-light)]/30': dragActive,
      'overflow-y-hidden': loadingStatuses,
      'overflow-y-auto': !loadingStatuses
    }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="handleDrop"
  >
    <div
      v-if="loadingStatuses"
      class="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <i class="fa fa-spinner fa-spin text-3xl text-white"></i>
    </div>
    <template v-if="dragActive">
      <div class="drop-hint flex flex-col gap-2">
        <i class="fa fa-upload text-3xl"></i>
        Upuść pliki tutaj, aby je przesłać
      </div>
    </template>

    <template v-else-if="currentFileContent.length && isTextFile(currentFileName)">
      <div class="relative flex w-full h-full">
        <div class="flex flex-col gap-2 absolute right-4 top-2">
          <button
            class="ban-btn hover:cursor-pointer hover:text-[var(--primary)]"
            @click="currentFileContent = ''"
          >
            <i class="fa fa-close" />
          </button>
          <button
            class="nav-icon hover:cursor-pointer hover:text-[var(--primary)]"
            @click="saveFile"
          >
            <i class="fa fa-save" />
          </button>
        </div>
        <textarea
          v-model="currentFileContent"
          class="w-full h-full bg-[var(--bg-light)] resize-none outline-none px-4 py-2"
        >
        </textarea>
      </div>
    </template>
    <template v-else-if="currentFileContent.length && isImageFile(currentFileName)">
      <div class="relative flex w-full h-full">
        <div class="flex flex-col gap-2 absolute right-4 top-2">
          <button
            class="ban-btn hover:cursor-pointer hover:text-[var(--primary)]"
            @click="currentFileContent = ''"
          >
            <i class="fa fa-close" />
          </button>
        </div>
        <div class="w-full h-full flex items-center justify-center p-4">
          <img :src="currentFileContent" :alt="currentFileName" class="max-w-full max-h-full" />
        </div>
      </div>
    </template>
    <template v-else>
      <input ref="inputFile" type="file" multiple hidden @change="uploadFile" />
      <input
        ref="inputFolder"
        type="file"
        multiple
        hidden
        directory
        webkitdirectory
        @change="uploadFolder"
      />
      <div
        class="top-0 sticky bg-[var(--bg-light)] px-4 py-2 text-[0.9rem] flex items-center justify-between z-[10] border-dashed border-b border-[var(--border)]"
        :class="{ 'mb-[44px]': showSearchInput }"
      >
        <div class="flex items-center">
          <a v-for="(breadcrumb, i) in breadcrumbs" :key="i" class="flex items-center">
            <template v-if="i === 0">
              <span class="nav-icon" @click="restoreFolder('')">
                <i
                  class="fa fa-home"
                  :class="{
                    'hover:cursor-pointer hover:text-[var(--text-secondary)]':
                      breadcrumbs.length !== 1
                  }"
                />
              </span>
              <span class="mx-1">
                {{ breadcrumbs.length > 0 ? '>' : '' }}
              </span>
            </template>
            <template v-if="breadcrumbs.length">
              <span
                class="cursor-default text-[0.9rem] text-lg"
                :class="{
                  'hover:cursor-pointer hover:text-[var(--text-secondary)] hover:underline':
                    !currentFolder.endsWith(breadcrumb)
                }"
                @click="currentFolder.endsWith(breadcrumb) ? null : restoreFolder(breadcrumb)"
              >
                {{ breadcrumb }}
              </span>
              <span class="mx-1 text-lg">
                {{ i + 1 !== breadcrumbs.length ? '>' : '' }}
              </span>
            </template>
          </a>
        </div>
        <div class="flex gap-2 items-center justify-evenly">
          <button
            class="nav-icon hover:cursor-pointer hover:text-[var(--text-secondary)]"
            @click="handleShowSearch"
          >
            <i class="fa fa-search" />
          </button>
          <button
            class="nav-icon hover:cursor-pointer hover:text-[var(--text-secondary)]"
            @click="openCreateFolderModal"
          >
            <i class="fa fa-folder-plus" />
          </button>
          <button
            class="nav-icon hover:cursor-pointer hover:text-[var(--text-secondary)]"
            @click="handleUploadFolder"
          >
            <i class="fa fa-upload" />
          </button>

          <button
            class="nav-icon hover:cursor-pointer hover:text-[var(--text-secondary)]"
            @click="handleUploadFile"
          >
            <i class="fa fa-file-import" />
          </button>
        </div>
        <transition name="slide-fade">
          <div
            v-if="showSearchInput"
            class="absolute z-[8] left-0 transition-all duration-150 w-full h-full top-[100%] bg-[var(--bg-card)] px-4 py-2 text-lg flex items-center justify-between"
          >
            <div class="search-input-wrapper">
              <i class="fas fa-search search-icon !text-[0.9rem] ml-3"></i>
              <input
                v-model="searchQuery"
                type="text"
                class="search-input !p-2 !py-1 !pl-8 !text-[0.8rem]"
                placeholder="Wyszukaj plik lub folder po jego nazwie..."
              />
            </div>
          </div>
        </transition>
      </div>

      <template v-if="!filteredFiles.length">
        <div class="w-full h-full flex items-center justify-center flex-col">
          <i class="fa fa-exclamation-triangle text-5xl mb-2"></i>
          <h2 class="text-lg font-black">Brak plików</h2>
          <p class="">W tym folderze nie ma żadnego pliku.</p>
        </div>
      </template>
      <div
        v-for="file in filteredFiles"
        v-else
        :key="file.name"
        class="bg-[var(--bg-card)] w-full px-4 py-2 flex items-center gap-4"
        :class="{
          'hover:bg-[#00000050] hover:cursor-pointer':
            file.isDirectory || isKnownFile(file.name) || isImageFile(file.name)
        }"
        @click="
          file.isDirectory
            ? changeFolder(file.name)
            : isTextFile(file.name)
              ? openTextFile(file.name)
              : isImageFile(file.name)
                ? openImageFile(file.name)
                : null
        "
      >
        <div class="nav-icon">
          <i v-if="file.isDirectory" class="fa fa-folder text-[var(--primary)]"></i>
          <i v-else-if="file.name.includes('.zip')" class="fa fa-archive"></i>
          <i v-else class="fa fa-file"></i>
        </div>
        <div class="flex justify-between w-full items-center">
          <p class="w-1/2">
            {{ file.name }}
            <span
              v-if="currentFolder !== ''"
              class="bg-[var(--primary)] ml-2 text-[0.6rem] text-white py-[2px] px-[6px] rounded-[4px] font-bold"
            >
              {{ fileIsImportant(file) ? 'Pobierane zawsze' : 'Pobierane przy 1 instalacji' }}
            </span>
          </p>
          <div class="flex gap-2 items-center">
            <span>
              {{ file.modifiedAt ? format(file.modifiedAt, 'MMM dd, yyyy HH:mm:ss') : '' }}
            </span>

            <div class="flex gap-2 items-center justify-evenly ml-2">
              <button
                v-if="currentFolder !== ''"
                class="nav-icon hover:cursor-pointer"
                :disabled="loadingStatuses"
                :class="{ 'opacity-50 pointer-events-none': loadingStatuses }"
                @click.stop="toggleImportant(file)"
              >
                <i :class="fileIsImportant(file) ? 'fa fa-star' : 'fa-regular fa-star'" />
              </button>
              <button class="ban-btn hover:cursor-pointer" @click.stop="removeFile(file.name)">
                <i class="fa fa-trash" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
    <CreateFolderModal ref="createFolderModal" @submit="createFolder" />
  </div>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.1s ease-in-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.drop-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: var(--primary);
  font-weight: 700;
}
</style>
