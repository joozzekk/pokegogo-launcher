<template>
  <div
    ref="dropdown"
    class="custom-select"
    :class="{ disabled }"
    @click="$props.disabled ? null : toggleOpen()"
  >
    <div class="selected">
      {{ selectedLabel }}
      <i class="fas fa-chevron-down dropdown-icon"></i>
    </div>
    <ul v-if="open" class="options-list">
      <li
        v-for="option in options"
        :key="option.value"
        :class="{ selected: option.value === modelValue }"
        @click.stop="selectOption(option)"
      >
        {{ option.label }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

interface IOption {
  label: string
  value: number | string
}

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    modelValue: string | number
    options: IOption[]
  }>(),
  {
    disabled: false
  }
)

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const dropdown = ref<string | number | null>(null)

const selectedLabel = computed(() => {
  const selectedOption = props.options.find((opt) => opt.value === props.modelValue)
  return selectedOption ? selectedOption.label : 'Select...'
})

function toggleOpen(): void {
  open.value = !open.value
}

function selectOption(option: IOption): void {
  emit('update:modelValue', option.value)
  open.value = false
}

function onClickOutside(event: any): void {
  if (
    dropdown.value &&
    typeof dropdown.value === 'string' &&
    dropdown.value?.includes(event.target)
  ) {
    open.value = false
  }
}

// Close dropdown on outside click
onMounted(() => {
  document.addEventListener('click', onClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<style scoped>
.custom-select {
  position: relative;
  min-width: 200px;
  background: var(--bg-light);
  border: 2px solid var(--border);
  border-radius: 1rem;
  cursor: pointer;
  user-select: none;
  font-size: 1rem;
  padding-right: 2rem;
  color: var(--text-primary);
}

.disabled {
  color: var(--text-secondary);
  cursor: default !important;
}

.selected {
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dropdown-icon {
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-secondary);
  font-size: 1rem;
}

.options-list {
  position: absolute;
  width: 100%;
  margin: 0;
  margin-top: 0.25rem;
  padding: 0;
  list-style: none;
  background: var(--bg-light);
  border: 2px solid var(--border);
  border-radius: 1rem;
  overflow-y: auto;
  z-index: 1000;
}

.options-list li {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.options-list li:hover {
  background-color: var(--bg-card);
}

.options-list li.selected {
  background-color: var(--bg-card);
  font-weight: bold;
}
</style>
