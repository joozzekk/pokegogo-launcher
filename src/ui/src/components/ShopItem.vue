<script setup lang="ts">
import useCartStore from '@ui/stores/cart-store'
import { ref, onMounted } from 'vue'

import type { Item } from '@ui/stores/cart-store'

const props = defineProps<{
  item: Item
}>()

const emit = defineEmits(['showDetails'])

const cartStore = useCartStore()
const url = import.meta.env.RENDERER_VITE_API_URL
const imgSrc = ref('')
const retryCount = ref(0)
const maxRetries = 5

const fmt = (n: number): string =>
  `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(n)} PLN`

const calcPrice = (price: number, promotion?: number): number => {
  if (!promotion || promotion <= 0 || promotion >= price) return price
  return price - promotion
}

const calcPromotion = (price: number, promotion?: number): number => {
  if (!promotion || promotion <= 0 || promotion >= price) return 0
  return Math.round((promotion / price) * 100)
}

const handleDetailsClick = (e: MouseEvent): void => {
  if (props.item.uuid) {
    e.preventDefault()
    emit('showDetails', props.item)
  }
}

const quickAdd = (e: MouseEvent): void => {
  e.stopPropagation()
  cartStore.addToCart(props.item)
}

const handleImgError = (): void => {
  if (retryCount.value < maxRetries) {
    retryCount.value++
    setTimeout(() => {
      const baseSrc =
        props.item.src && (props.item.src.includes('https') || props.item.src.includes('blob'))
          ? props.item.src
          : `${url}/items/image/${props.item.uuid}`

      const separator = baseSrc.includes('?') ? '&' : '?'
      imgSrc.value = `${baseSrc}${separator}retry=${retryCount.value}&t=${Date.now()}`
    }, 1000 * retryCount.value)
  } else {
    imgSrc.value = 'none' // fallback handle in template?
  }
}

onMounted(() => {
  if (props.item.src && (props.item.src.includes('https') || props.item.src.includes('blob'))) {
    imgSrc.value = props.item.src
  } else {
    imgSrc.value = `${url}/items/image/${props.item.uuid}`
  }
})
</script>

<template>
  <div class="shop-card" @click="handleDetailsClick">
    <!-- Corner Tag -->
    <div v-if="item.promotion && item.promotion > 0" class="promotion-tag">
      -{{ calcPromotion(item.price, item.promotion) }}%
    </div>

    <!-- Count Tag -->
    <div v-if="item.count && item.count > 1" class="count-tag">x{{ item.count }}</div>

    <div class="card-image-wrapper">
      <div class="glow-bg"></div>
      <img
        v-if="imgSrc !== 'none'"
        :src="imgSrc"
        :alt="item.name"
        loading="lazy"
        @error="handleImgError"
        @dragstart.prevent
      />
      <div v-else class="no-img-fallback">
        <i class="fas fa-image"></i>
      </div>
    </div>

    <div class="card-content">
      <h3 class="item-title">{{ item.name }}</h3>

      <div class="card-footer">
        <div class="price-container">
          <span class="price-badge">
            {{ fmt(calcPrice(item.price, item.promotion)) }}
          </span>
          <span v-if="item.promotion && item.promotion > 0" class="old-price">
            {{ fmt(item.price) }}
          </span>
        </div>

        <button class="add-cart-btn" title="Dodaj do koszyka" @click.stop="quickAdd">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-card {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  cursor: pointer;
  height: 340px;
}

.shop-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 0, 124, 0.3);
  transform: translateY(-6px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
}

/* Promotion Tag */
.promotion-tag {
  position: absolute;
  top: 0;
  right: 0;
  background: linear-gradient(135deg, #ff007c 0%, #ff4757 100%);
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  font-weight: 900;
  border-bottom-left-radius: 16px;
  z-index: 10;
  box-shadow: -5px 5px 15px rgba(255, 0, 124, 0.2);
}

/* Count Tag */
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

/* Image */
.card-image-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  overflow: hidden;
}

.glow-bg {
  position: absolute;
  width: 140px;
  height: 140px;
  background: #ff007c;
  opacity: 0.1;
  filter: blur(45px);
  border-radius: 50%;
  transition: all 0.3s;
}

.shop-card:hover .glow-bg {
  opacity: 0.2;
  transform: scale(1.2);
}

.card-image-wrapper img {
  max-width: 100%;
  max-height: 180px;
  object-fit: contain;
  filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.4));
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 1;
}

.shop-card:hover img {
  transform: scale(1.1) rotate(2deg);
}

.no-img-fallback {
  color: rgba(255, 255, 255, 0.1);
  font-size: 3rem;
}

/* Content */
.card-content {
  padding: 1.2rem;
  background: rgba(10, 10, 15, 0.6);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.item-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: white;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.5px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price-container {
  display: flex;
  flex-direction: column;
}

.price-badge {
  font-size: 1.1rem;
  font-weight: 800;
  color: #ff007c;
}

.old-price {
  font-size: 0.75rem;
  color: #606060;
  text-decoration: line-through;
  margin-top: -2px;
}

.add-cart-btn {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #ff007c;
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(255, 0, 124, 0.3);
}

.add-cart-btn:hover {
  background: #ff3396;
  transform: scale(1.1) rotate(10deg);
  box-shadow: 0 8px 25px rgba(255, 0, 124, 0.4);
}

.add-cart-btn:active {
  transform: scale(0.9);
}
</style>
