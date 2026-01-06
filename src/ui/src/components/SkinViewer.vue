<template>
  <canvas ref="container" class="skin-viewer-container"></canvas>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import * as skin3d from 'skin3d'
import { LOGGER } from '@ui/services/logger-service'

const VIEWER_WIDTH = 40
const VIEWER_HEIGHT = 100

const props = defineProps<{
  skin: string
}>()

const container = ref<HTMLCanvasElement | null>(null)
let skinViewer: skin3d.View | null = null
const initSkinViewer = (): void => {
  if (!container.value) return

  try {
    skinViewer = new skin3d.View({
      canvas: container.value,
      width: VIEWER_WIDTH,
      height: VIEWER_HEIGHT,
      skin: {
        src: props.skin,
        crossOrigin: '*',
        referrerPolicy: 'no-referrer'
      },
      model: 'auto-detect'
    })

    skinViewer.controls.enableRotate = false
    skinViewer.playerObject.rotateY(0.6)
  } catch (err: unknown) {
    LOGGER.err('Failed to initialize SkinViewer:', err as string)
  }
}

watch(
  () => props.skin,
  (newSkin) => {
    if (skinViewer) {
      skinViewer.loadSkin(newSkin)
    }
  }
)

onMounted(() => {
  initSkinViewer()
})
</script>

<style scoped>
.skin-viewer-container {
  width: 50px;
  height: 100px;
  margin: 0 auto;
  position: relative;
}
</style>
