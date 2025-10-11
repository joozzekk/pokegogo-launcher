<template>
  <div class="shopitem" @click="handleClick">
    <img :src="item.src" :alt="item.name" loading="lazy" />
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

const fmt = (n: number): string =>
  `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(n)} PLN`

const handleClick = (e: MouseEvent): void => {
  if (props.item.uuid) {
    e.preventDefault()
    window.open('https://pokemongogo.pl/item?uuid=' + props.item.uuid)
  }
}
</script>
