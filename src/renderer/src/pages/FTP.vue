<script lang="ts" setup>
import { useFTP } from '@renderer/services/ftp-service'
import { computed, onMounted, ref } from 'vue'

const showSearchInput = ref<boolean>(false)
const showSearchValue = ref<string>('')
const inputFile = ref<HTMLInputElement | null>(null)

const {
  currentFileContent,
  currentFolderFiles,
  getFolderContent,
  isFolder,
  changeFolder,
  currentFolder,
  restoreFolder,
  uploadFile,
  removeFile,
  openFile,
  saveFile
} = useFTP(inputFile)

const mapPathToBreadCrumbs = (path: string): string[] => {
  return path.split('/')
}

const sortedFiles = computed(() => {
  const files = currentFolderFiles.value

  return (
    files
      ?.sort((a) => {
        // eslint-disable-next-line no-useless-escape
        return !/^[^\\\/:\*\?"<>\|]+(\.[^\\\/:\*\?"<>\|]+)+$/.test(a.name) ? -1 : 1
      })
      .filter((file) => !['hashes.txt'].includes(file.name)) ?? []
  )
})

const filteredFiles = computed(() => {
  return showSearchValue.value?.length
    ? sortedFiles.value.filter((file) =>
        file.name.toLowerCase().includes(showSearchValue.value?.toLowerCase())
      )
    : sortedFiles.value
})

const breadcrumbs = computed(() => {
  return mapPathToBreadCrumbs(currentFolder.value)
})

const handleUploadFile = (): void => {
  inputFile.value?.click()
}

const handleShowSearch = (): void => {
  showSearchInput.value = !showSearchInput.value
  showSearchValue.value = ''
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
  <div class="flex flex-col w-full text-[#bbb] max-h-full overflow-y-auto rounded-xl">
    <template v-if="currentFileContent.length">
      <div class="relative flex w-full h-full">
        <div class="flex flex-col gap-2 absolute right-4 top-2">
          <button
            class="ban-btn hover:cursor-pointer hover:text-[#03a2ad]"
            @click="currentFileContent = ''"
          >
            <i class="fa fa-close" />
          </button>
          <button class="nav-icon hover:cursor-pointer hover:text-[#03a2ad]" @click="saveFile">
            <i class="fa fa-save" />
          </button>
        </div>
        <textarea
          v-model="currentFileContent"
          class="w-full h-full bg-[#0a0c10] resize-none outline-none px-4 py-2"
        >
        </textarea>
      </div>
    </template>
    <template v-else>
      <input ref="inputFile" type="file" multiple hidden @change="uploadFile" />
      <div
        class="top-0 sticky bg-[#0a0c10] px-4 py-2 text-lg flex items-center justify-between z-[10]"
        :class="{ 'mb-[50px]': showSearchInput }"
      >
        <div class="flex items-center">
          <a v-for="(breadcrumb, i) in breadcrumbs" :key="i" class="flex items-center">
            <template v-if="i === 0">
              <span class="nav-icon">
                <i
                  class="fa fa-home"
                  :class="{ 'hover:cursor-pointer hover:text-[#03a2ad]': breadcrumbs.length !== 1 }"
                  @click="restoreFolder(breadcrumb)"
                />
              </span>
              <span class="mx-1">
                {{ breadcrumbs.length > 1 ? '>' : '' }}
              </span>
            </template>
            <template v-else-if="breadcrumbs.length">
              <span
                class="cursor-default text-[0.9rem]"
                :class="{
                  'hover:cursor-pointer hover:text-[#03a2ad] hover:underline':
                    !currentFolder.endsWith(breadcrumb)
                }"
                @click="currentFolder.endsWith(breadcrumb) ? null : restoreFolder(breadcrumb)"
              >
                {{ breadcrumb }}
              </span>
              <span class="mx-1">
                {{ i + 1 !== breadcrumbs.length ? '>' : '' }}
              </span>
            </template>
          </a>
        </div>
        <div class="flex gap-2 items-center justify-evenly">
          <button
            class="nav-icon hover:cursor-pointer hover:text-[#03a2ad]"
            @click="handleShowSearch"
          >
            <i class="fa fa-search" />
          </button>
          <button
            class="nav-icon hover:cursor-pointer hover:text-[#03a2ad]"
            @click="handleUploadFile"
          >
            <i class="fa fa-upload" />
          </button>
        </div>
        <transition name="slide-fade">
          <div
            v-if="showSearchInput"
            class="absolute z-[8] left-0 transition-all duration-150 w-full h-full top-[100%] bg-[#0a0c10] px-4 py-2 text-lg flex items-center justify-between"
          >
            <div class="relative search-input !p-2 hover:!border-[#03a2ad]">
              <i class="absolute fa fa-search translate-1/2 !text-inherit"></i>
              <input
                v-model="showSearchValue"
                type="search"
                class="w-full h-full outline-none ml-7"
                placeholder="Wyszukaj plik.."
              />
            </div>
          </div>
        </transition>
      </div>

      <template v-if="!filteredFiles.length">
        <div class="w-full h-full flex items-center justify-center flex-col">
          <i class="fa fa-exclamation-triangle text-5xl mb-2"></i>
          <h2 class="text-lg font-black">Brak plików</h2>
          <p class="">Folder jest pusty.</p>
        </div>
      </template>
      <div
        v-for="file in filteredFiles"
        v-else
        :key="file.name"
        class="bg-[#0a0c1080] w-full px-4 py-2 flex items-center gap-4"
        :class="{
          'hover:bg-[#0a0c10cc] hover:cursor-pointer': isFolder(file.name) || isKnownFile(file.name)
        }"
        @click="
          isFolder(file.name)
            ? changeFolder(file.name)
            : isKnownFile(file.name)
              ? openFile(file.name)
              : null
        "
      >
        <div class="nav-icon">
          <i v-if="isFolder(file.name)" class="fa fa-folder text-[#03a2ad]"></i>
          <i v-else-if="file.name.includes('.zip')" class="fa fa-archive"></i>
          <i v-else class="fa fa-file"></i>
        </div>
        <div class="flex justify-between w-full items-center">
          <p class="w-1/3">
            {{ file.name }}
          </p>
          <p class="">{{ file.rawModifiedAt }}</p>
          <div class="flex gap-2 items-center">
            <p>{{ (file.size / 1024).toPrecision(2) }}MB</p>
            <div class="flex gap-2 items-center justify-evenly ml-2">
              <button class="ban-btn hover:cursor-pointer" @click.stop="removeFile(file.name)">
                <i class="fa fa-trash" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
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
</style>
