<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts" setup>
import { getChangelog, removeChangelog } from '@ui/api/endpoints'
import AddChangelog from '@ui/components/modals/AddChangelog.vue'
import useUserStore from '@ui/stores/user-store'
import { showToast } from '@ui/utils'
import { format, parseISO } from 'date-fns'
import { computed, onMounted, ref, watch } from 'vue'

const url = import.meta.env.RENDERER_VITE_API_URL
const userStore = useUserStore()

const selectedType = ref<string>('launcher')
const allChangelog = ref<any[]>([])
const isLoadingChangelog = ref<boolean>(true)
const filteredChangelog = ref<any[]>([])
const searchQuery = ref('')
const noResultsVisible = ref(false)
const addChangelogModalRef = ref()

async function fetchChangelog(): Promise<void> {
  isLoadingChangelog.value = true

  const res = await getChangelog()

  if (res) {
    allChangelog.value = res
    filteredChangelog.value = [
      ...allChangelog.value
        .sort((a, b) =>
          parseISO(a.startDate).getTime() < parseISO(b.startDate).getTime() ? 1 : -1
        )
        .filter((changelog: any) => changelog.type === selectedType.value)
    ]
    noResultsVisible.value = false
    isLoadingChangelog.value = false
  }
}

const handleRemoveChangelog = async (changelog: any): Promise<void> => {
  const res = await removeChangelog(changelog.uuid)

  if (res) {
    showToast('Pomyślnie usunięto changelog ' + changelog.name + '.')
    await fetchChangelog()
  }
}

const fixes = (changelog: any): any[] =>
  changelog.changes.filter((change: any) => change.type === 'fix')
const news = (changelog: any): any[] =>
  changelog.changes.filter((change: any) => change.type === 'new')
const improves = (changelog: any): any[] =>
  changelog.changes.filter((change: any) => change.type === 'improve')

const getChangeTagByType = (type: string): string => {
  switch (type) {
    case 'new':
      return 'NOWE'
    case 'fix':
      return 'POPRAWKA'
    case 'improve':
      return 'ULEPSZONO'
    default:
      return 'NOWE'
  }
}

const hasMod = computed(() =>
  ['admin', 'technik', 'mod'].includes(userStore.user?.role || 'default')
)
const hasAdmin = computed(() => ['admin', 'technik'].includes(userStore.user?.role || 'default'))

watch(searchQuery, () => {
  filteredChangelog.value = allChangelog.value
    .filter((changelog: any) => changelog.type === selectedType.value)
    .filter((changelog: any) =>
      changelog.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )

  if (!filteredChangelog.value?.length) {
    noResultsVisible.value = true
  } else {
    noResultsVisible.value = false
  }
})

watch(selectedType, () => {
  filteredChangelog.value = allChangelog.value
    .filter((changelog: any) => changelog.type === selectedType.value)
    .filter((changelog: any) =>
      changelog.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )

  if (!filteredChangelog.value?.length) {
    noResultsVisible.value = true
  } else {
    noResultsVisible.value = false
  }
})

onMounted(async () => {
  await fetchChangelog()
})
</script>

<template>
  <div class="changelog-container">
    <div class="w-full mb-2 relative flex gap-2">
      <i class="fas fa-search search-icon !text-[0.8rem] absolute ml-3"></i>
      <input
        v-model="searchQuery"
        type="text"
        class="search-input !p-2 !py-1 !pl-8 !text-[0.8rem]"
        placeholder="Wyszukaj changelog po słowach kluczowych.."
      />

      <div class="flex gap-2 z-400">
        <button
          class="nav-icon"
          :class="{ active: selectedType === 'server' }"
          @click="selectedType = 'server'"
        >
          <i class="fa fa-server" />
        </button>
        <button
          class="nav-icon"
          :class="{ active: selectedType === 'launcher' }"
          @click="selectedType = 'launcher'"
        >
          <i class="fa fa-computer" />
        </button>
        <button
          v-if="hasAdmin"
          class="nav-icon"
          @click="addChangelogModalRef?.openModal(null, 'add')"
        >
          <i class="fa fa-plus" />
        </button>
      </div>
    </div>

    <div class="changelog-timeline">
      <div v-for="changelog in filteredChangelog" :key="changelog.uuid" class="changelog-entry">
        <div class="changelog-marker"></div>
        <div class="changelog-content">
          <div class="changelog-header !flex !justify-between !items-start">
            <div class="flex gap-2 items-start">
              <div v-if="changelog.src" class="nav-icon !w-[5.5rem] !h-[5.5rem]">
                <img
                  :src="
                    changelog.src.includes('https://')
                      ? changelog.src
                      : `${url}/changelog/image/${changelog.uuid}`
                  "
                  class="h-[4rem]"
                  @dragstart.prevent="null"
                />
              </div>
              <span class="changelog-version">{{ changelog.version }}</span>
            </div>
            <div class="flex gap-2 items-center">
              <span class="changelog-date">
                {{ changelog.startDate ? format(changelog.startDate, 'dd MMMM yyyy') : '' }}
              </span>
              <span
                v-if="hasMod"
                class="nav-icon"
                @click="addChangelogModalRef?.openModal(changelog, 'edit')"
              >
                <i class="fa fa-pencil" />
              </span>
              <span v-if="hasAdmin" class="ban-btn" @click="handleRemoveChangelog(changelog)">
                <i class="fa fa-trash" />
              </span>
            </div>
          </div>
          <h3>{{ changelog.name }}</h3>
          <ul>
            <li v-for="(change, i) in news(changelog)" :key="i">
              <span class="tag new">
                {{ getChangeTagByType(change.type) }}
              </span>
              {{ change.desc }}
            </li>
            <li v-for="(change, i) in improves(changelog)" :key="i">
              <span class="tag improve">
                {{ getChangeTagByType(change.type) }}
              </span>
              {{ change.desc }}
            </li>
            <li v-for="(change, i) in fixes(changelog)" :key="i">
              <span class="tag fix">
                {{ getChangeTagByType(change.type) }}
              </span>
              {{ change.desc }}
            </li>
          </ul>
        </div>
      </div>
    </div>
    <AddChangelog ref="addChangelogModalRef" @refresh-data="fetchChangelog" />
  </div>
</template>
