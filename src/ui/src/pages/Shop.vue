<script lang="ts" setup>
import { getItems } from '@ui/api/endpoints'
import ShopItem from '@ui/components/ShopItem.vue'
import CartSidebar from '@ui/components/CartSidebar.vue'
import ItemDetailsModal from '@ui/components/modals/ItemDetailsModal.vue'
import useCartStore from '@ui/stores/cart-store'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Item } from '@ui/stores/cart-store'

interface ShopItemData extends Item {
  type?: string
  index?: number
}

const { t } = useI18n()
const cartStore = useCartStore()
const data = ref<ShopItemData[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const itemModalRef = ref<InstanceType<typeof ItemDetailsModal> | null>(null)

const categories = ['Wszystko', 'Itemy', 'Klucze', 'Rangi']
const selectedCategory = ref('Wszystko')

const openItemDetails = (item: ShopItemData): void => {
  itemModalRef.value?.openModal(item)
}

const fetchItems = async (): Promise<void> => {
  isLoading.value = true
  const res = await getItems()

  if (res) {
    data.value = res
      .map((item) => ({
        ...item,
        index: item.index ?? 0
      }))
      .sort((a, b) => a.index - b.index)
  }
  isLoading.value = false
}

const filteredItems = computed(() => {
  let result = data.value

  if (selectedCategory.value !== 'Wszystko') {
    result = result.filter((item) => {
      const cat = selectedCategory.value
      if (cat === 'Itemy')
        return item.type === 'item' || item.category === 'Itemy' || item.category === 'item'
      if (cat === 'Klucze')
        return (
          item.type === 'key_item' ||
          item.type === 'key' ||
          item.category === 'Klucze' ||
          item.category === 'key_item'
        )
      if (cat === 'Rangi')
        return item.type === 'rank' || item.category === 'Rangi' || item.category === 'rank'
      return item.category === cat || item.type === cat.toLowerCase()
    })
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((item) => item.name.toLowerCase().includes(query))
  }

  return result
})

const featuredOccasions = computed(() => {
  if (!data.value.length) return []

  // Logic similar to website to pick 3 featured items
  const promoted = data.value.filter((i) => i.promotion && i.promotion > 0)
  if (promoted.length >= 3) return promoted.slice(0, 3)

  // If not enough promoted, fill with random/first items
  const combined = [...promoted, ...data.value.filter((i) => !promoted.includes(i))]
  return combined.slice(0, 3)
})

onMounted(async () => {
  await fetchItems()
})
</script>

<template>
  <div class="shop-layout shadow-inner">
    <div class="shop-header">
      <div class="header-left">
        <div class="categories-nav">
          <button
            v-for="cat in categories"
            :key="cat"
            class="cat-btn"
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = cat"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <div class="header-right">
        <div class="search-container">
          <i class="fas fa-search"></i>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('shop.searchPlaceholder', 'Szukaj w sklepie...')"
          />
        </div>

        <div class="actions-dock">
          <button class="cart-toggle-btn" @click="cartStore.isCartDrawerOpen = true">
            <i class="fas fa-shopping-cart"></i>
            <span v-if="cartStore.cart.length > 0" class="cart-count">{{
              cartStore.cart.length
            }}</span>
          </button>
          <button class="action-btn" :title="t('shop.refresh', 'Odśwież')" @click="fetchItems">
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': isLoading }"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="shop-content custom-scrollbar">
      <!-- Gorące Okazje -->
      <div
        v-if="selectedCategory === 'Wszystko' && !searchQuery.trim() && featuredOccasions.length"
        class="occasions-section"
      >
        <h2 class="section-title"><i class="fas fa-fire"></i> Gorące Okazje</h2>
        <div class="occasions-grid">
          <ShopItem
            v-for="item in featuredOccasions"
            :key="'featured-' + item.uuid"
            :item="item"
            @show-details="openItemDetails"
          />
        </div>
        <div class="section-divider"></div>
      </div>

      <!-- Main Grid -->
      <div class="main-shop-section">
        <h2 v-if="selectedCategory === 'Wszystko' && !searchQuery.trim()" class="section-title">
          Wszystkie Produkty
        </h2>

        <div v-if="isLoading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <span>{{ t('shop.loading', 'Ładowanie sklepu...') }}</span>
        </div>

        <div v-else-if="filteredItems.length === 0" class="empty-state">
          <div class="empty-icon"><i class="fas fa-shopping-basket"></i></div>
          <h3>{{ t('shop.noResultsTitle', 'Brak produktów') }}</h3>
          <p>{{ t('shop.noResultsDesc', 'Nie znaleziono produktów spełniających kryteria.') }}</p>
        </div>

        <div v-else class="shop-grid">
          <ShopItem
            v-for="item in filteredItems"
            :key="item.uuid"
            :item="item"
            data-aos="fade-up"
            @show-details="openItemDetails"
          />
        </div>
      </div>
    </div>

    <ItemDetailsModal ref="itemModalRef" />
    <CartSidebar />
  </div>
</template>

<style scoped>
.shop-layout {
  width: 100%;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.shop-header {
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(10, 10, 15, 0.4);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  z-index: 10;
}

.header-right {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.categories-nav {
  display: flex;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.4rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.cat-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: #a0a0a0;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
}

.cat-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.05);
}

.cat-btn.active {
  background: #ff007c;
  color: white;
  box-shadow: 0 4px 15px rgba(255, 0, 124, 0.3);
}

.search-container {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.6rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  width: 280px;
  transition: all 0.3s;
}

.search-container:focus-within {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 0, 124, 0.5);
}

.search-container i {
  color: #606060;
  margin-right: 0.8rem;
}

.search-container input {
  background: transparent;
  border: none;
  outline: none;
  color: white;
  width: 100%;
}

.actions-dock {
  display: flex;
  gap: 0.8rem;
}

.cart-toggle-btn {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 0, 124, 0.1);
  border: 1px solid rgba(255, 0, 124, 0.2);
  color: #ff007c;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.cart-toggle-btn:hover {
  background: #ff007c;
  color: white;
  transform: scale(1.05);
}

.cart-count {
  position: absolute;
  top: -5px;
  right: -5px;
  background: white;
  color: #ff007c;
  font-size: 0.7rem;
  font-weight: 900;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  border: 2px solid #0d0d12;
}

.action-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #a0a0a0;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

/* Content Area */
.shop-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: white;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.section-title i {
  color: #ff007c;
}

.occasions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
  margin: 3rem 0;
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

/* States */
.loading-state,
.empty-state {
  padding: 5rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #606060;
  gap: 1rem;
}

.loading-state i {
  font-size: 2rem;
  color: #ff007c;
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.2;
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
