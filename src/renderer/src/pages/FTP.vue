<script lang="ts" setup>
import CreateFolderModal from '@renderer/components/modals/CreateFolderModal.vue'
import { useFTP, FTPFile } from '@renderer/services/ftp-service'
import { format } from 'date-fns'
import { computed, onMounted, ref } from 'vue'
import { showProgressToast } from '@renderer/utils'
import { LOGGER } from '@renderer/services/logger-service'

const showSearchInput = ref<boolean>(false)
const searchQuery = ref<string>('')
const inputFile = ref<HTMLInputElement | null>(null)
const inputFolder = ref<HTMLInputElement | null>(null)
const createFolderModal = ref<InstanceType<typeof CreateFolderModal> | null>(null)

const {
  currentFileName,
  currentFileContent,
  currentFolderFiles,
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
  zipFolder, // Nowa funkcja
  dragActive,
  handleDrop,
  loadingStatuses
} = useFTP(inputFile, inputFolder)

// Funkcja sprawdzająca czy element jest ważny na podstawie danych z API
const fileIsImportant = (file: FTPFile): boolean => {
  return file.flag === 'important'
}

const toggleImportant = async (file: FTPFile): Promise<void> => {
  const newFlag = file.flag === 'important' ? 'ignore' : 'important'

  // Używamy tego samego endpointu dla plików i folderów,
  // backend ManifestManager poradzi sobie z kluczem ścieżki
  const progress = showProgressToast(`Aktualizuję status...`)

  try {
    // Uwaga: 'ftp:set-hash-flag' w nowym backendzie obsługuje po prostu ścieżkę,
    // niezależnie czy to plik czy folder (entry w jsonie)
    await window.electron.ipcRenderer?.invoke(
      'ftp:set-hash-flag',
      currentFolder.value,
      file.name,
      newFlag
    )

    await getFolderContent()
    progress?.close('Pomyślnie zaktualizowano.', 'success')
  } catch (e) {
    LOGGER.with('FTP').err((e as Error).message)
    progress?.close('Błąd aktualizacji.', 'error')
  }
}

const handleZipFolder = async (file: FTPFile): Promise<void> => {
  if (!file.isDirectory) return
  // Dodajemy confirmation lub od razu akcja
  await zipFolder(file.name)
}

const mapPathToBreadCrumbs = (path: string): string[] => {
  return path.split('/').filter(Boolean)
}

const openCreateFolderModal = (): void => {
  createFolderModal.value?.openModal()
}

// Filtrowanie (currentFolderFiles jest już posortowane w service)
const filteredFiles = computed(() => {
  const files = currentFolderFiles.value ?? []

  // Odsiewamy plik manifestu, żeby go nie pokazywać userowi
  const cleanList = files.filter((f) => f.name !== '.meta.json')

  if (!searchQuery.value) return cleanList

  const query = searchQuery.value.toLowerCase()
  return cleanList.filter((file) => file.name.toLowerCase().includes(query))
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

const isTextFile = (name: string): boolean => {
  return /\.(txt|log|md|csv|json|xml|yml|yaml|conf|properties|js|ts|css|html|vue|hashes)$/i.test(
    name
  )
}

const isImageFile = (name: string): boolean => {
  return /\.(png|jpg|jpeg|gif|bmp|svg|webp)$/i.test(name)
}

const isKnownFile = (name: string): boolean => isTextFile(name) || isImageFile(name)

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
    @dragenter.prevent="dragActive = true"
    @dragover.prevent="dragActive = true"
    @dragleave.prevent="dragActive = false"
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

    <template v-else-if="isTextFile(currentFileName)">
      <div class="relative flex w-full h-full">
        <div class="flex flex-col gap-2 absolute right-4 top-2">
          <button
            class="ban-btn hover:cursor-pointer hover:text-[var(--primary)]"
            @click="currentFileName = ''"
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
        ></textarea>
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
          <span class="nav-icon mr-1" @click="restoreFolder('')">
            <i
              class="fa fa-home"
              :class="{
                'hover:cursor-pointer hover:text-[var(--text-secondary)]': breadcrumbs.length > 0
              }"
            />
          </span>
          <span v-if="breadcrumbs.length > 0" class="mx-1">></span>

          <a v-for="(breadcrumb, i) in breadcrumbs" :key="i" class="flex items-center">
            <span
              class="cursor-default text-[0.9rem] text-lg"
              :class="{
                'hover:cursor-pointer hover:text-[var(--text-secondary)] hover:underline':
                  i < breadcrumbs.length - 1
              }"
              @click="i < breadcrumbs.length - 1 ? restoreFolder(breadcrumb) : null"
            >
              {{ breadcrumb }}
            </span>
            <span v-if="i + 1 !== breadcrumbs.length" class="mx-1 text-lg">></span>
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
                placeholder="Szukaj..."
              />
            </div>
          </div>
        </transition>
      </div>

      <template v-if="!filteredFiles.length">
        <div class="w-full h-full flex items-center justify-center flex-col">
          <i class="fa fa-exclamation-triangle text-5xl mb-2"></i>
          <h2 class="text-lg font-black">Brak plików</h2>
          <p>W tym folderze nie ma żadnych plików.</p>
        </div>
      </template>

      <div
        v-for="file in filteredFiles"
        v-else
        :key="file.name"
        class="bg-[var(--bg-card)] w-full px-4 py-2 flex items-center gap-4 border-b border-[var(--border)]/10"
        :class="{
          'hover:bg-[#00000050] hover:cursor-pointer': file.isDirectory || isKnownFile(file.name)
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
        <div class="nav-icon w-8 text-center">
          <template v-if="file.isDirectory">
            <i
              v-if="file.status === 'zipped-dirty'"
              class="fa fa-box-open text-yellow-500"
              title="Folder spakowany, ale zawiera nowe pliki"
            ></i>
            <i
              v-else-if="file.status === 'zipped'"
              class="fa fa-file-zipper text-[var(--primary)]"
              title="Folder spakowany"
            ></i>
            <i v-else class="fa fa-folder text-[var(--primary)]"></i>
          </template>
          <template v-else>
            <i v-if="file.name.endsWith('.zip')" class="fa fa-file-zipper"></i>
            <i v-else class="fa fa-file"></i>
          </template>
        </div>

        <div class="flex justify-between w-full items-center">
          <div class="flex flex-col w-1/2">
            <p class="truncate font-medium">
              {{ file.name }}
              <span
                v-if="file.flag === 'important'"
                class="bg-[var(--primary)] ml-2 text-[0.6rem] text-white py-[2px] px-[6px] rounded-[4px] font-bold"
              >
                Pobierane zawsze
              </span>
              <span
                v-else-if="file.flag === 'ignore'"
                class="bg-gray-600 ml-2 text-[0.6rem] text-white py-[2px] px-[6px] rounded-[4px] font-bold"
              >
                Ignorowane
              </span>
            </p>
            <p v-if="file.status === 'zipped-dirty'" class="text-[0.6rem] text-yellow-500">
              ⚠️ Zawiera niespakowane zmiany
            </p>
          </div>

          <div class="flex gap-4 items-center">
            <span class="text-xs opacity-70">
              {{ file.modifiedAt ? format(new Date(file.modifiedAt), 'MMM dd HH:mm') : '' }}
            </span>

            <div class="flex gap-2 items-center">
              <button
                v-if="file.isDirectory"
                class="nav-icon hover:text-[var(--primary)]"
                title="Spakuj folder (utwórz .zip)"
                @click.stop="handleZipFolder(file)"
              >
                <i class="fa fa-file-zipper"></i>
              </button>

              <button
                class="nav-icon hover:text-yellow-400"
                :disabled="loadingStatuses"
                :class="{ 'opacity-50': loadingStatuses, 'text-yellow-400': fileIsImportant(file) }"
                title="Oznacz jako ważne (zawsze pobierane)"
                @click.stop="toggleImportant(file)"
              >
                <i :class="fileIsImportant(file) ? 'fa fa-star' : 'fa-regular fa-star'" />
              </button>

              <button class="ban-btn hover:text-red-500" @click.stop="removeFile(file.name)">
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
  z-index: 50;
  background: rgba(0, 0, 0, 0.8);
}
</style>
