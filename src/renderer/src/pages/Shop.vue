<script lang="ts" setup>
import { getItems } from '@renderer/api/endpoints'
import ShopItem from '@renderer/components/ShopItem.vue'
import { onMounted, ref } from 'vue'

const data = ref<any[]>([])

const fetchItems = async (): Promise<void> => {
  const res = await getItems()

  if (res) {
    data.value = res
  }
}

onMounted(async () => {
  await fetchItems()
})
</script>

<template>
  <div class="shop-container">
    <section class="shop-grid-wrap">
      <div v-if="data.length" class="shop-grid" data-aos="zoom-in">
        <ShopItem v-for="item in data" :key="item.uuid" :item="item" />
      </div>
    </section>
  </div>
</template>

<style>
.shop-container {
  max-height: 100%;
  overflow-y: auto;
}

.shop-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 1200px) {
  .shop-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .shop-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 768px) {
  .shop-grid {
    grid-template-columns: 1fr;
  }
}

.shopitem {
  position: relative;
  min-height: 320px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.02);
  box-shadow: var(--shadow);
  overflow: hidden;
  display: grid;
  place-items: center;
  transition:
    transform 0.18s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.shopitem::before {
  content: '';
  position: absolute;
  inset: -30% -10% auto -10%;
  height: 60%;
  background:
    radial-gradient(600px 200px at 20% 40%, #ffae002f, transparent 70%),
    radial-gradient(500px 180px at 80% 60%, #ad85032f, transparent 70%);
  pointer-events: none;
}

.shopitem:hover {
  transform: translateY(-5px);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.5);
  border-color: #ffae00b5;
  cursor: pointer;
}

.shopitem img {
  width: min(68%, 360px);
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 14px 24px rgba(0, 0, 0, 0.45));
  transition: transform 0.18s ease;
}

.shopitem:hover img {
  transform: scale(1.04);
}

.shopitem .meta {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.shopitem .meta h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.shopitem .price {
  font-weight: 800;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 999px;
  color: #ffae00;
  background: black;
  border: 1px dashed #ffae007e;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.06),
    0 6px 14px rgba(0, 0, 0, 0.25);
}
</style>
