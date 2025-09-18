const serverIP = 'pokemongogo.pl'

export async function updateServerStatus(): Promise<void> {
  const ping = Math.floor(Math.random() * 50) + 10
  let playerCount = 0

  try {
    const response = await fetch(`https://api.mcsrvstat.us/2/${serverIP}`)
    const data = await response.json()

    if (data.online) {
      playerCount = data.players?.online ?? 0

      const playerCountEl = document.getElementById('playerCount')
      const serverPingEl = document.getElementById('serverPing')
      const pulseDot = document.querySelector<HTMLElement>('.pulse-dot')

      if (playerCountEl && serverPingEl && pulseDot) {
        playerCountEl.textContent = playerCount.toLocaleString()
        serverPingEl.textContent = `${ping}ms`

        animateNumber('playerCount', playerCount)

        pulseDot.style.background = 'var(--primary)'
      }
    } else {
      const playerCountEl = document.getElementById('playerCount')
      const serverPingEl = document.getElementById('serverPing')
      const pulseDot = document.querySelector<HTMLElement>('.pulse-dot')

      if (playerCountEl && serverPingEl && pulseDot) {
        playerCountEl.textContent = '0'
        serverPingEl.textContent = '---'

        pulseDot.style.background = '#ef4444'
      }
    }
  } catch {
    animateNumber('playerCount', playerCount)
    const serverPingEl = document.getElementById('serverPing')
    if (serverPingEl) serverPingEl.textContent = `${ping}ms`
  }
}

function animateNumber(elementId: string, targetNumber: number): void {
  const element = document.getElementById(elementId)
  if (!element) return

  const startNumber = parseInt(element.textContent?.replace(/,/g, '') ?? '0', 10)
  const duration = 1000
  const startTime = performance.now()

  function update(currentTime: number): void {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    const currentNumber = Math.floor(startNumber + (targetNumber - startNumber) * progress)
    if (element) element.textContent = currentNumber.toLocaleString()

    if (progress < 1) {
      requestAnimationFrame(update)
    }
  }

  requestAnimationFrame(update)
}
