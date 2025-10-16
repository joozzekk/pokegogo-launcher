<script lang="ts" setup>
import { getItems, removeItem } from '@renderer/api/endpoints'
import AddItem from '@renderer/components/modals/AddItem.vue'
import useUserStore from '@renderer/stores/user-store'
import { showToast } from '@renderer/utils'
import { ref, onMounted, watch } from 'vue'

const url = import.meta.env.RENDERER_VITE_API_URL
const userStore = useUserStore()

const allItems = ref<any[]>([])
const isLoadingItems = ref<boolean>(true)
const filteredItems = ref<any[]>([])
const searchQuery = ref('')
const noResultsVisible = ref(false)
const addItemModalRef = ref()

async function fetchItems(): Promise<void> {
  isLoadingItems.value = true
  if (!userStore.user) return

  const res = await getItems()

  if (res) {
    allItems.value = res
    filteredItems.value = [...allItems.value]
    noResultsVisible.value = false
    isLoadingItems.value = false
  }
}

const handleRemoveItem = async (item: any): Promise<void> => {
  const res = await removeItem(item.uuid)

  if (res) {
    showToast('Pomyślnie usunięto przedmiot ' + item.name + '.')
    await fetchItems()
  }
}

watch(searchQuery, () => {
  filteredItems.value = allItems.value.filter(
    (item: any) =>
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.serviceName.toLowerCase().includes(searchQuery.value.toLowerCase())
  )

  if (!filteredItems.value?.length) {
    noResultsVisible.value = true
  } else {
    noResultsVisible.value = false
  }
})

onMounted(async () => {
  await fetchItems()
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
        placeholder="Wyszukaj przedmiot po nazwie.."
      />
    </div>

    <div class="logs-table-wrapper">
      <div v-if="isLoadingItems" class="loading-users">
        <i :class="'fas fa-spinner fa-spin'"></i>
        Ładowanie przedmiotów..
        <button class="btn-primary" style="max-width: 300px" @click="fetchItems">Odśwież</button>
      </div>
      <template v-else>
        <div
          v-if="noResultsVisible"
          id="noResults"
          class="no-results flex items-center justify-center h-full flex-col gap-2"
        >
          <i class="fas fa-search"></i>
          <h3 class="text-lg">Brak wyników</h3>
          <p>Nie znaleziono żadnych przedmiotów pasujących do kryteriów wyszukiwania.</p>
        </div>
        <table v-else class="logs-table select-none">
          <thead>
            <tr class="font-black text-[0.9rem]">
              <th>Nazwa</th>
              <th>Cena</th>
              <th>Opis</th>
              <th>
                <div class="relative flex flex-row-reverse gap-2">
                  <button class="info-btn" @click="fetchItems">
                    <i :class="'fas fa-refresh'"></i>
                  </button>
                  <button class="info-btn" @click="addItemModalRef?.openModal(null, 'add')">
                    <i :class="'fas fa-plus'"></i>
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="item in filteredItems" :key="item.uuid">
              <tr>
                <td>
                  <div class="flex items-center gap-3">
                    <img
                      :src="
                        item.src.includes('https://') || item.src.includes('blob')
                          ? item.src
                          : `${url}/items/image/${item.uuid}`
                      "
                      class="w-[30px] h-[30px]"
                    />
                    <strong>{{ item.name }}</strong>
                  </div>
                </td>
                <td>
                  {{ item?.price ? Number(item.price).toFixed(2) + ' PLN' : 'Brak' }}
                </td>
                <td>
                  <pre class="px-4 py-2 border-dashed border-[#ffae0067] border rounded-xl">{{
                    item.desc
                  }}</pre>
                </td>
                <td>
                  <div class="reverse">
                    <button class="ban-btn" @click="handleRemoveItem(item)">
                      <i :class="'fas fa-trash'"></i>
                    </button>
                    <button class="nav-icon" @click="addItemModalRef?.openModal(item, 'edit')">
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
    <AddItem ref="addItemModalRef" @refresh-data="fetchItems" />
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
  border: 1px dashed #ffae0067;
}
.logs-table {
  width: 100%;
  border-collapse: collapse;
}
.logs-table th {
  background: rgb(0, 0, 0);
  padding: 0.5rem 1rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #c59a2211;
  position: sticky;
  top: 0;
  z-index: 10;
}
.logs-table td {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #c59a2211;
}

.logs-table tr {
  background: #000;
}

.logs-table tr:hover {
  background: #c59a2207;
}

.copy-btn {
  margin-left: 0.4rem;
  font-size: 0.7rem;
  padding: 0.2rem 0.3rem;
  border-radius: 0.3rem;
  background: rgba(0, 0, 0, 0.3);
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
