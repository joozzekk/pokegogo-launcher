<script lang="ts" setup>
import { getFriend, getMessages, readMessages, sendMessage } from '@ui/api/endpoints'
import { IUser } from '@ui/env'
import { LOGGER } from '@ui/services/logger-service'
import useUserStore from '@ui/stores/user-store'
import { IMessage } from '@ui/types/app'
import { extractHead } from '@ui/utils'
import { computed, nextTick, ref, watch } from 'vue'

const apiURL = import.meta.env.RENDERER_VITE_API_URL

const chatToggled = ref<boolean>(false)
const userStore = useUserStore()
const friend = ref<IUser | null>(null)
const messages = ref<IMessage[]>([])
const message = ref<string>('')
const messagesContainer = ref<HTMLDivElement | null>(null)

const handleSendMessage = async (): Promise<void> => {
  if (!message.value) return

  await sendMessage(friend.value!.uuid, message.value)

  messages.value.push({
    sender: userStore.user!.uuid,
    receiver: friend.value!.uuid,
    content: message.value
  })

  await nextTick()

  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: 'smooth'
    })
  }

  message.value = ''
}

const fallbackHeadUrl = (playerName: string): string =>
  `https://mineskin.eu/helm/${playerName}/100.png`

async function loadCustomOrFallbackHead(playerName: string): Promise<void> {
  const customSkinSource = `${apiURL}/skins/image/${playerName}`

  try {
    const base64Head = await extractHead(customSkinSource, 100)
    friend.value!.headUrl = base64Head
  } catch (error) {
    LOGGER.err(
      'Błąd cięcia/ładowania skina z API. Używam fallbacku Minotar.',
      (error as Error)?.message
    )

    friend.value!.headUrl = fallbackHeadUrl(playerName)
  }
}

const unreadMessages = computed(() => {
  return messages.value.filter((msg) => !msg.read && msg.sender === friend.value?.uuid)
})

watch(
  () => unreadMessages.value,
  () => {
    if (unreadMessages.value.length) {
      window.electron.ipcRenderer.invoke('notification:show', {
        icon: friend.value?.headUrl,
        title: 'Nowe wiadomości',
        body:
          'Otrzymano nowe wiadomości (' +
          unreadMessages.value.length +
          ') od ' +
          friend.value?.nickname
      })
    }
  }
)

const isLastInSequence = (index: number): boolean => {
  const currentMsg = messages.value[index]
  const nextMsg = messages.value[index + 1]

  if (!nextMsg) return true
  return currentMsg.sender !== nextMsg.sender
}

watch(
  () => userStore.user,
  async () => {
    if (userStore.user?.friends.length) {
      friend.value = await getFriend(userStore.user.friends[0])
    }
  },
  { immediate: true }
)

watch(
  () => friend.value,
  async () => {
    if (friend.value) {
      await loadCustomOrFallbackHead(friend.value.nickname)
      messages.value = await getMessages(friend.value.uuid)
    }
  },
  { immediate: true }
)

const friendHeadUrl = computed(() => {
  if (!friend.value) return ''

  return friend.value.headUrl
})

const handleReadMessages = async (): Promise<void> => {
  await readMessages(friend.value!.uuid)

  messages.value = await getMessages(friend.value!.uuid)
}

watch(chatToggled, async (newValue) => {
  if (newValue) {
    await nextTick()

    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }

    handleReadMessages()
  }
})
</script>

<template>
  <div
    v-if="chatToggled"
    class="fixed z-50 w-full h-full top-0 left-0"
    @click="chatToggled = false"
  ></div>

  <Transition name="fade">
    <div v-if="!chatToggled" class="fixed z-50 bottom-2 right-2 w-12 h-12 rounded-full">
      <div
        v-if="friend"
        class="relative hover:opacity-80 cursor-pointer"
        @click="chatToggled = true"
      >
        <img v-if="friendHeadUrl" :src="friendHeadUrl" alt="Avatar" class="rounded-full" />
        <div
          v-if="unreadMessages.length"
          class="w-4 h-4 rounded-full absolute top-0 right-0 z-10 bg-[var(--primary)] text-white flex items-center justify-center"
        >
          {{ unreadMessages.length }}
        </div>
      </div>
    </div>
    <template v-else>
      <div class="chat-container z-54">
        <div class="flex items-center gap-2 px-4 py-3 bg-[var(--bg-dark)]">
          <img :src="friend?.headUrl" class="w-6 h-6 rounded-full" alt="Avatar" />
          <span>{{ friend?.nickname }}</span>
        </div>

        <div
          ref="messagesContainer"
          class="flex flex-col gap-[0.25rem] p-2 overflow-y-auto h-[16rem]"
        >
          <div
            v-for="(msg, index) in messages"
            :key="index"
            class="flex w-full gap-[0.25rem]"
            :class="{
              'justify-start': msg.sender === userStore.user?.uuid,
              'flex-row-reverse justify-start': msg.sender === friend?.uuid
            }"
          >
            <div class="w-6 h-6 shrink-0 my-auto flex items-center justify-center">
              <template v-if="isLastInSequence(index)">
                <img
                  v-if="msg.sender === userStore.user?.uuid"
                  :src="userStore.user?.headUrl"
                  class="w-6 h-6 rounded-full"
                  alt="Avatar"
                />
                <img
                  v-else-if="friend && msg.sender === friend.uuid"
                  :src="friendHeadUrl"
                  class="w-6 h-6 rounded-full"
                  alt="Avatar"
                />
              </template>
            </div>

            <p
              class="bg-[var(--bg-card)] p-2 max-w-[70%] overflow-hidden break-all shadow-sm rounded-t-lg"
              :class="{
                'rounded-bl-lg': msg.sender === friend?.uuid,
                'rounded-br-lg': msg.sender === userStore.user?.uuid,
                'bg-[var(--primary)]/15': msg.sender === userStore.user?.uuid,
                'rounded-t-lg': isLastInSequence(index),
                'rounded-b-lg': !isLastInSequence(index)
              }"
            >
              {{ msg.content }}
            </p>
          </div>
        </div>

        <div class="flex absolute bottom-0 w-full items-center gap-2 pb-2 px-2">
          <input
            v-model="message"
            type="text"
            class="w-full rounded-full px-4 py-2 text-xs border border-[var(--bg-card)] outline-none focus:outline-none focus:border-[var(--primary)] focus:ring-[var(--primary)]"
            placeholder="Wpisz wiadomość..."
            @keyup.enter="handleSendMessage"
          />
          <button class="nav-icon" @click="handleSendMessage">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </template>
  </Transition>
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
  backdrop-filter: blur(1rem);
  border-radius: 1rem;
  overflow: hidden;
}
</style>
