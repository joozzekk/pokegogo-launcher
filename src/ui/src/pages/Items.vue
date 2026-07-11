<script lang="ts" setup>
import { changeItemIndex, getItems, removeItem } from '@ui/api/endpoints'
import AddItem from '@ui/components/modals/AddItem.vue'
import useUserStore from '@ui/stores/user-store'
import { showToast } from '@ui/utils'
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { UserRole } from '@ui/types/app'

const { t } = useI18n()
const url = import.meta.env.RENDERER_VITE_API_URL
const userStore = useUserStore()

interface AdminItem {
  uuid: string | number
  name: string
  desc?: string
  price?: number | string
  src: string
  index: number
  [key: string]: unknown
}

const allItems = ref<AdminItem[]>([])
const isLoadingItems = ref<boolean>(true)
const filteredItems = ref<AdminItem[]>([])
const searchQuery = ref('')
const addItemModalRef = ref()

const isDeleteModalOpen = ref(false)
const itemToDelete = ref<AdminItem | null>(null)
const isDeleting = ref(false)

async function fetchItems(): Promise<void> {
  isLoadingItems.value = true
  if (!userStore.user) return

  const res = await getItems()

  if (res) {
    allItems.value = res
    filteredItems.value = [...allItems.value.sort((a, b) => (a.index > b.index ? 1 : -1))]
    isLoadingItems.value = false
  }
}

const handleChangeItemIndex = async (item: AdminItem, step: number = 1): Promise<void> => {
  const res = await changeItemIndex(String(item.uuid), step)
  if (res) {
    await fetchItems()
  }
}

const confirmRemoveItem = (item: AdminItem): void => {
  itemToDelete.value = item
  isDeleteModalOpen.value = true
}

const handleRemoveItem = async (): Promise<void> => {
  if (!itemToDelete.value) return
  isDeleting.value = true
  try {
    const res = await removeItem(Number(itemToDelete.value.uuid))
    if (res) {
      showToast(`${t('items.toasts.deleted')} ${itemToDelete.value.name}.`)
      await fetchItems()
    }
  } finally {
    isDeleting.value = false
    isDeleteModalOpen.value = false
    itemToDelete.value = null
  }
}

watch(searchQuery, () => {
  if (!searchQuery.value) {
    filteredItems.value = [...allItems.value.sort((a, b) => (a.index > b.index ? 1 : -1))]
    return
  }
  filteredItems.value = allItems.value
    .sort((a, b) => (a.index > b.index ? 1 : -1))

    .filter(
      (item: AdminItem) =>
        item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (item.desc && item.desc.toLowerCase().includes(searchQuery.value.toLowerCase()))
    )
})

const hasResults = computed(() => filteredItems.value && filteredItems.value.length > 0)

const router = useRouter()

onMounted(async () => {
  const role = userStore.user?.role?.toLowerCase() ?? UserRole.USER
  const isFullAdmin = [UserRole.OWNER, UserRole.ADMIN, UserRole.DEV, UserRole.DEV_EN].includes(role as UserRole)

  if (!isFullAdmin) {
    router.push('/app/home')
    return
  }
  await fetchItems()
})
</script>

<template>
  <div class="items-layout">
    <div class="items-header">
      <div class="search-container">
        <i class="fas fa-search"></i>
        <input v-model="searchQuery" type="text" :placeholder="t('items.searchPlaceholder')" />
      </div>

      <div class="actions-dock">
        <button class="action-btn" :title="t('items.refresh')" @click="fetchItems">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': isLoadingItems }"></i>
        </button>
        <div class="dock-divider"></div>
        <button
          class="action-btn highlight"
          :title="t('items.add')"
          @click="addItemModalRef?.openModal(null, 'add')"
        >
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>

    <div class="items-glass-panel">
      <div v-if="isLoadingItems" class="loading-overlay">
        <i class="fas fa-spinner fa-spin"></i>
        <span>{{ t('items.loading') }}</span>
      </div>

      <div v-else-if="!hasResults" class="empty-state">
        <div class="empty-icon"><i class="fas fa-box-open"></i></div>
        <h3>{{ t('items.noResultsTitle') }}</h3>
        <p>{{ t('items.noResultsDesc') }}</p>
      </div>

      <div v-else class="items-list custom-scrollbar">
        <div v-for="(item, index) in filteredItems" :key="item.uuid" class="item-card">
          <div class="item-visuals">
            <div class="reorder-controls">
              <button
                class="reorder-btn"
                :disabled="index === 0"
                :class="{ invisible: index === 0 }"
                @click.stop="handleChangeItemIndex(item, -1)"
              >
                <i class="fa fa-chevron-up"></i>
              </button>
              <button
                class="reorder-btn"
                :disabled="index === filteredItems.length - 1"
                :class="{ invisible: index === filteredItems.length - 1 }"
                @click.stop="handleChangeItemIndex(item, 1)"
              >
                <i class="fa fa-chevron-down"></i>
              </button>
            </div>

            <div class="img-wrapper">
              <img
                :src="
                  item.src.includes('https://') || item.src.includes('blob')
                    ? item.src
                    : `${url}/items/image/${item.uuid}`
                "
                alt="Item Image"
                @dragstart.prevent
              />
            </div>
          </div>

          <div class="item-info">
            <div class="item-header">
              <h3 class="item-name">{{ item.name }}</h3>
              <span class="price-badge">
                {{
                  item?.price ? Number(item.price).toFixed(2) + ' PLN' : t('items.priceParams.none')
                }}
              </span>
            </div>
            <div class="item-desc">{{ item.desc }}</div>
          </div>

          <div class="item-actions">
            <button
              class="icon-btn edit-btn"
              :title="t('items.edit')"
              @click.stop="addItemModalRef?.openModal(item, 'edit')"
            >
              <i class="fas fa-pencil-alt"></i>
            </button>
            <button
              class="icon-btn delete-btn"
              :title="t('items.delete')"
              @click.stop="confirmRemoveItem(item)"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <AddItem ref="addItemModalRef" @refresh-data="fetchItems" />

    <!-- Delete Confirmation Modal -->
    <Teleport to="#modalsContainer">
      <Transition name="fade">
        <div
          v-if="isDeleteModalOpen"
          class="g-modal-overlay"
          role="dialog"
          aria-modal="true"
          @click.self="isDeleteModalOpen = false"
        >
          <div class="g-card g-modal-card" style="max-width: 400px">
            <div class="g-card-header">
              <div class="flex items-center gap-4">
                <div class="g-icon-box !bg-red-500/20 !text-red-500">
                  <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="text-red-400">Usuń Przedmiot</h3>
              </div>
              <button class="g-close-btn" :disabled="isDeleting" @click="isDeleteModalOpen = false">
                <i class="fas fa-times"></i>
              </button>
            </div>

            <div class="g-modal-content p-6 text-center">
              <p class="text-gray-300 text-lg mb-2">Czy na pewno chcesz usunąć ten przedmiot?</p>
              <p class="text-white font-bold text-xl">{{ itemToDelete?.name }}</p>
              <p class="text-red-400 text-sm mt-4">Tej operacji nie można cofnąć.</p>
            </div>

            <div class="g-modal-footer">
              <button class="g-btn" :disabled="isDeleting" @click="isDeleteModalOpen = false">
                Anuluj
              </button>
              <button
                class="g-btn !bg-red-500 hover:!bg-red-600 flex-1 text-white border-none"
                :disabled="isDeleting"
                @click="handleRemoveItem"
              >
                <i v-if="isDeleting" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-trash"></i>
                {{ isDeleting ? 'Usuwanie...' : 'Tak, usuń' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.items-layout {
  width: 100%;
  height: calc(100vh - 60px);
  padding: 1rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header & Search - unchanged structure */
.items-header {
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

/* Actions Dock */
.actions-dock {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
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
  transition: all 0.2s ease;
}
.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}
.action-btn.highlight {
  color: var(--primary);
  background: rgba(var(--primary-rgb), 0.1);
}
.action-btn.highlight:hover {
  background: var(--primary);
  color: white;
}
.dock-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 0.5rem;
}

/* Main Panel */
.items-glass-panel {
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

/* Loading & Empty */
.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 50;
  color: white;
  gap: 1rem;
}
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}
.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.1);
}

/* List */
.items-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

/* --- CARD FIXES --- */
.item-card {
  display: flex;
  align-items: stretch;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  padding: 0.8rem;
  gap: 1rem;

  /* FIXED: Usunięto przesuwanie layoutu (transform), dodano tylko zmianę koloru */
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  position: relative; /* Context for absolute positioning if needed */
}

.item-card:hover {
  background: rgba(255, 255, 255, 0.07); /* Jaśniejsze tło */
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  /* FIXED: Brak transform: translateX() aby elementy nie uciekały */
}

/* Visuals */
.item-visuals {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.reorder-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.reorder-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.reorder-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}
.reorder-btn.invisible {
  opacity: 0;
  pointer-events: none;
}

.img-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}
.img-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Info */
.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.3rem;
  overflow: hidden;
}
.item-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.item-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.price-badge {
  font-size: 0.75rem;
  background: rgba(var(--primary-rgb), 0.15);
  color: var(--primary);
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
}
.item-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- ACTIONS FIX --- */
.item-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-left: 1rem;
  border-left: 1px solid rgba(255, 255, 255, 0.05);

  /* FIXED: Domyślnie ukryte, ale płynne pojawianie się */
  opacity: 0;
  transform: translateX(10px);

  /* Ważne: opóźnienie znikania (transition-delay), aby złapać myszkę */
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  transition-delay: 0.1s; /* Opóźnienie znikania */
}

.item-card:hover .item-actions {
  opacity: 1;
  transform: translateX(0);
  transition-delay: 0s; /* Natychmiastowe pojawianie się */
}

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
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
  background: rgba(255, 255, 255, 0.2);
  color: white;
  transform: scale(1.05);
}
.edit-btn:hover {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.2);
}
.delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.2);
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
