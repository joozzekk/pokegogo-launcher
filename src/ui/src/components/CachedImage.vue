<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  uuid?: string | number
  src: string
  alt?: string
  className?: string
}>()

const displaySrc = ref<string>('')
const isLoaded = ref(false)

const updateDisplaySrc = async (): Promise<void> => {
  if (!props.src) return

  // Cache if it's an event image with a UUID and not a blob URL
  const isCacheable = props.uuid && !props.src.includes('blob:')

  if (isCacheable && window.electron?.images) {
    // Check cache first
    const cachedPath = await window.electron.images.getEvent(props.uuid!.toString(), props.src)
    displaySrc.value = cachedPath
  } else {
    displaySrc.value = props.src
  }
}

const onImageUpdate = (_event: unknown, newSrc: string): void => {
  displaySrc.value = newSrc
}

onMounted(() => {
  updateDisplaySrc()

  if (props.uuid && window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.on(`image:updated:${props.uuid}`, onImageUpdate)
  }
})

onUnmounted(() => {
  if (props.uuid && window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.removeAllListeners(`image:updated:${props.uuid}`)
  }
})

watch(() => props.src, updateDisplaySrc)
</script>

<template>
  <img
    v-show="displaySrc"
    :src="displaySrc"
    :alt="alt"
    :class="[
      className,
      { 'opacity-0': !isLoaded, 'opacity-100 transition-opacity duration-300': isLoaded }
    ]"
    @load="isLoaded = true"
    @dragstart.prevent
  />
</template>
