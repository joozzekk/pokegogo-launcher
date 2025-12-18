<script lang="ts" setup>
import { getEvents, removeEvent } from '@ui/api/endpoints'
import AddEvent from '@ui/components/modals/AddEvent.vue'
import useUserStore from '@ui/stores/user-store'
import { showToast } from '@ui/utils'
import { ref, onMounted, watch } from 'vue'

const url = import.meta.env.RENDERER_VITE_API_URL
const userStore = useUserStore()

const allEvents = ref<any[]>([])
const isLoadingEvents = ref<boolean>(true)
const filteredEvents = ref<any[]>([])
const searchQuery = ref('')
const noResultsVisible = ref(false)
const addEventModalRef = ref()

async function fetchEvents(): Promise<void> {
  isLoadingEvents.value = true
  if (!userStore.user) return

  const res = await getEvents()

  if (res) {
    allEvents.value = res
    filteredEvents.value = [...allEvents.value]
    noResultsVisible.value = false
    isLoadingEvents.value = false
  }
}

const handleRemoveEvent = async (event: any): Promise<void> => {
  const res = await removeEvent(event.uuid)

  if (res) {
    showToast('Pomyślnie usunięto przedmiot ' + event.name + '.')
    await fetchEvents()
  }
}

watch(searchQuery, () => {
  filteredEvents.value = allEvents.value.filter((event: any) =>
    event.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )

  if (!filteredEvents.value?.length) {
    noResultsVisible.value = true
  } else {
    noResultsVisible.value = false
  }
})

onMounted(async () => {
  await fetchEvents()
})
</script>

<template>
  <div class="users-container">
    <div class="search-input-wrapper mb-2">
      <i class="fas fa-search search-icon !text-[0.9rem] ml-3"></i>
      <input
        v-model="searchQuery"
        type="text"
        class="search-input !p-2 !py-1 !pl-8 !text-[0.8rem]"
        placeholder="Wyszukaj wydarzenie po nazwie.."
      />
    </div>

    <div class="logs-table-wrapper">
      <div v-if="isLoadingEvents" class="loading-users">
        <i :class="'fas fa-spinner fa-spin'"></i>
        Ładowanie wydarzeń..
        <button class="btn-primary" style="max-width: 300px" @click="fetchEvents">Odśwież</button>
      </div>
      <template v-else>
        <div
          v-if="noResultsVisible"
          id="noResults"
          class="no-results flex events-center justify-center h-full flex-col gap-2"
        >
          <i class="fas fa-search"></i>
          <h3 class="text-lg">Brak wyników</h3>
          <p>Nie znaleziono żadnych wydarzeń pasujących do kryteriów wyszukiwania.</p>
        </div>
        <table v-else class="logs-table select-none">
          <thead>
            <tr class="font-black text-[0.9rem]">
              <th>Nazwa</th>
              <th>Typ</th>
              <th>Opis</th>
              <th>
                <div class="relative flex flex-row-reverse gap-2">
                  <button class="info-btn" @click="fetchEvents">
                    <i :class="'fas fa-refresh'"></i>
                  </button>
                  <button class="info-btn" @click="addEventModalRef?.openModal(null, 'add')">
                    <i :class="'fas fa-plus'"></i>
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="event in filteredEvents" :key="event.uuid">
              <tr>
                <td>
                  <div class="flex items-center gap-3">
                    <img
                      :src="
                        event.src.includes('https://')
                          ? event.src
                          : `${url}/events/image/${event.uuid}`
                      "
                      class="w-[30px] h-[30px]"
                      @dragstart.prevent="null"
                    />
                    <strong>{{ event.name }}</strong>
                  </div>
                </td>
                <td>
                  {{ event.type?.toUpperCase() }}
                </td>
                <td>
                  <pre
                    class="px-4 py-2 border-dashed border-[var(--border)] border rounded-xl flex-wrap whitespace-break-spaces"
                    >{{ event.desc }}</pre
                  >
                </td>
                <td>
                  <div class="reverse">
                    <button
                      v-if="event.type !== 'mega'"
                      class="ban-btn"
                      @click="handleRemoveEvent(event)"
                    >
                      <i :class="'fas fa-trash'"></i>
                    </button>
                    <button class="nav-icon" @click="addEventModalRef?.openModal(event, 'edit')">
                      <i :class="'fas fa-pencil'"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </template>
    </div>
    <AddEvent ref="addEventModalRef" @refresh-data="fetchEvents" />
  </div>
</template>

<style scoped>
.loading-users {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.users-container {
  width: 100%;
  height: calc(100vh - 125px);
  backdrop-filter: blur(20px);
  border-radius: var(--border-radius);
  animation: fadeInUp 0.8s ease-out 0.2s both;
}
.reverse {
  display: flex;
  flex-direction: row-reverse;
  gap: 0.5rem;
}
.logs-table-wrapper {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  position: relative;
  overflow-y: auto;
  border: 1px dashed var(--border);
}
.logs-table {
  width: 100%;
  border-collapse: collapse;
}
.logs-table th {
  background: var(--bg-light);
  padding: 0.5rem 1rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.logs-table td {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
}

.logs-table tr {
  background: var(--bg-card);
}

.logs-table tr:hover {
  background: none;
}

.copy-btn {
  margin-left: 0.4rem;
  font-size: 0.7rem;
  padding: 0.2rem 0.3rem;
  border-radius: 0.3rem;
  background: var(--bg-dark);
  color: rgba(255, 255, 255, 0.4);
}

.copy-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  color: rgba(255, 255, 255, 0.2);
}

.online-dot {
  bottom: 4px;
  right: -2px;
  width: 12px;
  height: 12px;
  border: 2px solid var(--bg-dark);
  border-radius: 50%;
}
.no-results {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}
.no-results i {
  font-size: 3rem;
  opacity: 0.5;
}
</style>
