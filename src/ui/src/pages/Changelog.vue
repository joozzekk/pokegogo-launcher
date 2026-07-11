<script lang="ts" setup>
import { getChangelog, removeChangelog } from '@ui/api/endpoints'
import AddChangelog from '@ui/components/modals/AddChangelog.vue'
import useUserStore from '@ui/stores/user-store'
import { showToast } from '@ui/utils'
import { format, parseISO } from 'date-fns'
import { UserRole } from '@ui/types/app'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const userStore = useUserStore()

interface ChangelogChange {
  type: string
  desc: string
  [key: string]: unknown
}

interface ChangelogEntry {
  uuid: string | number
  name: string
  type: string
  version?: string
  startDate: string
  changes?: ChangelogChange[]
  [key: string]: unknown
}

const selectedType = ref<string>('launcher')
const allChangelog = ref<ChangelogEntry[]>([])
const isLoading = ref<boolean>(true)
const filteredChangelog = ref<ChangelogEntry[]>([])
const searchQuery = ref('')
const addChangelogModalRef = ref()

const hasAdmin = computed(() => {
  const role = userStore.user?.role?.toLowerCase() ?? UserRole.USER
  return [UserRole.OWNER, UserRole.ADMIN, UserRole.DEV, UserRole.DEV_EN].includes(role as UserRole)
})

async function fetchChangelog(): Promise<void> {
  isLoading.value = true
  const res = await getChangelog()

  if (res) {
    allChangelog.value = res
    updateFilteredChangelog()
    isLoading.value = false
  }
}

function updateFilteredChangelog(): void {
  let items = [...allChangelog.value]

  // Filter by Type
  items = items.filter((item: ChangelogEntry) => item.type === selectedType.value)

  // Filter by Search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(
      (item: ChangelogEntry) =>
        item.name.toLowerCase().includes(query) || item.version?.toLowerCase().includes(query)
    )
  }

  // Sort by Date Descending
  items.sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())

  filteredChangelog.value = items
}

const handleRemoveChangelog = async (changelog: ChangelogEntry): Promise<void> => {
  if (!confirm(t('changelog.confirmDelete', 'Czy na pewno chcesz usunąć ten wpis?'))) return

  const res = await removeChangelog(Number(changelog.uuid))
  if (res) {
    showToast(`${t('changelog.deleteSuccess')} ${changelog.name}.`)
    await fetchChangelog()
  }
}

const getChangesByType = (changelog: ChangelogEntry, type: string): ChangelogChange[] =>
  changelog.changes?.filter((change: ChangelogChange) => change.type === type) || []

watch([selectedType, searchQuery], () => {
  updateFilteredChangelog()
})

onMounted(async () => {
  await fetchChangelog()
})
</script>

<template>
  <div class="changelog-layout">
    <div class="changelog-header">
      <div class="search-container">
        <i class="fas fa-search"></i>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('changelog.searchPlaceholder', 'Szukaj zmian...')"
        />
      </div>

      <div class="actions-dock">
        <div class="type-switcher">
          <button
            class="switch-btn"
            :class="{ active: selectedType === 'launcher' }"
            @click="selectedType = 'launcher'"
          >
            <i class="fas fa-desktop"></i> Launcher
          </button>
          <button
            class="switch-btn"
            :class="{ active: selectedType === 'server' }"
            @click="selectedType = 'server'"
          >
            <i class="fas fa-server"></i> Server
          </button>
        </div>

        <div v-if="hasAdmin" class="dock-divider"></div>

        <button
          v-if="hasAdmin"
          class="action-btn highlight"
          :title="t('changelog.add', 'Dodaj wpis')"
          @click="addChangelogModalRef?.openModal(null, 'add')"
        >
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>

    <div class="changelog-glass-panel">
      <div v-if="isLoading" class="loading-overlay">
        <i class="fas fa-spinner fa-spin"></i>
        <span>{{ t('changelog.loading', 'Ładowanie historii zmian...') }}</span>
      </div>

      <div v-else-if="filteredChangelog.length === 0" class="empty-state">
        <div class="empty-icon"><i class="fas fa-history"></i></div>
        <h3>{{ t('changelog.noResultsTitle', 'Brak wpisów') }}</h3>
        <p>
          {{
            t('changelog.noResultsDesc', 'Nie znaleziono historii zmian dla wybranych kryteriów.')
          }}
        </p>
      </div>

      <div v-else class="timeline-container custom-scrollbar">
        <div class="timeline-content">
          <div class="timeline-line"></div>

          <div v-for="entry in filteredChangelog" :key="entry.uuid" class="timeline-entry">
            <div class="entry-marker">
              <div class="dot"></div>
            </div>

            <div class="entry-card">
              <div class="card-header">
                <div class="header-left">
                  <span class="version-badge">{{ entry.version }}</span>
                  <h3 class="entry-title">{{ entry.name }}</h3>
                </div>

                <div class="header-right">
                  <div class="date-badge">
                    <i class="far fa-calendar-alt"></i>
                    {{ entry.startDate ? format(parseISO(entry.startDate), 'dd MMM yyyy') : '' }}
                  </div>

                  <div v-if="hasAdmin" class="card-actions">
                    <button
                      class="icon-btn edit"
                      @click="addChangelogModalRef?.openModal(entry, 'edit')"
                    >
                      <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="icon-btn delete" @click="handleRemoveChangelog(entry)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div class="changes-list">
                <div v-if="getChangesByType(entry, 'new').length > 0" class="change-group">
                  <h4 class="group-title text-green-400">
                    <i class="fas fa-plus-circle"></i>
                    {{ t('changelog.changeTypes.new', 'Nowości') }}
                  </h4>
                  <ul>
                    <li v-for="(change, i) in getChangesByType(entry, 'new')" :key="i">
                      {{ change.desc }}
                    </li>
                  </ul>
                </div>

                <div v-if="getChangesByType(entry, 'improve').length > 0" class="change-group">
                  <h4 class="group-title text-blue-400">
                    <i class="fas fa-rocket"></i>
                    {{ t('changelog.changeTypes.improve', 'Ulepszenia') }}
                  </h4>
                  <ul>
                    <li v-for="(change, i) in getChangesByType(entry, 'improve')" :key="i">
                      {{ change.desc }}
                    </li>
                  </ul>
                </div>

                <div v-if="getChangesByType(entry, 'fix').length > 0" class="change-group">
                  <h4 class="group-title text-red-400">
                    <i class="fas fa-bug"></i>
                    {{ t('changelog.changeTypes.fix', 'Poprawki') }}
                  </h4>
                  <ul>
                    <li v-for="(change, i) in getChangesByType(entry, 'fix')" :key="i">
                      {{ change.desc }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AddChangelog ref="addChangelogModalRef" @refresh-data="fetchChangelog" />
  </div>
</template>

<style scoped>
/* Layout Styles */
.changelog-layout {
  width: 100%;
  height: calc(100vh - 60px);
  padding: 1rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header & Search */
.changelog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.search-container {
  display: flex;
  align-items: center;
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(10px);
  padding: 0.6rem 1rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 320px;
  transition: all 0.3s ease;
}
.search-container:focus-within {
  background: rgba(20, 20, 25, 0.9);
  border-color: rgba(var(--primary-rgb), 0.5);
  box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.2);
}
.search-container i {
  color: var(--text-secondary);
  margin-right: 0.8rem;
}
.search-container input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  width: 100%;
}

/* Actions */
.actions-dock {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem 1rem;
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.type-switcher {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: 10px;
  gap: 4px;
}
.switch-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}
.switch-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}
.switch-btn:hover:not(.active) {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}
.dock-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
}
.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
}
.action-btn.highlight {
  color: var(--primary);
  background: rgba(var(--primary-rgb), 0.1);
}
.action-btn.highlight:hover {
  background: var(--primary);
  color: white;
}

/* Main Panel */
.changelog-glass-panel {
  flex: 1;
  background: rgba(20, 20, 25, 0.4);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* Timeline */
.timeline-container {
  flex: 1;
  overflow-y: auto;
  /* Zmniejszony padding, bo data jest w środku */
  padding: 2rem;
  position: relative;
}

.timeline-content {
  position: relative;
  min-height: 100%;
}

.timeline-line {
  position: absolute;
  top: calc(1.5rem + 10px);
  bottom: 0;
  left: 9px;
  width: 2px;
  background: rgba(255, 255, 255, 0.1);
}

.timeline-entry {
  position: relative;
  padding-left: 2.5rem; /* Miejsce na kropkę */
  margin-bottom: 2rem;
}

/* Marker */
.entry-marker {
  position: absolute;
  left: 0;
  top: 1.5rem;
  display: flex;
  align-items: center;
}

.dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-dark);
  border: 4px solid var(--primary);
  box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.2);
  z-index: 2;
}

/* Card Header - NAPRAWIONE */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start; /* Ważne dla RWD */
  margin-bottom: 1.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Version Badge - NAPRAWIONE */
.version-badge {
  background: rgba(var(--primary-rgb), 0.2);
  color: var(--primary);
  border: 1px solid rgba(var(--primary-rgb), 0.3);
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap; /* Nie zawija tekstu */
  flex-shrink: 0; /* Nie zmniejsza się */
}

/* Date Badge - NOWE */
.date-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 8px;
  white-space: nowrap;
}

.entry-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Changes List */
.entry-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}
.entry-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.change-group ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.change-group li {
  position: relative;
  padding-left: 1.2rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
}
.change-group li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: rgba(255, 255, 255, 0.3);
  font-weight: bold;
}
.group-title {
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0 0 0.8rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Actions */
.card-actions {
  display: flex;
  gap: 0.5rem;
}
.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
}
.icon-btn.delete:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
