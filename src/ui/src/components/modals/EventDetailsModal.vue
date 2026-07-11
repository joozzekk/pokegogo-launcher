<script lang="ts" setup>
import { ref } from 'vue'
import CachedImage from '@ui/components/CachedImage.vue'
import { format, parseISO } from 'date-fns'

const url = import.meta.env.RENDERER_VITE_API_URL

const modalVisible = ref(false)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eventData = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dateLocale = ref<any>(null)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const openModal = (event: any, dl: any): void => {
  eventData.value = event
  dateLocale.value = dl
  modalVisible.value = true
}

const handleExit = (): void => {
  modalVisible.value = false
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
        <div class="g-card g-modal-card event-modal">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box">
                <i class="fas fa-calendar-alt"></i>
              </div>
              <h3>{{ eventData?.name }}</h3>
            </div>
            <button class="g-close-btn" @click="handleExit">
              <i class="fa fa-times" />
            </button>
          </div>

          <div class="g-modal-content custom-scrollbar">
            <div class="event-image-container">
              <CachedImage
                v-if="eventData"
                :uuid="eventData.uuid"
                :src="
                  eventData.src.includes('https://') || eventData.src.includes('blob')
                    ? eventData.src
                    : `${url}/events/image/${eventData.uuid}`
                "
                alt="Event Image"
                class="event-image"
              />
            </div>

            <div v-if="eventData?.startDate" class="event-meta">
              <i class="far fa-calendar-alt"></i>
              <span>{{
                format(parseISO(eventData.startDate), 'dd MMM yyyy', { locale: dateLocale })
              }}</span>
              <span v-if="eventData?.endDate">
                - {{ format(parseISO(eventData.endDate), 'dd MMM yyyy', { locale: dateLocale }) }}
              </span>
            </div>

            <div class="event-description">
              <p>{{ eventData?.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.event-modal {
  max-width: 600px;
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

.event-image-container {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.event-image {
  width: 100%;
  height: auto;
  max-height: 300px;
  object-fit: cover;
  display: block;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary);
  font-weight: 600;
  margin-bottom: 1rem;
  padding: 0 1rem;
}

.event-description {
  padding: 0 1rem 1.5rem 1rem;
}

.event-description p {
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  font-size: 1rem;
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
