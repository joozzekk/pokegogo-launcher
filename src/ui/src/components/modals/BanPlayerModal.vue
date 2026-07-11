// BanModal.vue
<script lang="ts" setup>
import { banPlayer, unbanPlayer } from '@ui/api/endpoints'
import { IUser } from '@ui/env'
import useUserStore from '@ui/stores/user-store'
import { UserRole } from '@ui/types/app'
import { showToast } from '@ui/utils'
import DatePicker from 'primevue/datepicker'
import { discordLogger } from '@ui/services/discord-service'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

type BanType = 'nickname' | 'hwid'
type BanMode = 'temporary' | 'permanent'

const modalVisible = ref(false)
const banReasonInput = ref('')
const banType = ref<BanType>('nickname')
const banMode = ref<BanMode>('temporary')
const banTime = ref<Date | null>(null)
const playerData = ref<IUser>()
const actionType = ref<'ban' | 'unban'>('ban')

const userStore = useUserStore()

const emits = defineEmits<{
  (e: 'refreshData'): Promise<void> | void
}>()

const isPermanentBan = computed(() => banMode.value === 'permanent')

const isBanDisabled = computed(() => {
  if (actionType.value !== 'ban') return false

  const hasReason = !!banReasonInput.value.trim()

  if (isPermanentBan.value) {
    return !hasReason
  }

  return !hasReason || !banTime.value
})

const openModal = async (player: IUser, type: 'unban' | 'ban' = 'ban'): Promise<void> => {
  modalVisible.value = true
  playerData.value = player
  actionType.value = type

  // reset stanu przy każdym otwarciu
  banReasonInput.value = ''
  banType.value = 'nickname'
  banMode.value = 'temporary'
  banTime.value = null
}

const banUser = async (): Promise<void> => {
  if (!playerData.value) return

  const payload: {
    nickname: string
    machineId?: string
    macAddress?: string
    type: BanType
    banEndDate?: Date
    reason: string
  } = {
    nickname: playerData.value.nickname,
    machineId: playerData.value.machineId,
    macAddress: playerData.value.macAddress,
    type: banType.value,
    reason: banReasonInput.value.trim()
  }

  // przy banie czasowym wysyłamy banEndDate
  if (!isPermanentBan.value && banTime.value) {
    payload.banEndDate = banTime.value
  }

  try {
    const res = await banPlayer(payload)

    if (res) {
      await emits('refreshData')

      await discordLogger.sendLog('Player Banned', [
        { name: 'Moderator', value: userStore.user?.nickname || 'Unknown' },
        { name: 'Target', value: playerData.value.nickname },
        { name: 'Type', value: banType.value },
        {
          name: 'Duration',
          value: isPermanentBan.value ? 'Permanent' : banTime.value?.toLocaleString() || 'Unknown'
        },
        { name: 'Reason', value: banReasonInput.value.trim() }
      ])

      modalVisible.value = false
      showToast(
        isPermanentBan.value
          ? `${t('modals.banPlayer.successPerm')} ${playerData.value.nickname}`
          : `${t('modals.banPlayer.successTemp')} ${playerData.value.nickname}`,
        'success'
      )
    }
  } catch (error: any) {
    showToast(error?.response?.data?.message || 'Wystąpił błąd podczas banowania', 'error')
  }
}

const unbanUser = async (): Promise<void> => {
  if (!playerData.value) return

  try {
    const res = await unbanPlayer({
      nickname: playerData.value.nickname,
      machineId: playerData.value.machineId,
      macAddress: playerData.value.macAddress,
      type: playerData.value.banType
    })

    if (res) {
      await emits('refreshData')

      await discordLogger.sendLog('Player Unbanned', [
        { name: 'Moderator', value: userStore.user?.nickname || 'Unknown' },
        { name: 'Target', value: playerData.value.nickname }
      ])

      showToast(`${t('modals.banPlayer.successUnban')} ${playerData.value.nickname}`, 'success')
      handleCancel()
    }
  } catch (error: any) {
    showToast(error?.response?.data?.message || 'Wystąpił błąd podczas odbanowania', 'error')
  }
}

const handleCancel = (): void => {
  banReasonInput.value = ''
  banTime.value = null
  banType.value = 'nickname'
  banMode.value = 'temporary'
  modalVisible.value = false
}

defineExpose({
  openModal
})
</script>

<template>
  <Teleport to="#modalsContainer">
    <Transition name="fade">
      <div v-if="modalVisible" class="g-modal-overlay" role="dialog" aria-modal="true">
        <div class="g-card g-modal-card ban-modal-compact">
          <div class="g-card-header">
            <div class="flex items-center gap-4">
              <div class="g-icon-box danger">
                <i class="fas fa-gavel"></i>
              </div>
              <h3>
                {{
                  actionType === 'ban'
                    ? t('modals.banPlayer.titleBan')
                    : t('modals.banPlayer.titleUnban')
                }}
              </h3>
            </div>
            <button class="g-close-btn" @click="handleCancel">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="g-modal-content">
            <template v-if="actionType === 'ban'">
              <!-- Grid layer for selectors -->
              <div class="grid grid-cols-2 gap-4 mb-3">
                <!-- Ban Type -->
                <div v-if="userStore.user" class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-gray-400">{{
                    t('modals.banPlayer.type')
                  }}</label>
                  <div class="flex bg-black/20 p-1 rounded-xl">
                    <button
                      v-if="
                        [
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.DEV, UserRole.DEV_EN,
                          UserRole.MODERATOR,
                          UserRole.MOD,
                          UserRole.HELPER,
                          UserRole.POMOCNIK
                        ].includes(userStore.user.role?.toLowerCase() as UserRole) &&
                        !!playerData?.machineId
                      "
                      class="flex-1 py-1 text-[10px] font-semibold rounded-lg transition-all"
                      :class="
                        banType === 'hwid'
                          ? 'bg-[var(--bg-card)] text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      "
                      @click="banType = 'hwid'"
                    >
                      {{ t('modals.banPlayer.hwid') }}
                    </button>
                    <button
                      class="flex-1 py-1 text-[10px] font-semibold rounded-lg transition-all"
                      :class="
                        banType === 'nickname'
                          ? 'bg-[var(--bg-card)] text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      "
                      @click="banType = 'nickname'"
                    >
                      {{ t('modals.banPlayer.nick') }}
                    </button>
                  </div>
                </div>

                <!-- Ban Mode -->
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-gray-400">{{
                    t('modals.banPlayer.duration')
                  }}</label>
                  <div class="flex bg-black/20 p-1 rounded-xl">
                    <button
                      class="flex-1 py-1 text-[10px] font-semibold rounded-lg transition-all"
                      :class="
                        banMode === 'temporary'
                          ? 'bg-[var(--bg-card)] text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      "
                      @click="banMode = 'temporary'"
                    >
                      {{ t('modals.banPlayer.temp') }}
                    </button>
                    <button
                      class="flex-1 py-1 text-[10px] font-semibold rounded-lg transition-all"
                      :class="
                        banMode === 'permanent'
                          ? 'bg-[var(--bg-card)] text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      "
                      @click="banMode = 'permanent'"
                    >
                      {{ t('modals.banPlayer.perm') }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Date Picker for Temporary Ban -->
              <div v-if="!isPermanentBan" class="flex flex-col gap-1 mb-3">
                <label class="text-xs font-semibold text-gray-400">{{
                  t('modals.banPlayer.endTime')
                }}</label>
                <DatePicker
                  v-model="banTime"
                  :placeholder="t('modals.banPlayer.datePlaceholder')"
                  class="w-full compact-datepicker"
                  panel-class="extreme-compact-datepicker"
                  fluid
                  :pt="{
                    root: { class: 'w-full' },
                    input: {
                      class: 'g-input w-full'
                    },
                    pcPanel: {
                      root: { class: '!w-full' }
                    }
                  }"
                  show-time
                  hour-format="24"
                  append-to="body"
                />
              </div>

              <!-- Reason -->
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold text-gray-400">
                  {{ t('modals.banPlayer.reason') }} <span class="text-red-500">*</span>
                </label>
                <textarea
                  v-model="banReasonInput"
                  :placeholder="t('modals.banPlayer.reasonPlaceholder')"
                  rows="2"
                  class="g-input !h-auto resize-none text-sm"
                ></textarea>
              </div>
            </template>
            <div v-else class="text-center py-4 text-gray-300">
              {{ t('modals.banPlayer.confirmUnban', { player: playerData?.nickname }) }}
            </div>
          </div>

          <div class="g-modal-footer">
            <button class="g-btn" @click="handleCancel">
              {{ t('modals.banPlayer.cancel') }}
            </button>
            <button
              class="g-btn primary flex-1"
              :class="{ '!bg-red-500 hover:!bg-red-600': actionType === 'ban' }"
              :disabled="isBanDisabled"
              @click="actionType === 'ban' ? banUser() : unbanUser()"
            >
              <i class="fas" :class="actionType === 'ban' ? 'fa-gavel' : 'fa-unlock'"></i>
              {{ actionType === 'ban' ? t('modals.banPlayer.ban') : t('modals.banPlayer.unban') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Compact DatePicker */
.ban-modal-compact {
  max-width: 440px !important;
  gap: 0.75rem !important;
  padding: 1rem !important;
  overflow: visible !important; /* Critical to show the date picker panel if it's not teleported */
}

:deep(.compact-datepicker .g-input) {
  padding: 0.35rem 0.6rem !important;
  font-size: 0.75rem !important;
  border-radius: 10px !important;
}

.g-card-header {
  padding-bottom: 0.5rem !important;
}

.g-icon-box {
  width: 32px !important;
  height: 32px !important;
  font-size: 0.9rem !important;
}

/* Reduce label size further */
label {
  font-size: 10px !important;
  margin-bottom: 2px !important;
}
</style>
