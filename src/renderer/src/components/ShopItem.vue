<template>
  <div class="shopitem" @click="handleClick">
    <img
      :src="
        item.src.includes('https://') || item.src.includes('blob')
          ? item.src
          : `${url}/items/image/${item.uuid}`
      "
      :alt="item.name"
      loading="lazy"
      class="!max-w-[500px] select-none"
      @dragstart.prevent="null"
    />
    <div class="meta">
      <h3>{{ item.name }}</h3>
      <span class="price">{{ fmt(item.price) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  item: any
}>()

const url = import.meta.env.RENDERER_VITE_API_URL

const fmt = (n: number): string =>
  `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(n)} PLN`

const handleClick = (e: MouseEvent): void => {
  if (props.item.uuid) {
    e.preventDefault()
    window.open(`${import.meta.env.RENDERER_VITE_WEBPAGE}/item?uuid=` + props.item.uuid)
  }
}
</script>
