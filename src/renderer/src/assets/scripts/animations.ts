import { showToast } from '@renderer/utils'

export function initAnimations(): void {
  document.querySelectorAll<HTMLElement>('button, .nav-item, .news-item').forEach((element) => {
    element.addEventListener('mouseenter', () => {
      element.style.transition = 'all 0.3s ease'
    })
  })

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLElement
        target.style.animation = 'slideUp 0.5s ease'
        target.style.opacity = '1'
      }
    })
  })

  document.querySelectorAll<HTMLElement>('.player-profile').forEach((item) => {
    item.style.opacity = '0'
    observer.observe(item)
  })

  document.querySelectorAll<HTMLElement>('.news-item').forEach((item) => {
    item.style.opacity = '0'
    observer.observe(item)
  })

  document.addEventListener('mousemove', (e) => {
    const featured = document.querySelector<HTMLElement>('.featured-image img')
    if (featured) {
      const x = (e.clientX / window.innerWidth - 0.5) * 10
      const y = (e.clientY / window.innerHeight - 0.5) * 10
      featured.style.transform = `scale(1.05) translate(${x}px, ${y}px)`
    }
  })

  createBackgroundParticles()
}

function createBackgroundParticles(): void {
  const particlesContainer = document.querySelector<HTMLElement>('.particles')
  if (!particlesContainer) return

  for (let i = 0; i < 5; i += 1) {
    const particle = document.createElement('div')
    particle.style.position = 'absolute'
    particle.style.width = '2px'
    particle.style.height = '2px'
    particle.style.background = 'var(--primary)'
    particle.style.borderRadius = '50%'
    particle.style.left = `${Math.random() * 100}%`
    particle.style.top = `${Math.random() * 100}%`
    particle.style.animation = `float ${10 + Math.random() * 20}s linear infinite`
    particle.style.animationDelay = `${Math.random() * 10}s`
    particle.style.boxShadow = '0 0 10px var(--primary)'

    particlesContainer.appendChild(particle)
  }
}

document.querySelectorAll<HTMLElement>('.news-item, .news-featured').forEach((item) => {
  item.addEventListener('click', function () {
    const title = this.querySelector<HTMLHeadingElement>('h3, h4')?.textContent || 'Artykuł'
    showToast(`Otwieranie: ${title}`, 'success')

    this.style.transform = 'scale(0.98)'
    setTimeout(() => {
      this.style.transform = ''
    }, 200)
  })
})
