<script lang="ts" setup>
import { getChangelog, removeChangelog } from '@renderer/api/endpoints'
import AddChangelog from '@renderer/components/modals/AddChangelog.vue'
import useUserStore from '@renderer/stores/user-store'
import { showToast } from '@renderer/utils'
import { format } from 'date-fns'
import { onMounted, ref, watch } from 'vue'

const userStore = useUserStore()

const allChangelog = ref<any[]>([])
const isLoadingChangelog = ref<boolean>(true)
const filteredChangelog = ref<any[]>([])
const searchQuery = ref('')
const noResultsVisible = ref(false)
const addChangelogModalRef = ref()

async function fetchChangelog(): Promise<void> {
  isLoadingChangelog.value = true
  if (!userStore.user) return

  const res = await getChangelog()

  if (res) {
    allChangelog.value = res.filter((changelog) => changelog.type === 'launcher')
    filteredChangelog.value = [...allChangelog.value]
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

watch(searchQuery, () => {
  filteredChangelog.value = allChangelog.value.filter((changelog: any) =>
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
    <div v-if="userStore.user?.role === 'admin'" class="flex gap-2">
      <div class="search-input-wrapper mb-2">
        <i class="fas fa-search search-icon !text-[0.9rem] ml-3"></i>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input !p-2 !py-1 !pl-8 !text-[0.8rem]"
          placeholder="Wyszukaj changelog po słowach kluczowych.."
        />
      </div>

      <button class="nav-icon" @click="addChangelogModalRef?.openModal(null, 'add')">
        <i class="fa fa-plus" />
      </button>
    </div>

    <div class="changelog-timeline">
      <div v-for="changelog in filteredChangelog" :key="changelog.uuid" class="changelog-entry">
        <div class="changelog-marker"></div>
        <div class="changelog-content">
          <div class="changelog-header">
            <span class="changelog-version">{{ changelog.version }}</span>
            <div class="flex gap-2 items-center">
              <span class="changelog-date">
                {{ changelog.startDate ? format(changelog.startDate, 'dd MMMM yyyy') : '' }}
              </span>
              <span
                v-if="userStore.user?.role === 'admin'"
                class="nav-icon"
                @click="addChangelogModalRef?.openModal(changelog, 'edit')"
              >
                <i class="fa fa-pencil" />
              </span>
              <span
                v-if="userStore.user?.role === 'admin'"
                class="ban-btn"
                @click="handleRemoveChangelog(changelog)"
              >
                <i class="fa fa-trash" />
              </span>
            </div>
          </div>
          <h3>{{ changelog.name }}</h3>
          <ul v-for="(change, i) in changelog.changes" :key="i">
            <li>
              <span
                class="tag new"
                :class="{
                  new: change.type === 'new',
                  fix: change.type === 'fix',
                  improve: change.type === 'improve'
                }"
              >
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
