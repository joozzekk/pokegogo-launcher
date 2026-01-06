<script lang="ts" setup>
import { themes } from '@ui/assets/theme/themes'
import useGeneralStore from '@ui/stores/general-store'
import firstFloating from '@ui/assets/img/firstFloating.png'
import secondFloating from '@ui/assets/img/secondFloating.png'
import background from '@ui/assets/img/choinka.png'
import { computed } from 'vue'

const generalStore = useGeneralStore()

const bgImage = computed(() => {
  return (
    themes.find((theme) => theme.name === generalStore.getTheme())?.backgroundImage ?? background
  )
})

const firstFloatingBlock = computed(() => {
  return (
    themes.find((theme) => theme.name === generalStore.getTheme())?.firstFloating ?? firstFloating
  )
})

const secondFloatingBlock = computed(() => {
  return (
    themes.find((theme) => theme.name === generalStore.getTheme())?.secondFloating ?? secondFloating
  )
})
</script>

<template>
  <div class="animated-bg">
    <img
      :src="bgImage"
      alt="background"
      class="absolute !h-[100vh] w-full !object-cover"
      @dragstart.prevent="null"
    />

    <div class="particles"></div>
  </div>
  <div class="vignette"></div>
  <div class="background">
    <div class="bg-gradient"></div>
    <div class="floating-blocks">
      <div class="block-1" @dragstart.prevent="null">
        {{ firstFloatingBlock }}
      </div>
      <div class="block-2" @dragstart.prevent="null">
        {{ firstFloatingBlock }}
      </div>
      <div class="block-3" @dragstart.prevent="null">
        {{ firstFloatingBlock }}
      </div>
      <div class="ghost-1" @dragstart.prevent="null">
        {{ secondFloatingBlock }}
      </div>
      <div class="ghost-2" @dragstart.prevent="null">
        {{ secondFloatingBlock }}
      </div>
      <div class="ghost-3" @dragstart.prevent="null">
        {{ secondFloatingBlock }}
      </div>
    </div>
  </div>
</template>
