const shopLoading = document.querySelector<HTMLElement>('.shop-loading')

const hideShopLoading = (): void => {
  if (shopLoading) {
    shopLoading.style.display = 'none'
  }
}

export function initShop(): void {
  const shopFrame = document.getElementById('shopFrame') as HTMLIFrameElement | null
  const shopError = document.querySelector<HTMLElement>('.shop-error')

  const showError = (): void => {
    if (shopError) {
      shopError.style.display = 'block'
    }
  }

  if (shopFrame) {
    shopFrame.addEventListener('load', () => hideShopLoading())

    shopFrame.addEventListener('error', () => {
      hideShopLoading()
      showError()
    })
  }
}

export function loadShop(): void {
  const shopFrame = document.getElementById('shopFrame') as HTMLIFrameElement | null
  if (shopFrame && !shopFrame.hasAttribute('data-loaded')) {
    shopFrame.setAttribute('data-loaded', 'true')

    setTimeout(() => {
      if (!shopFrame.contentWindow || !shopFrame.contentWindow.length) {
        hideShopLoading()
      }
    }, 5000)
  }
}
