import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export interface Item {
  uuid: number
  name: string
  price: number
  promotion?: number
  isCountable?: boolean
  category?: string
  src?: string
  serviceName?: string
  count?: number
  desc?: string
}

export interface CartItem {
  item: Item
  quantity: number
}

const useCartStore = defineStore('cart', () => {
  const cart = ref<CartItem[]>([])
  const cartNick = ref<string>(localStorage.getItem('pokemongogo_nick') || '')
  const isCartDrawerOpen = ref<boolean>(false)

  // Initialize from Main Process File
  const initCart = async (): Promise<void> => {
    try {
      const savedCart = await window.electron.ipcRenderer.invoke('cart:load')
      if (savedCart && Array.isArray(savedCart)) {
        cart.value = savedCart
      }
    } catch (e) {
      console.error('Failed to load cart from main process', e)
      // Fallback to localStorage just in case of migration
      const localCart = localStorage.getItem('pokemongogo_cart')
      if (localCart) {
        try {
          cart.value = JSON.parse(localCart)
        } catch (err) {
          console.error('Local fallback failed', err)
        }
      }
    }
  }

  initCart()

  // Persistence triggers
  const saveCart = async (): Promise<void> => {
    try {
      await window.electron.ipcRenderer.invoke('cart:save', JSON.parse(JSON.stringify(cart.value)))
      // Also keep localStorage as a mirror for extra safety
      localStorage.setItem('pokemongogo_cart', JSON.stringify(cart.value))
    } catch (e) {
      console.error('Failed to save cart via IPC', e)
    }
  }

  // Watchers for persistence
  watch(
    cart,
    () => {
      saveCart()
    },
    { deep: true }
  )

  watch(cartNick, (newVal) => {
    localStorage.setItem('pokemongogo_nick', newVal)
  })

  const addToCart = (item: Item, quantity: number = 1): void => {
    const isRanga = item.category === 'Rangi' || item.name.toLowerCase().includes('ranga')
    const finalQuantity = isRanga ? 1 : quantity

    if (isRanga) {
      // Allow only one rank in cart
      cart.value = cart.value.filter(
        (ci) => !(ci.item.category === 'Rangi' || ci.item.name.toLowerCase().includes('ranga'))
      )
    }

    const existing = cart.value.find((ci) => ci.item.uuid === item.uuid)
    if (existing) {
      if (!isRanga) {
        existing.quantity += finalQuantity
      }
      cart.value = [...cart.value]
    } else {
      cart.value = [...cart.value, { item, quantity: finalQuantity }]
    }
    isCartDrawerOpen.value = true
    saveCart() // Immediate save
  }

  const removeFromCart = (uuid: number): void => {
    cart.value = cart.value.filter((ci) => ci.item.uuid !== uuid)
    saveCart() // Immediate save
  }

  const clearCart = (): void => {
    cart.value = []
    saveCart() // Immediate save
  }

  const updateQuantity = (uuid: number, quantity: number): void => {
    const existing = cart.value.find((ci) => ci.item.uuid === uuid)
    if (existing) {
      const isRanga =
        existing.item.category === 'Rangi' || existing.item.name.toLowerCase().includes('ranga')
      existing.quantity = isRanga ? 1 : Math.max(1, Math.min(64, quantity))
      cart.value = [...cart.value]
      saveCart() // Immediate save
    }
  }

  const cartTotal = computed(() => {
    return cart.value.reduce((total, ci) => {
      const pricePerUnit = Number(ci.item.price) - Number(ci.item.promotion || 0)
      const isCountable = ci.item.isCountable === true
      return total + (isCountable ? pricePerUnit * Number(ci.quantity) : pricePerUnit)
    }, 0)
  })

  const cartTotalBase = computed(() => {
    return cart.value.reduce((total, ci) => {
      const pricePerUnit = Number(ci.item.price)
      const isCountable = ci.item.isCountable === true
      return total + (isCountable ? pricePerUnit * Number(ci.quantity) : pricePerUnit)
    }, 0)
  })

  return {
    cart,
    cartNick,
    isCartDrawerOpen,
    addToCart,
    removeFromCart,
    clearCart,
    updateQuantity,
    cartTotal,
    cartTotalBase
  }
})

export default useCartStore
