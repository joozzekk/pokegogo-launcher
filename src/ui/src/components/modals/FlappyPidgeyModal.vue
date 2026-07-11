<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getFlappyLeaderboard, submitFlappyScore } from '@ui/api/endpoints'
import useUserStore from '@ui/stores/user-store'

const { t } = useI18n()

const modalVisible = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const userStore = useUserStore()

interface LeaderboardEntry {
  user: {
    nickname: string
  }
  score: number
}

const highScore = ref(parseInt(localStorage.getItem('pokegogo_flappy_highscore') || '0'))
const currentScore = ref(0)
const gameState = ref<'START' | 'PLAYING' | 'GAME_OVER'>('START')
const showLeaderboard = ref(false)
const leaderboardData = ref<LeaderboardEntry[]>([])
const isLoadingLeaderboard = ref(false)

// Game Constants
const GRAVITY = 0.1
const JUMP_STRENGTH = -3.8
const PIPE_GAP = 160
const PIPE_WIDTH = 62

// Dynamic Game State
const BASE_PIPE_SPEED = 2.8
const BASE_PIPE_SPAWN_RATE = 80
let currentPipeSpeed = BASE_PIPE_SPEED
let currentPipeSpawnRate = BASE_PIPE_SPAWN_RATE
const BIRD_X = 50
const BIRD_SIZE = 42

// Assets - Using Vite imports for correct URL resolution
import birdUrl from '@ui/assets/img/game/bird.png'
import pipeUrl from '@ui/assets/img/game/pipe.png'
import bgUrl from '@ui/assets/img/game/bg.png'

const birdImg = new Image()
const pipeImg = new Image()
const bgImg = new Image()

const assetsLoaded = ref(false)
const checkAssets = (): void => {
  if (birdImg.complete && pipeImg.complete && bgImg.complete) {
    assetsLoaded.value = true
    console.log('Flappy Pidgey assets ready')
  }
}

birdImg.onload = checkAssets
pipeImg.onload = checkAssets
bgImg.onload = checkAssets

birdImg.src = birdUrl
pipeImg.src = pipeUrl
bgImg.src = bgUrl

// Check immediately if cached
if (birdImg.complete && pipeImg.complete && bgImg.complete) {
  assetsLoaded.value = true
}

let animationId: number | null = null
let frameCount = 0

// Game State Variables
let birdY = 200
let birdVelocity = 0
let pipes: Array<{ x: number; top: number; passed: boolean }> = []
let bgX = 0

const openModal = (): void => {
  console.log('Opening Flappy Pidgey Modal')
  modalVisible.value = true
  resetGame()
  gameState.value = 'START'
  fetchLeaderboard()

  // Restart loop if not running
  if (!animationId) {
    loop()
  }

  // Add listener when modal opens
  window.addEventListener('keydown', handleKeyDown)
}

const closeModal = (): void => {
  modalVisible.value = false
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  // Remove listener when modal closes
  window.removeEventListener('keydown', handleKeyDown)
}

const resetGame = (): void => {
  birdY = 200
  birdVelocity = 0
  pipes = []
  frameCount = 0
  currentScore.value = 0
  bgX = 0
  currentPipeSpeed = BASE_PIPE_SPEED
  currentPipeSpawnRate = BASE_PIPE_SPAWN_RATE
}

const startGame = (): void => {
  if (gameState.value === 'PLAYING') return
  resetGame()
  gameState.value = 'PLAYING'
  // Initial lift on start
  birdVelocity = JUMP_STRENGTH
}

const jump = (): void => {
  if (gameState.value === 'START' || gameState.value === 'GAME_OVER') {
    startGame()
  } else {
    birdVelocity = JUMP_STRENGTH
  }
}

const update = (): void => {
  frameCount++

  // Always scroll background if modal is visible
  bgX -= 0.5
  if (bgX <= -640) bgX = 0

  if (gameState.value !== 'PLAYING') return

  birdVelocity += GRAVITY
  birdY += birdVelocity

  // Handle Pipes
  if (frameCount % currentPipeSpawnRate === 0) {
    const minPipeHeight = 50
    const maxPipeHeight = 350 - PIPE_GAP - minPipeHeight
    const topHeight = Math.floor(Math.random() * maxPipeHeight) + minPipeHeight
    pipes.push({ x: 640, top: topHeight, passed: false })
  }

  pipes.forEach((pipe) => {
    pipe.x -= currentPipeSpeed

    // NEW Circular Collision Detection for Bird (much more forgiving)
    const birdRadius = 14
    const cx = BIRD_X + BIRD_SIZE / 2
    const cy = birdY + BIRD_SIZE / 2

    // Shrink pipe hitboxes by 2/3 in width (keeping 1/3)
    const pipeHitboxWidth = PIPE_WIDTH / 3
    const pipeHitboxX = pipe.x + (PIPE_WIDTH - pipeHitboxWidth) / 2

    const checkCircleRect = (
      cx: number,
      cy: number,
      r: number,
      rx: number,
      ry: number,
      rw: number,
      rh: number
    ): boolean => {
      const closestX = Math.max(rx, Math.min(cx, rx + rw))
      const closestY = Math.max(ry, Math.min(cy, ry + rh))
      const dx = cx - closestX
      const dy = cy - closestY
      return dx * dx + dy * dy < r * r
    }

    if (checkCircleRect(cx, cy, birdRadius, pipeHitboxX, 0, pipeHitboxWidth, pipe.top)) {
      gameOver()
    }

    if (
      checkCircleRect(
        cx,
        cy,
        birdRadius,
        pipeHitboxX,
        pipe.top + PIPE_GAP,
        pipeHitboxWidth,
        400 - (pipe.top + PIPE_GAP)
      )
    ) {
      gameOver()
    }

    // Scoring
    if (!pipe.passed && pipe.x < BIRD_X) {
      pipe.passed = true
      currentScore.value++

      // Difficulty scaling every 5 points
      if (currentScore.value > 0 && currentScore.value % 5 === 0) {
        currentPipeSpeed += 0.15
        // Maintain consistent distance between pipes regardless of speed
        // Base distance = 2.8 * 80 = 224 units
        currentPipeSpawnRate = Math.max(25, Math.floor(224 / currentPipeSpeed))
        console.log(
          `Speed increased! New speed: ${currentPipeSpeed.toFixed(1)}, Spawn rate: ${currentPipeSpawnRate}`
        )
      }
    }
  })

  // Remove off-screen pipes
  if (pipes.length > 0 && pipes[0].x < -60) {
    pipes.shift()
  }

  // Boundary Checks: Bottom of screen is 400px, bird size is 42px.
  // We die if bird's bottom (birdY + BIRD_SIZE) goes past the floor (~390px)
  if (birdY + BIRD_SIZE > 390 || birdY < -20) {
    gameOver()
  }
}

const gameOver = (): void => {
  gameState.value = 'GAME_OVER'
  if (currentScore.value > highScore.value) {
    highScore.value = currentScore.value
    localStorage.setItem('pokegogo_flappy_highscore', highScore.value.toString())
  }

  // Submit score to backend if logged in and score > 0
  if (userStore.user && currentScore.value > 0) {
    submitFlappyScore(currentScore.value)
      .then(() => fetchLeaderboard())
      .catch((err) => console.error('Failed to submit score:', err))
  }
}

const fetchLeaderboard = async (): Promise<void> => {
  isLoadingLeaderboard.value = true
  try {
    const data = await getFlappyLeaderboard()
    leaderboardData.value = data
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err)
  } finally {
    isLoadingLeaderboard.value = false
  }
}

const draw = (): void => {
  const canvas = canvasRef.value
  if (!canvas || !assetsLoaded.value || !modalVisible.value) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw Background (Repeated)
  ctx.drawImage(bgImg, bgX, 0, 640, 400)
  ctx.drawImage(bgImg, bgX + 640, 0, 640, 400)

  // Draw Pipes
  pipes.forEach((pipe) => {
    const SRC_W = pipeImg.width
    const SRC_H = pipeImg.height

    // --- Top Pipe (inverted) ---
    ctx.save()
    ctx.translate(pipe.x + PIPE_WIDTH / 2, pipe.top)
    ctx.scale(1, -1)

    // We treat the whole image as the "head" part, drawn at its natural aspect ratio based on width
    const HEAD_H = (SRC_H / SRC_W) * PIPE_WIDTH // If world size is 52x52

    // 1. Draw the head at the mouth
    const drawH = Math.min(HEAD_H, pipe.top)
    ctx.drawImage(
      pipeImg,
      0,
      0,
      SRC_W,
      (drawH / HEAD_H) * SRC_H,
      -PIPE_WIDTH / 2,
      0,
      PIPE_WIDTH,
      drawH
    )

    // 2. Clear out the rest with a 1px shaft slice from the "end" of the pipe image
    if (pipe.top > HEAD_H) {
      ctx.drawImage(
        pipeImg,
        0,
        SRC_H - 1,
        SRC_W,
        1,
        -PIPE_WIDTH / 2,
        HEAD_H,
        PIPE_WIDTH,
        pipe.top - HEAD_H
      )
    }
    ctx.restore()

    // --- Bottom Pipe ---
    const bottomPipeY = pipe.top + PIPE_GAP
    const bottomTotalH = 400 - bottomPipeY

    // 1. Draw head at the mouth (top of the bottom pipe)
    const bottomDrawH = Math.min(HEAD_H, bottomTotalH)
    ctx.drawImage(
      pipeImg,
      0,
      0,
      SRC_W,
      (bottomDrawH / HEAD_H) * SRC_H,
      pipe.x,
      bottomPipeY,
      PIPE_WIDTH,
      bottomDrawH
    )

    // 2. Draw shaft below the head
    if (bottomTotalH > HEAD_H) {
      ctx.drawImage(
        pipeImg,
        0,
        SRC_H - 1,
        SRC_W,
        1,
        pipe.x,
        bottomPipeY + HEAD_H,
        PIPE_WIDTH,
        bottomTotalH - HEAD_H
      )
    }
  })

  // Draw Bird with Tilt or Hover
  ctx.save()
  const displayY = gameState.value === 'START' ? birdY + Math.sin(frameCount * 0.05) * 10 : birdY

  ctx.translate(BIRD_X + BIRD_SIZE / 2, displayY + BIRD_SIZE / 2)

  const rotation =
    gameState.value === 'START'
      ? 0
      : Math.min(Math.PI / 4, Math.max(-Math.PI / 4, birdVelocity * 0.1))

  ctx.rotate(rotation)
  ctx.drawImage(birdImg, -BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE)
  ctx.restore()

  // Score UI
  ctx.fillStyle = 'white'
  ctx.font = 'bold 24px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 4
  ctx.fillText(currentScore.value.toString(), canvas.width / 2, 40)
  ctx.shadowBlur = 0

  if (gameState.value === 'START') {
    drawOverlay(ctx, 'START')
  } else if (gameState.value === 'GAME_OVER') {
    drawOverlay(ctx, 'GAME OVER')
  }
}

const drawOverlay = (ctx: CanvasRenderingContext2D, text: string): void => {
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(0, 0, 640, 400)

  ctx.fillStyle = 'white'
  ctx.font = 'bold 40px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(text, 320, 180)

  ctx.font = '18px Inter, sans-serif'
  ctx.fillText(t('common.pressSpace'), 320, 230)

  if (text === 'GAME OVER') {
    ctx.font = 'bold 24px Inter, sans-serif'
    ctx.fillText(`${t('common.score')}: ${currentScore.value}`, 320, 270)
    ctx.fillText(`${t('common.highScore')}: ${highScore.value}`, 320, 305)
  }
}

const loop = (): void => {
  if (!modalVisible.value) {
    animationId = null
    return
  }
  update()
  draw()
  animationId = requestAnimationFrame(loop)
}

const handleKeyDown = (e: KeyboardEvent): void => {
  if (e.code === 'Space') {
    e.preventDefault()
    jump()
  }
  if (e.code === 'Escape' && modalVisible.value) {
    closeModal()
  }
}

onMounted(() => {
  // Loop is now started/stopped in openModal/closeModal
})

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('keydown', handleKeyDown)
})

defineExpose({
  openModal
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modalVisible" class="g-modal-overlay" @click.self="closeModal">
        <div class="game-modal-content">
          <div class="game-header">
            <div class="game-title">
              <i class="fas fa-gamepad"></i>
              Flappy Pidgey
            </div>
            <div class="header-actions">
              <button
                class="leaderboard-toggle"
                :class="{ active: showLeaderboard }"
                title="Top 10"
                @click="showLeaderboard = !showLeaderboard"
              >
                <i class="fas fa-trophy"></i>
                {{ t('common.leaderboard') }}
              </button>
              <button class="close-btn" @click="closeModal">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div class="game-body">
            <div class="canvas-container" @mousedown="jump">
              <canvas ref="canvasRef" width="640" height="400"></canvas>
              <div v-if="gameState === 'START'" class="hint">
                {{ t('common.clickToJump') }}
              </div>
            </div>

            <div v-if="showLeaderboard" class="leaderboard-panel">
              <div class="panel-header">
                <h3><i class="fas fa-crown"></i> {{ t('common.leaderboard') }}</h3>
                <span class="period-hint">
                  {{
                    new Date().toLocaleDateString(undefined, {
                      month: 'long',
                      year: 'numeric'
                    })
                  }}
                </span>
              </div>

              <div v-if="isLoadingLeaderboard" class="loader">
                <i class="fas fa-circle-notch fa-spin"></i>
                <p>{{ t('common.loading') }}</p>
              </div>

              <table v-else>
                <thead>
                  <tr>
                    <th>{{ t('common.rank') }}</th>
                    <th>{{ t('common.nick') }}</th>
                    <th class="text-right">{{ t('common.score') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(entry, index) in leaderboardData"
                    :key="index"
                    :class="{
                      'is-me': entry.user?.nickname === userStore.user?.nickname
                    }"
                  >
                    <td class="rank-col">
                      <span v-if="index === 0" class="medal gold">🥇</span>
                      <span v-else-if="index === 1" class="medal silver">🥈</span>
                      <span v-else-if="index === 2" class="medal bronze">🥉</span>
                      <span v-else>{{ index + 1 }}</span>
                    </td>
                    <td class="nick-col">{{ entry.user?.nickname || '???' }}</td>
                    <td class="score-col text-right">{{ entry.score }}</td>
                  </tr>
                  <tr v-if="leaderboardData.length === 0">
                    <td colspan="3" class="empty">No scores yet this month!</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="game-footer">
            <div class="high-score-labels">
              <span>{{ t('common.highScore') }}:</span>
              <strong>{{ highScore }}</strong>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.game-modal-content {
  background: #111;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: fit-content;
  max-width: 95vw;
}

.game-header {
  padding: 1rem 1.5rem;
  background: #1a1a1a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.game-title {
  color: var(--primary);
  font-weight: 800;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #888;
  cursor: pointer;
  font-size: 1.2rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ff4d4d;
  transform: scale(1.05);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.leaderboard-toggle {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #aaa;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.leaderboard-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.leaderboard-toggle.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #000;
  font-weight: 600;
}

.game-body {
  display: flex;
  position: relative;
  overflow: hidden;
}

.canvas-container {
  position: relative;
  width: 640px;
  min-width: 640px;
  height: 400px;
  cursor: pointer;
  background: #70c5ce;
}

.leaderboard-panel {
  width: 320px;
  background: #141414;
  border-left: 1px solid rgba(255, 255, 255, 0.05);
  padding: 20px;
  display: flex;
  flex-direction: column;
  animation: slideLeft 0.3s ease;
}

@keyframes slideLeft {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.panel-header {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-header h3 {
  margin: 0;
  color: #fff;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.period-hint {
  font-size: 0.75rem;
  color: #666;
  text-transform: capitalize;
}

.loader {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #444;
  gap: 10px;
}

.leaderboard-panel table {
  width: 100%;
  border-collapse: collapse;
}

.leaderboard-panel th {
  text-align: left;
  font-size: 0.75rem;
  color: #444;
  text-transform: uppercase;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.leaderboard-panel td {
  padding: 12px 0;
  font-size: 0.9rem;
  color: #ccc;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.rank-col {
  width: 40px;
  font-weight: bold;
  color: #666;
}
.score-col {
  font-weight: 800;
  color: var(--primary);
}
.text-right {
  text-align: right;
}

.is-me {
  background: rgba(var(--primary-rgb), 0.05);
}

.is-me td {
  color: #fff;
}

.medal {
  font-size: 1.2rem;
}

.empty {
  text-align: center;
  color: #444;
  padding: 40px 0 !important;
  font-style: italic;
}

canvas {
  display: block;
}

.hint {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  text-align: center;
  color: white;
  font-size: 0.9rem;
  opacity: 0.6;
  pointer-events: none;
}

.game-footer {
  padding: 10px 20px;
  background: #1a1a1a;
  display: flex;
  justify-content: flex-end;
}

.high-score-labels {
  color: #888;
  font-size: 0.85rem;
  display: flex;
  gap: 8px;
}

.high-score-labels strong {
  color: var(--primary);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
