<script lang="ts" setup>
import { initShop } from '@renderer/assets/scripts/shop'
import { onMounted } from 'vue'

onMounted(() => {
  initShop()
})
</script>

<template>
  <div id="shopPage" class="page">
    <iframe
      id="shopFrame"
      src="https://pokemongogo.pl/sklep"
      class="shop-iframe"
      title="Sklep PokemonGoGo"
    >
    </iframe>

    <div class="shop-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Ładowanie sklepu...</p>
    </div>
  </div>
</template>
