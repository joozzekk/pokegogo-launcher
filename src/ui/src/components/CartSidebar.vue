<script setup lang="ts">
import useCartStore from '@ui/stores/cart-store'
import useUserStore from '@ui/stores/user-store'
import { initiatePayment } from '@ui/api/endpoints'
import { ref } from 'vue'
import type { CartItem } from '@ui/stores/cart-store'

const cartStore = useCartStore()
const userStore = useUserStore()
const url = import.meta.env.RENDERER_VITE_API_URL
const isLoading = ref(false)
const errorMsg = ref('')

const fmt = (n: number): string => `${new Intl.NumberFormat('pl-PL').format(n)} PLN`

const calcPrice = (price: number | string, promotion?: number | string): number => {
  const p = Number(price)
  const prom = Number(promotion || 0)
  if (!prom || prom <= 0 || prom >= p) return p
  return p - prom
}

const changeQuantity = (uuid: number, currentQuantity: number): void => {
  const q = Number(currentQuantity)
  cartStore.updateQuantity(uuid, q)
}

const checkout = async (): Promise<void> => {
  const currentNick = userStore.user?.nickname
  if (!currentNick || currentNick.trim() === '') {
    errorMsg.value = 'Błąd: Nie można pobrać nicku zalogowanego konta!'
    return
  }

  errorMsg.value = ''
  isLoading.value = true

  try {
    const itemsData = cartStore.cart.map((c: CartItem) => ({
      item: c.item.name,
      price:
        calcPrice(c.item.price, c.item.promotion) * (c.item.isCountable ? Number(c.quantity) : 1),
      count: c.item.isCountable ? Number(c.quantity) : 1,
      serviceName: c.item.serviceName || c.item.name.toLowerCase().replace(/\s+/g, '_')
    }))

    const isDev = import.meta.env.DEV
    const response = await initiatePayment({
      nick: currentNick,
      items: itemsData,
      totalAmount: Number(cartStore.cartTotal),
      hostname: isDev
        ? 'http://localhost:5173'
        : import.meta.env.RENDERER_VITE_WEBPAGE || 'https://pokemongogo.pl',
      cashbillEnv: import.meta.env.RENDERER_VITE_CASHBILL_ENV
    })

    if (response && response.redirectUrl) {
      // Open in external browser
      window.electron.shell.openExternal(response.redirectUrl)
    } else {
      errorMsg.value = response.error || 'Błąd bramki płatności.'
    }
  } catch (err: unknown) {
    const errorObj = err as {
      response?: { data?: { message?: string; error?: string } }
      message?: string
    }
    const backendError =
      errorObj.response?.data?.message || errorObj.response?.data?.error || errorObj.message
    errorMsg.value = `Błąd: ${backendError}`
    console.error('Checkout error:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="cartStore.isCartDrawerOpen"
        class="cart-backdrop"
        @click="cartStore.isCartDrawerOpen = false"
      ></div>
    </Transition>

    <Transition name="slide">
      <div v-if="cartStore.isCartDrawerOpen" class="cart-drawer">
        <div class="cart-header">
          <h2 class="cart-title">
            <i class="fas fa-shopping-cart"></i>
            Twój Koszyk
          </h2>
          <button class="close-btn" @click="cartStore.isCartDrawerOpen = false">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="cart-content custom-scrollbar">
          <div v-if="cartStore.cart.length === 0" class="empty-cart">
            <div class="empty-icon"><i class="fas fa-shopping-basket"></i></div>
            <p>Twój koszyk jest pusty</p>
            <button class="return-btn" @click="cartStore.isCartDrawerOpen = false">
              Wróć do sklepu
            </button>
          </div>

          <div v-else class="cart-items">
            <div v-for="cItem in cartStore.cart" :key="cItem.item.uuid" class="cart-item">
              <button class="remove-item" @click="cartStore.removeFromCart(cItem.item.uuid)">
                <i class="fas fa-times"></i>
              </button>
              <div class="item-img-wrapper">
                <img
                  :src="
                    cItem.item.src?.includes('http')
                      ? cItem.item.src
                      : `${url}/items/image/${cItem.item.uuid}`
                  "
                  class="item-img"
                />
              </div>
              <div class="item-details">
                <div class="item-info">
                  <h3 class="item-name">{{ cItem.item.name }}</h3>
                  <div class="item-price-unit">
                    {{ fmt(calcPrice(cItem.item.price, cItem.item.promotion)) }} /
                    {{ cItem.item.count && cItem.item.count > 1 ? 'pakiet' : 'szt.' }}
                  </div>
                  <div
                    v-if="cItem.item.count && cItem.item.count > 1"
                    class="text-[0.65rem] text-gray-400 mt-1 uppercase tracking-wide font-bold"
                  >
                    Otrzymasz:
                    <span class="text-[#ff007c]">{{ cItem.quantity * cItem.item.count }}</span> szt.
                    ({{ cItem.quantity }} x {{ cItem.item.count }})
                  </div>
                </div>

                <div class="item-actions">
                  <div
                    v-if="
                      cItem.item.isCountable &&
                      !(
                        cItem.item.category === 'Rangi' ||
                        cItem.item.name.toLowerCase().includes('ranga')
                      )
                    "
                    class="quantity-controls"
                  >
                    <button
                      class="q-btn"
                      @click="changeQuantity(cItem.item.uuid, cItem.quantity - 1)"
                    >
                      -
                    </button>
                    <span class="q-val">{{ cItem.quantity }}</span>
                    <button
                      class="q-btn"
                      @click="changeQuantity(cItem.item.uuid, cItem.quantity + 1)"
                    >
                      +
                    </button>
                  </div>
                  <div v-else class="item-tag">1 szt.</div>

                  <span class="item-total-price">
                    {{
                      fmt(
                        calcPrice(cItem.item.price, cItem.item.promotion) *
                          (cItem.item.isCountable ? cItem.quantity : 1)
                      )
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="cartStore.cart.length > 0" class="cart-footer">
          <p v-if="errorMsg" class="error-text" style="margin-bottom: 1rem">{{ errorMsg }}</p>

          <div class="price-summary">
            <div v-if="cartStore.cartTotalBase > cartStore.cartTotal" class="base-total">
              Wartość: <span>{{ fmt(cartStore.cartTotalBase) }}</span>
            </div>
            <div class="final-total">
              RAZEM: <span>{{ fmt(cartStore.cartTotal) }}</span>
            </div>
          </div>

          <button
            class="checkout-btn"
            :disabled="isLoading || !userStore.user?.nickname || cartStore.cart.length === 0"
            @click="checkout"
          >
            <i v-if="isLoading" class="fas fa-spinner fa-spin"></i>
            {{ isLoading ? 'Przetwarzanie...' : 'Przejdź do kasy' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cart-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 1000;
}

.cart-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  background: #0d0d12;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
  z-index: 1001;
  display: flex;
  flex-direction: column;
}

/* Header */
.cart-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cart-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.cart-title i {
  color: #ff007c;
}

.close-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #a0a0a0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #ff007c;
  color: white;
  border-color: #ff007c;
}

/* Content */
.cart-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.empty-cart {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #606060;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.2;
}

.return-btn {
  margin-top: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}

.return-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #ff007c;
}

/* Items */
.cart-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cart-item {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  transition: all 0.3s;
}

.cart-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 0, 124, 0.3);
}

.remove-item {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4757;
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s;
  z-index: 2;
}

.cart-item:hover .remove-item {
  opacity: 1;
  transform: scale(1);
}

.item-img-wrapper {
  width: 60px;
  height: 60px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: white;
  margin: 0;
  line-height: 1.2;
}

.item-price-unit {
  font-size: 0.75rem;
  color: #606060;
  margin-top: 0.2rem;
}

.item-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.quantity-controls {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 2px;
}

.q-btn {
  background: transparent;
  border: none;
  color: #a0a0a0;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.q-btn:hover {
  color: white;
}

.q-val {
  font-size: 0.85rem;
  font-weight: 700;
  color: white;
  min-width: 20px;
  text-align: center;
}

.item-tag {
  font-size: 0.7rem;
  font-weight: 800;
  color: #ff007c;
  background: rgba(255, 0, 124, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.item-total-price {
  font-size: 0.95rem;
  font-weight: 800;
  color: #ff007c;
}

/* Footer */
.cart-footer {
  padding: 1.5rem;
  background: #0a0a0e;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.nick-input-group label {
  display: block;
  font-size: 0.7rem;
  font-weight: 900;
  color: #606060;
  margin-bottom: 0.5rem;
  letter-spacing: 1px;
}

.input-wrapper {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  transition: all 0.3s;
}

.input-wrapper:focus-within {
  border-color: #ff007c;
  background: rgba(255, 0, 124, 0.05);
}

.input-wrapper i {
  color: #404040;
  margin-right: 0.8rem;
}

.input-wrapper input {
  background: transparent;
  border: none;
  height: 48px;
  width: 100%;
  color: white;
  font-weight: 600;
  outline: none;
}

.error-text {
  color: #ff4757;
  font-size: 0.75rem;
  font-weight: 700;
  margin: 0.5rem 0 0;
}

.price-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
}

.base-total {
  font-size: 0.85rem;
  color: #606060;
}

.base-total span {
  text-decoration: line-through;
}

.final-total {
  font-size: 1.1rem;
  font-weight: 800;
  color: white;
}

.final-total span {
  color: #ff007c;
  font-size: 1.5rem;
  margin-left: 0.5rem;
}

.checkout-btn {
  background: #ff007c;
  color: white;
  border: none;
  height: 54px;
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  transition: all 0.3s;
}

.checkout-btn:hover:not(:disabled) {
  background: #ff3396;
  box-shadow: 0 0 20px rgba(255, 0, 124, 0.4);
  transform: translateY(-2px);
}

.checkout-btn:disabled {
  background: #202025;
  color: #404045;
  cursor: not-allowed;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
</style>
