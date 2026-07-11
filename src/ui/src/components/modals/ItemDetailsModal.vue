<script lang="ts" setup>
import { ref } from 'vue'
import CachedImage from '@ui/components/CachedImage.vue'
import useCartStore from '@ui/stores/cart-store'

import type { Item } from '@ui/stores/cart-store'

const url = import.meta.env.RENDERER_VITE_API_URL
const cartStore = useCartStore()

const modalVisible = ref(false)
const itemData = ref<Item | null>(null)
const selectedQuantity = ref(1)

const openModal = (item: Item): void => {
  itemData.value = item
  selectedQuantity.value = 1
  modalVisible.value = true
}

const handleExit = (): void => {
  modalVisible.value = false
}

const addToCart = (): void => {
  if (itemData.value) {
    cartStore.addToCart(itemData.value, selectedQuantity.value)
    handleExit()
  }
}

const isItemCountable = (): boolean => {
  if (!itemData.value) return false
  if (itemData.value.category === 'Rangi' || itemData.value.name.toLowerCase().includes('ranga'))
    return false
  return itemData.value.isCountable !== false
}

const incQuantity = (): void => {
  if (selectedQuantity.value < 64) selectedQuantity.value++
}

const decQuantity = (): void => {
  if (selectedQuantity.value > 1) selectedQuantity.value--
}

const fmt = (n: number): string =>
  `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(n)} PLN`

const calcPrice = (price: number, promotion?: number): number => {
  if (!promotion || promotion <= 0 || promotion >= price) return price
  return price - promotion
}

defineExpose({
  openModal
})
</script>

<template>
  <Teleport to="#modalsContainer">
    <Transition name="fade">
      <div
        v-if="modalVisible"
        class="g-modal-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="handleExit"
      >
        <div class="g-card g-modal-card item-modal">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box">
                <i class="fas fa-box-open"></i>
              </div>
              <h3>{{ itemData?.name }}</h3>
            </div>
            <button class="g-close-btn" @click="handleExit">
              <i class="fa fa-times" />
            </button>
          </div>

          <div class="g-modal-content custom-scrollbar">
            <div class="item-image-container">
              <CachedImage
                v-if="itemData"
                :uuid="itemData.uuid"
                :src="
                  itemData.src &&
                  (itemData.src.includes('https://') || itemData.src.includes('blob'))
                    ? itemData.src
                    : `${url}/items/image/${itemData.uuid}`
                "
                alt="Item Image"
                class="item-image"
              />
              <div v-if="itemData?.count && itemData.count > 1" class="count-tag">
                x{{ itemData.count }}
              </div>
            </div>

            <div v-if="itemData" class="item-meta">
              <div class="price-container">
                <span class="price-badge">
                  {{ fmt(calcPrice(itemData.price, itemData.promotion)) }}
                </span>
                <span v-if="itemData.promotion && itemData.promotion > 0" class="old-price">
                  {{ fmt(itemData.price) }}
                </span>
              </div>
            </div>

            <div class="item-description">
              <p>{{ itemData?.desc || 'Brak opisu produktu.' }}</p>
            </div>
          </div>

          <div class="item-footer">
            <div v-if="isItemCountable()" class="quantity-selector">
              <button class="q-btn" @click="decQuantity"><i class="fas fa-minus"></i></button>
              <span class="q-val">{{ selectedQuantity }}</span>
              <button class="q-btn" @click="incQuantity"><i class="fas fa-plus"></i></button>
            </div>
            <button class="add-to-cart-btn" @click="addToCart">
              <i class="fas fa-cart-plus"></i> Dodaj do koszyka
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.item-modal {
  max-width: 500px;
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.g-modal-content {
  overflow-y: auto;
  padding: 0;
  margin-top: 1rem;
}

.item-image-container {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  background: rgba(255, 255, 255, 0.03);
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.item-image {
  max-width: 100%;
  max-height: 250px;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.4));
}

.count-tag {
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  font-weight: 900;
  border-bottom-right-radius: 16px;
  z-index: 10;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0 1rem;
}

.price-container {
  display: flex;
  flex-direction: column;
}

.price-badge {
  font-size: 1.4rem;
  font-weight: 800;
  color: #ff007c;
}

.old-price {
  font-size: 0.85rem;
  color: #606060;
  text-decoration: line-through;
  margin-top: -2px;
}

.item-description {
  padding: 0 1rem 1.5rem 1rem;
}

.item-description p {
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  font-size: 1rem;
}

.item-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  gap: 1rem;
  align-items: stretch;
  background: rgba(10, 10, 15, 0.4);
}

.quantity-selector {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 0.2rem;
}

.q-btn {
  background: transparent;
  border: none;
  color: #a0a0a0;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: all 0.2s;
  border-radius: 8px;
}

.q-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.05);
}

.q-val {
  font-size: 1rem;
  font-weight: 800;
  color: white;
  min-width: 32px;
  text-align: center;
}

.add-to-cart-btn {
  background: #ff007c;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 0.8rem 2rem;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  transition: all 0.3s;
  flex: 1;
  justify-content: center;
}

.add-to-cart-btn:hover {
  background: #ff3396;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 0, 124, 0.4);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
