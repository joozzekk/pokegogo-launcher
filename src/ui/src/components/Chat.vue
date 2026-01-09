// ChatWindow.vue

<script lang="ts" setup>
import { readMessages, sendMessage } from '@ui/api/endpoints'
import useUserStore from '@ui/stores/user-store'
import { nextTick, ref, watch, computed } from 'vue'
import { useChatsStore } from '@ui/stores/chats-store'
import type { IMessage } from '@ui/types/app'

const userStore = useUserStore()
const chatsStore = useChatsStore()
const message = ref<string[]>([])

const chatRefs = ref<Record<string, HTMLDivElement | null>>({})

const setChatRef = (uuid: string, el: HTMLDivElement | null): void => {
  chatRefs.value[uuid] = el
}

const scrollToBottom = (uuid: string): void => {
  const container = chatRefs.value[uuid]
  if (!container) return

  requestAnimationFrame(() => {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    })
  })
}

const handleSendMessage = async (i: number, uuid: string): Promise<void> => {
  if (!message.value || !chatsStore.friends) return

  const content = message.value[i]
  message.value[i] = ''

  await sendMessage(uuid, content)

  const chat = chatsStore.activeChats.find((c) => c.uuid === uuid)
  chat?.messages.push({
    sender: userStore.user!.uuid,
    receiver: uuid,
    content,
    read: true
  })

  await nextTick()
  scrollToBottom(uuid)
}

const unreadMessages = (uuid: string): IMessage[] => {
  const activeChat = chatsStore.activeChats.find((chat) => chat.uuid === uuid)
  return activeChat?.messages.filter((msg) => !msg.read) ?? []
}

const isLastInSequence = (uuid: string, index: number): boolean => {
  const activeChat = chatsStore.activeChats.find((chat) => chat.uuid === uuid)
  if (!activeChat) return true

  const currentMsg = activeChat.messages[index]
  const nextMsg = activeChat.messages[index + 1]

  if (!nextMsg) return true
  return currentMsg.sender !== nextMsg.sender
}

const handleChatToggle = async (uuid: string): Promise<void> => {
  const activeChat = chatsStore.activeChats.find((chat) => chat.uuid === uuid)
  if (!activeChat) return

  activeChat.chatToggled = !activeChat.chatToggled

  if (activeChat.chatToggled) {
    await nextTick()
    scrollToBottom(uuid)
    readMessages(uuid)

    activeChat.messages.forEach((msg) => {
      msg.read = true
    })
  }
}

watch(
  () =>
    chatsStore.activeChats
      .filter((c) => c.chatToggled)
      .map((c) => ({ uuid: c.uuid, len: c.messages.length })),
  async (openedStates, prevStates) => {
    for (const state of openedStates) {
      const prev = prevStates?.find((p) => p.uuid === state.uuid)
      const increased = !prev || state.len > prev.len

      if (increased) {
        await nextTick()
        scrollToBottom(state.uuid)
        await readMessages(state.uuid)
      }
    }
  },
  { deep: true }
)

/**
 * Jedna wspólna taśma slotów od prawej do lewej.
 * - chatToggled === true → szeroki slot (CHAT_SLOT_REM)
 * - chatToggled === false → wąski slot (AVATAR_SLOT_REM)
 * Każdy element ma offset będący sumą slotów wszystkich elementów znajdujących się po prawej w kolejności.
 */

// Parametry layoutu
const BASE_RIGHT_REM = 1 // bazowy margines od prawej
const CHAT_SLOT_REM = 18.5 // szerokość slotu dla otwartego czatu
const AVATAR_SLOT_REM = 3.5 // szerokość slotu dla zamkniętej główki
const GAP_PER_ITEM_REM = 0 // dodatkowa szczelina między slotami (zwykle 0, bo sloty zawierają margines)

// Prekomputacja slotów zgodnie z kolejnością activeChats
type Slot = { uuid: string; sizeRem: number }
const slots = computed<Slot[]>(() =>
  chatsStore.activeChats.map((c) => ({
    uuid: c.uuid,
    sizeRem: c.chatToggled ? CHAT_SLOT_REM : AVATAR_SLOT_REM
  }))
)

/**
 * Zwraca offset right dla elementu o danym uuid, jako suma rozmiarów
 * slotów wszystkich elementów znajdujących się po prawej stronie od niego,
 * plus bazowy margines.
 *
 * Przykład: [A(avatar), B(chat), C(avatar)] — indeksy 0..2
 * right(A) = BASE + size(B) + size(C)
 * right(B) = BASE + size(C)
 * right(C) = BASE
 */
const computeRightOffset = (uuid: string): string => {
  const arr = slots.value
  const idx = arr.findIndex((s) => s.uuid === uuid)
  if (idx === -1) return `${BASE_RIGHT_REM}rem`

  let sum = BASE_RIGHT_REM
  for (let i = idx + 1; i < arr.length; i++) {
    sum += arr[i].sizeRem + GAP_PER_ITEM_REM
  }
  return `${sum}rem`
}
</script>

<template>
  <div class="flex">
    <div v-for="(chat, i) in chatsStore.activeChats" :key="chat.uuid">
      <Transition name="fade">
        <div
          v-if="!chat.chatToggled"
          class="absolute z-50 bottom-2 w-12 h-12 rounded-full"
          :style="{ right: computeRightOffset(chat.uuid) }"
        >
          <div
            class="relative hover:opacity-80 cursor-pointer"
            @click="handleChatToggle(chat.uuid)"
          >
            <img v-if="chat.headUrl" :src="chat.headUrl" alt="Avatar" class="rounded-full" />
            <div
              v-if="unreadMessages(chat.uuid).length"
              class="w-4 h-4 rounded-full absolute top-0 right-0 z-10 bg-[var(--primary)] text-white flex items-center justify-center"
            >
              {{ unreadMessages(chat.uuid).length }}
            </div>
          </div>
        </div>

        <template v-else>
          <div class="chat-container z-54" :style="{ right: computeRightOffset(chat.uuid) }">
            <div class="flex items-center gap-2 px-4 py-3 bg-[var(--bg-dark)]">
              <div class="relative">
                <img :src="chat.headUrl" class="w-6 h-6 rounded-full" alt="Avatar" />
                <div
                  class="absolute -bottom-2 -right-2 z-10 w-2 h-2 rounded-full"
                  :style="{ background: !chat?.isOnline ? '#ff4757' : '#00ff88' }"
                ></div>
              </div>

              <span class="ml-1 font-semibold">{{ chat.nickname }}</span>

              <button class="nav-icon ml-auto" @click="handleChatToggle(chat.uuid)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div
              :ref="(el) => setChatRef(chat.uuid, el as HTMLDivElement | null)"
              class="flex flex-col gap-[0.25rem] p-2 overflow-y-auto h-[16rem]"
            >
              <div v-if="!chat.messages?.length">
                <div class="text-center text-xs text-[var(--text-secondary)] my-2 mt-auto">
                  Rozmowa rozpoczęta
                </div>
              </div>

              <div
                v-for="(msg, index) in chat.messages"
                v-else
                :key="index"
                class="flex w-full gap-[0.25rem]"
                :class="{
                  'justify-start': msg.sender === userStore.user?.uuid,
                  'flex-row-reverse justify-start': msg.sender === chat.uuid
                }"
              >
                <div class="w-6 h-6 shrink-0 my-auto flex items-center justify-center">
                  <template v-if="isLastInSequence(chat.uuid, index)">
                    <img
                      v-if="msg.sender === userStore.user?.uuid"
                      :src="userStore.user?.headUrl"
                      class="w-6 h-6 rounded-full"
                      alt="Avatar"
                    />
                    <img v-else :src="chat.headUrl" class="w-6 h-6 rounded-full" alt="Avatar" />
                  </template>
                </div>

                <p
                  class="bg-[var(--bg-card)] p-2 max-w-[70%] overflow-hidden break-all shadow-sm rounded-t-lg"
                  :class="{
                    'rounded-bl-lg': msg.sender === chat.uuid,
                    'rounded-br-lg': msg.sender === userStore.user?.uuid,
                    'bg-[var(--primary)]/15': msg.sender === userStore.user?.uuid,
                    'rounded-t-lg': isLastInSequence(chat.uuid, index),
                    'rounded-b-lg': !isLastInSequence(chat.uuid, index)
                  }"
                >
                  {{ msg.content }}
                </p>
              </div>
            </div>

            <div class="flex absolute bottom-0 w-full items-center gap-2 pb-2 px-2">
              <input
                v-model="message[i]"
                type="text"
                class="w-full rounded-full px-4 py-2 text-xs border border-[var(--bg-card)] outline-none focus:outline-none focus:border-[var(--primary)] focus:ring-[var(--primary)]"
                placeholder="Wpisz wiadomość..."
                @keyup.enter="handleSendMessage(i, chat.uuid)"
              />
              <button class="nav-icon" @click="handleSendMessage(i, chat.uuid)">
                <i class="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </template>
      </Transition>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.1);
  transform-origin: bottom right;
}

.chat-container {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: 18rem;
  height: 22rem;
  background-color: var(--bg-card);
  backdrop-filter: blur(2rem);
  border-radius: 1rem;
  overflow: hidden;
}
</style>
