<script lang="ts" setup>
import { useFTP } from '@renderer/services/ftp-service'
import { computed, onMounted } from 'vue'

const {
  currentFolderFiles,
  getFolderContent,
  isFolder,
  changeFolder,
  currentFolder,
  restoreFolder
} = useFTP()

const mapPathToBreadCrumbs = (path: string): string[] => {
  return path.split('/')
}

const sortedFiles = computed(() => {
  return (
    currentFolderFiles.value
      ?.sort((a) => (!/^[^\\\/:\*\?"<>\|]+(\.[^\\\/:\*\?"<>\|]+)+$/.test(a.name) ? -1 : 1))
      .filter((file) => !['hashes.txt'].includes(file.name)) ?? []
  )
})

onMounted(async () => {
  await getFolderContent()
})
</script>

<template>
  <div class="flex flex-col w-full text-[#6f6f6f] max-h-full overflow-y-auto">
    <div>
      <a v-for="(breadCrumb, i) in mapPathToBreadCrumbs(currentFolder)" :key="i">
        <span class="hover:cursor-pointer hover:text-[#fff]" @click="restoreFolder(breadCrumb)">
          {{ breadCrumb }}
        </span>
        {{ i - 1 < mapPathToBreadCrumbs.length ? '> ' : '' }}
      </a>
    </div>
    <div
      v-for="file in sortedFiles"
      :key="file.name"
      class="bg-[#00000080] w-full px-4 py-2 flex items-center gap-4"
      :class="{
        'hover:bg-[#08080880] hover:cursor-pointer': isFolder(file.name)
      }"
      @click="isFolder(file.name) ? changeFolder(file.name) : null"
    >
      <div class="nav-icon">
        <i v-if="isFolder(file.name)" class="fa fa-folder text-amber-300"></i>
        <i v-else-if="file.name.includes('.zip')" class="fa fa-archive"></i>
        <i v-else class="fa fa-file"></i>
      </div>
      <div class="flex justify-between w-full">
        <p class="w-1/3">
          {{ file.name }}
        </p>
        <p class="">{{ file.rawModifiedAt }}</p>
        <div class="flex gap-2">
          <p>{{ (file.size / 1024).toPrecision(2) }}MB</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
