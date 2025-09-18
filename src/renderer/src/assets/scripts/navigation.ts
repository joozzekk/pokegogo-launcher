import { loadShop } from './shop'

export function initNavigation(): void {
  const navItems = document.querySelectorAll<Element>('.nav-item')
  const pages = document.querySelectorAll<Element>('.page')

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault()

      navItems.forEach((nav) => nav.classList.remove('active'))
      pages.forEach((page) => page.classList.remove('active'))

      item.classList.add('active')

      const pageName = item.getAttribute('data-page')
      if (!pageName) return

      const targetPage = document.getElementById(`${pageName}Page`)
      if (targetPage) {
        targetPage.classList.add('active')

        if (pageName === 'shop') {
          loadShop()
        }
      }
    })
  })
}
