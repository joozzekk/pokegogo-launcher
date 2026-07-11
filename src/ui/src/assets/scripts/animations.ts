import useGeneralStore from '@ui/stores/general-store'
import { themes } from '../theme/themes'
import { watch } from 'vue'

export function initAnimations(): void {
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
  const generalStore = useGeneralStore()

  const particlesContainer = document.querySelector<HTMLElement>('.particles')
  if (!particlesContainer) return

  for (let i = 0; i < 50; i += 1) {
    const particle = document.createElement('div')
    particle.textContent =
      generalStore.settings.customTheme?.firstFloating ??
      themes.find((theme) => generalStore.getTheme() === theme.name)?.firstFloating ??
      '❄️'
    particle.style.position = 'absolute'
    particle.style.color = 'white'
    particle.style.fontSize = `${10 + Math.random() * 15}px`
    particle.style.left = `${Math.random() * 100}%`
    particle.style.top = `${Math.random() * -100}%`
    particle.style.animation = `snowfall ${8 + Math.random() * 8}s linear infinite`
    particle.style.animationDelay = `${Math.random() * 10}s`
    particle.style.textShadow = '0 0 10px white'
    particle.style.opacity = `${0.7 + Math.random() * 0.3}`

    particlesContainer.appendChild(particle)
  }

  document.addEventListener('visibilitychange', () => {
    const particles = document.querySelectorAll<HTMLElement>('.particles div')

    if (document.hidden) {
      particles.forEach((p) => (p.style.animationPlayState = 'paused'))
    } else {
      particles.forEach((p) => (p.style.animationPlayState = 'running'))
    }
  })

  window.electron.ipcRenderer.on('window-focus-changed', (_, isFocused) => {
    const particles = document.querySelectorAll<HTMLElement>('.particles div')
    particles.forEach((p) => {
      p.style.animationPlayState = isFocused ? 'running' : 'paused'
    })
  })

  watch(
    () => generalStore.settings.customTheme,
    () => {
      particlesContainer.innerHTML = ''
      createBackgroundParticles()
    }
  )

  watch(
    () => generalStore.getTheme(),
    () => {
      particlesContainer.innerHTML = ''
      createBackgroundParticles()
    }
  )
}
