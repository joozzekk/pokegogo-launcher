import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getEvents } from '@ui/api/endpoints'
import { LOGGER } from '@ui/services/logger-service'

export const useEventsStore = defineStore('events', () => {
  const events = ref<Record<string, unknown>[]>([])
  const isLoading = ref(false)

  const fetchEvents = async (): Promise<void> => {
    isLoading.value = true
    try {
      const res = await getEvents()
      if (res) {
        events.value = res
        LOGGER.with('Events Store').success('Events updated successfully')
      }
    } catch (err) {
      LOGGER.with('Events Store').err('Failed to fetch events:', err)
    } finally {
      isLoading.value = false
    }
  }

  const setEvents = (newEvents: Record<string, unknown>[]): void => {
    events.value = newEvents
  }

  return {
    events,
    isLoading,
    fetchEvents,
    setEvents
  }
})
