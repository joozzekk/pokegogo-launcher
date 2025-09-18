export const createParticles = (element: HTMLElement): void => {
  const rect = element.getBoundingClientRect()
  const particles = 20

  for (let i = 0; i < particles; i++) {
    const particle = document.createElement('div')
    particle.style.position = 'fixed'
    particle.style.width = '4px'
    particle.style.height = '4px'
    particle.style.background = 'var(--primary)'
    particle.style.borderRadius = '50%'
    particle.style.pointerEvents = 'none'
    particle.style.zIndex = '9999'
    particle.style.left = rect.left + rect.width / 2 + 'px'
    particle.style.top = rect.top + rect.height / 2 + 'px'

    document.body.appendChild(particle)

    const angle = (Math.PI * 2 * i) / particles
    const velocity = 2 + Math.random() * 4

    let opacity = 1
    let scale = 1
    let x = 0
    let y = 0

    const animate = (): void => {
      x += Math.cos(angle) * velocity
      y += Math.sin(angle) * velocity
      opacity -= 0.01
      scale += 0.02

      particle.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
      particle.style.opacity = `${opacity}`

      if (opacity > 0) {
        requestAnimationFrame(animate)
      } else {
        particle.remove()
      }
    }

    requestAnimationFrame(animate)
  }
}

export const showToast = (message: string, type = 'success'): void => {
  const toastContainer = document.getElementById('toastContainer')
  if (toastContainer === null) return

  const toast = document.createElement('div')
  toast.className = `toast ${type}`

  const icon = type === 'success' ? 'check-circle' : 'exclamation-circle'
  toast.innerHTML = `
        <i class="fas fa-${icon}" style="color: ${type === 'success' ? 'var(--primary)' : '#ef4444'}"></i>
        <span>${message}</span>
    `

  toastContainer.appendChild(toast)

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease'
    setTimeout(() => {
      toast.remove()
    }, 300)
  }, 3000)
}

export const calculateValueFromPercentage = (value: number, sliderWidth: number): number => {
  const min = 6
  const max = 16
  return Math.fround(((value - min) / (max - min)) * sliderWidth)
}
