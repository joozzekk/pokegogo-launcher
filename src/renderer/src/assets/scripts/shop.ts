const hideShopLoading = (shopLoading: HTMLElement | null): void => {
  if (shopLoading) {
    shopLoading.style.display = 'none'
  }
}

export function initShop(): void {
  const shopFrame = document.getElementById('shopFrame') as HTMLIFrameElement | null
  const shopError = document.querySelector<HTMLElement>('.shop-error')
  const shopLoading = document.querySelector<HTMLElement>('.shop-loading')

  const showError = (): void => {
    if (shopError) {
      shopError.style.display = 'block'
    }
  }

  if (shopFrame) {
    shopFrame.addEventListener('load', () => hideShopLoading(shopLoading))

    shopFrame.addEventListener('error', () => {
      hideShopLoading(shopLoading)
      showError()
    })
  }
}

export function loadShop(): void {
  const shopFrame = document.getElementById('shopFrame') as HTMLIFrameElement | null
  const shopLoading = document.querySelector<HTMLElement>('.shop-loading')
  if (shopFrame && !shopFrame.hasAttribute('data-loaded')) {
    shopFrame.setAttribute('data-loaded', 'true')

    setTimeout(() => {
      if (!shopFrame.contentWindow || !shopFrame.contentWindow.length) {
        hideShopLoading(shopLoading)
      }
    }, 5000)
  }
}
