/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs'
import { posix } from 'path'
import crypto from 'crypto'
import Client from 'ssh2-sftp-client' // Zmiana klienta
import { useFTPService } from '../ftp-service'
import { app, BrowserWindow } from 'electron'
import Logger from 'electron-log'

// --- TYPY I INTERFEJSY ---

interface HashEntry {
  hash: string
  flag?: 'important' | 'ignore'
}

type HashMap = Record<string, HashEntry>

interface SyncTask {
  type: 'download'
  remotePath: string
  localPath: string
  size: number
  fileName: string
}

interface DeleteTask {
  localPath: string
}

interface SyncPlan {
  downloads: SyncTask[]
  deletes: DeleteTask[]
  totalSize: number
}

// Wrapper dla klienta SFTP
interface FtpState {
  client: Client
}

interface GlobalProgress {
  totalFiles: number
  completedFiles: number // Pliki w pełni pobrane
  totalSize: number
  downloadedSizeBase: number // Bajty pobrane z *zakończonych* plików
  startTime: number
}

// --- HELPERS DLA SFTP ---
const isSftpDir = (type: string | undefined): boolean => type === 'd'
const isSftpFile = (type: string | undefined): boolean => type === '-'

// --- FUNKCJE POMOCNICZE ---

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath)
    return true
  } catch {
    return false
  }
}

async function getFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

/**
 * Parsuje plik hashes.txt
 */
async function parseHashes(content: string): Promise<HashMap> {
  const map: HashMap = {}
  const lines = content.split('\n').filter((l) => l.trim())

  const regex = /^(.*?)\s+([a-fA-F0-9]{64}|dir)(?:\s+(important|ignore))?$/

  for (const line of lines) {
    const match = line.trim().match(regex)
    if (match) {
      const [, name, hash, flag] = match
      map[name.trim()] = {
        hash,
        flag: flag as 'important' | 'ignore' | undefined
      }
    }
  }
  return map
}

// --- LOGIKA GŁÓWNA (FAZA 1: ANALIZA - ZOPTYMALIZOWANA) ---

/**
 * Struktura pomocnicza do wyników analizy pojedynczego folderu
 */
interface DirectoryAnalysisResult {
  remoteList: any[]
  hashes: HashMap
}

/**
 * Pobiera dane o katalogu (listę plików i hashe) RÓWNOLEGLE
 */
async function fetchDirectoryData(
  state: FtpState,
  remoteDir: string,
  localDir: string
): Promise<DirectoryAnalysisResult> {
  const remoteHashesPath = posix.join(remoteDir, 'hashes.txt')
  const localHashesPath = posix.join(localDir, 'hashes.txt')

  // Uruchamiamy oba requesty na raz: LIST oraz GET hashes.txt
  const listPromise = state.client.list(remoteDir).catch((err) => {
    Logger.warn(`[FTP] Błąd listowania ${remoteDir}: ${err.message}`)
    return [] // Zwracamy pusto w razie błędu listowania, by nie wywalić całej apki
  })

  const hashesPromise = (async () => {
    try {
      await state.client.get(remoteHashesPath, localHashesPath)
      const content = await fs.promises.readFile(localHashesPath, 'utf8')
      return parseHashes(content)
    } catch {
      return {} // Brak pliku hashes.txt lub błąd
    }
  })()

  const [remoteList, hashes] = await Promise.all([listPromise, hashesPromise])

  return { remoteList, hashes }
}

/**
 * FAZA 1: Skanowanie i budowanie planu (RÓWNOLEGŁA)
 */
async function analyzeDirectory(
  state: FtpState,
  connect: () => Promise<Client>, // connect jest tu rzadziej potrzebny dzięki Promise.all, ale zostawiamy dla spójności
  remoteDir: string,
  localDir: string,
  isFirstInstall: boolean,
  signal: AbortSignal,
  ancestorHashes: HashMap = {},
  isStrictFolder: boolean = false
): Promise<SyncPlan> {
  const plan: SyncPlan = { downloads: [], deletes: [], totalSize: 0 }

  if (signal.aborted) return plan

  // 1. Upewnij się, że katalog istnieje
  await fs.promises.mkdir(localDir, { recursive: true })

  // 2. Pobierz dane zdalne (Lista + Hashe) równolegle
  Logger.log(`[ANALIZA] Pobieranie danych dla: ${remoteDir}`)
  const { remoteList, hashes: currentDirHashes } = await fetchDirectoryData(
    state,
    remoteDir,
    localDir
  )

  // Budowanie mapy hashy
  const combinedHashes: HashMap = { ...ancestorHashes }
  for (const [name, entry] of Object.entries(currentDirHashes)) {
    const fullRemotePath = posix.join(remoteDir, name)
    combinedHashes[fullRemotePath] = entry
  }

  const effectiveHashes = isFirstInstall ? {} : combinedHashes
  const remoteFilesSet = new Set<string>()

  // Kolekcje do przetwarzania równoległego
  const fileTasks: Promise<void>[] = []
  const dirTasks: Promise<SyncPlan>[] = []

  // 3. Iteracja po elementach zdalnych
  for (const file of remoteList) {
    if (file.name === '.' || file.name === '..') continue

    const itemRemotePath = posix.join(remoteDir, file.name)
    const itemLocalPath = posix.join(localDir, file.name)
    remoteFilesSet.add(file.name)

    const entry = effectiveHashes[itemRemotePath]
    const isEntryImportant = combinedHashes[itemRemotePath]?.flag === 'important'
    const isEntryIgnored = combinedHashes[itemRemotePath]?.flag === 'ignore'

    // --- KATALOGI ---
    if (isSftpDir(file.type)) {
      let shouldRecurse = true
      // Logika flag
      if (!isFirstInstall) {
        if (isEntryImportant) shouldRecurse = true
        else if (isEntryIgnored) shouldRecurse = false
        else shouldRecurse = false // Optymalizacja
      }

      if (shouldRecurse) {
        const nextIsStrict = isStrictFolder || isEntryImportant
        // Rekurencja: Dodajemy do tablicy zadań, NIE czekamy tutaj (await)
        dirTasks.push(
          analyzeDirectory(
            state,
            connect,
            itemRemotePath,
            itemLocalPath,
            isFirstInstall,
            signal,
            combinedHashes,
            nextIsStrict
          )
        )
      }
    }
    // --- PLIKI ---
    else if (isSftpFile(file.type)) {
      if (file.name === 'hashes.txt' || file.name.endsWith('.sha256')) continue
      if (isEntryIgnored && !isFirstInstall) continue

      // Tworzymy zadanie sprawdzenia pliku
      const task = (async () => {
        let needDownload = true

        // Optymalizacja: Najpierw sprawdź istnienie i hasha, tylko jeśli to konieczne
        if (entry && !isFirstInstall) {
          const localExists = await fileExists(itemLocalPath)
          if (localExists) {
            // Tu jest największy zysk: Obliczanie hasha dzieje się w tle dla wielu plików naraz
            const localHash = await getFileHash(itemLocalPath)
            if (localHash === entry.hash) {
              needDownload = false
            }
          }
        } else if (!isFirstInstall) {
          // Brak hasha w bazie, ale plik jest lokalnie - zakładamy że ok (zgodnie z oryginalną logiką)
          if (await fileExists(itemLocalPath)) {
            needDownload = false
          }
        }

        if (needDownload) {
          // Uwaga: Pushowanie do tablicy nie jest atomowe w JS, ale w pętli event loop jest bezpieczne
          // dopóki nie używamy worker threads. Tutaj działamy na jednym wątku JS.
          plan.downloads.push({
            type: 'download',
            remotePath: itemRemotePath,
            localPath: itemLocalPath,
            size: file.size,
            fileName: file.name
          })
          plan.totalSize += file.size
        }
      })()

      fileTasks.push(task)
    }
  }

  // 4. Oczekiwanie na zakończenie analizy plików w TYM folderze
  await Promise.all(fileTasks)

  // 5. Oczekiwanie na zakończenie analizy PODFOLDERÓW (rekurencja równoległa)
  const subPlans = await Promise.all(dirTasks)

  // Scalanie wyników z podfolderów
  for (const subPlan of subPlans) {
    plan.downloads.push(...subPlan.downloads)
    plan.deletes.push(...subPlan.deletes)
    plan.totalSize += subPlan.totalSize
  }

  // 6. Cleanup (Czyszczenie lokalne) - to wykonujemy na końcu, jest szybkie (lokalne FS)
  if (!isFirstInstall) {
    try {
      const localFiles = await fs.promises.readdir(localDir, { withFileTypes: true })
      for (const localDirent of localFiles) {
        if (!localDirent.isFile()) continue
        const name = localDirent.name
        if (name === 'hashes.txt') continue

        const fullRemotePath = posix.join(remoteDir, name)
        // Sprawdzamy w combinedHashes, które mamy już w pamięci
        if (combinedHashes[fullRemotePath]?.flag === 'ignore') continue

        if (!remoteFilesSet.has(name) && isStrictFolder) {
          plan.deletes.push({ localPath: posix.join(localDir, name) })
        }
      }
    } catch {
      /* ignore */
    }
  }

  return plan
}

/**
 * FAZA 2: Wykonanie (Pobieranie i usuwanie)
 * Zoptymalizowana: Równoległość + Średnia krocząca (ETA) + SYNCHRONIZOWANY RECONNECT (Fix)
 */
async function executeSyncPlan(
  state: FtpState,
  connect: () => Promise<Client>,
  plan: SyncPlan,
  log: (msg: string) => void,
  signal: AbortSignal,
  globalProgress: GlobalProgress
): Promise<void> {
  // --- KONFIGURACJA ---
  const CONCURRENCY_LIMIT = 4
  const SMOOTHING_FACTOR = 0.05

  // --- ZMIENNE STANU ---
  globalProgress.totalFiles = plan.downloads.length
  globalProgress.totalSize = plan.totalSize
  globalProgress.startTime = Date.now()

  let lastSpeedCalcTime = Date.now()
  let lastBytesForSpeed = 0
  let currentSpeed = 0

  // Muteks do reconnectu - zapobiega jednoczesnemu łączeniu się wielu workerów
  let reconnectPromise: Promise<Client> | null = null

  // Helper do formatowania MB
  const byteToMB = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(2)
  const totalMBString = byteToMB(globalProgress.totalSize)

  // 1. Usuwanie zbędnych plików (Szybka operacja, bez zmian)
  if (plan.deletes.length > 0) {
    log(`Usuwanie ${plan.deletes.length} zbędnych plików...`)
    for (const delTask of plan.deletes) {
      if (signal.aborted) return
      try {
        await fs.promises.unlink(delTask.localPath)
      } catch {
        /* ignore */
      }
    }
  }

  // Funkcja aktualizująca UI (ETA i Pasek postępu)
  const updateUI = (): void => {
    const now = Date.now()
    const timeDiff = now - lastSpeedCalcTime

    if (timeDiff > 1000) {
      const bytesInWindow = globalProgress.downloadedSizeBase - lastBytesForSpeed
      // Zabezpieczenie przed ujemnym wynikiem przy retry
      const safeBytes = bytesInWindow < 0 ? 0 : bytesInWindow

      const instantSpeed = safeBytes / timeDiff

      if (currentSpeed === 0) {
        currentSpeed = instantSpeed
      } else {
        currentSpeed = currentSpeed * (1 - SMOOTHING_FACTOR) + instantSpeed * SMOOTHING_FACTOR
      }

      lastSpeedCalcTime = now
      lastBytesForSpeed = globalProgress.downloadedSizeBase
    }

    let remainingText = 'Obliczanie...'
    if (currentSpeed > 0) {
      const remainingBytes = globalProgress.totalSize - globalProgress.downloadedSizeBase
      const remainingMs = Math.max(0, remainingBytes / currentSpeed)

      const totalSecondsLeft = Math.ceil(remainingMs / 1000)
      const min = Math.floor(totalSecondsLeft / 60)
      const sec = totalSecondsLeft % 60
      const secString = sec.toString().padStart(2, '0')
      remainingText = min > 0 ? `${min}m ${secString}s` : `${sec}s`
    }

    const percent =
      globalProgress.totalSize > 0
        ? Math.floor((globalProgress.downloadedSizeBase / globalProgress.totalSize) * 100)
        : 100

    const currentMBString = byteToMB(globalProgress.downloadedSizeBase)

    log(
      `Pobieranie: ${currentMBString} / ${totalMBString} MB (${percent}%) • Pozostało: ${remainingText}`
    )
  }

  // --- LOGIKA RECONNECTU (Synchronizowana) ---
  const handleReconnect = async (): Promise<void> => {
    // Jeśli reconnect już trwa, po prostu czekamy na jego zakończenie
    if (reconnectPromise) {
      Logger.log(`[RECONNECT] Czekam na zakończenie trwającego reconnectu...`)
      try {
        await reconnectPromise
        return
      } catch {
        // Jeśli tamten reconnect padł, próbujemy sami poniżej
      }
    }

    // Tworzymy nową obietnicę reconnectu (blokada dla innych wątków)
    reconnectPromise = (async () => {
      Logger.log(`[RECONNECT] Rozpoczynam procedurę naprawy połączenia...`)

      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          // Próba zamknięcia starego
          try {
            await state.client.end()
          } catch {
            /* ignore */
          }

          // Stopniowe wydłużanie czasu oczekiwania (Backoff): 1s, 2s, 3s...
          await new Promise((r) => setTimeout(r, 1000 * attempt))

          const newClient = await connect()
          state.client = newClient // Podmieniamy klienta w globalnym stanie

          Logger.log(`[RECONNECT] Sukces w próbie ${attempt}.`)
          return newClient
        } catch (err) {
          Logger.warn(`[RECONNECT] Próba ${attempt} nieudana: ${err}`)
          if (attempt === 5) throw err // Krytyczny błąd po 5 razach
        }
      }
      throw new Error('Nie udało się nawiązać połączenia po 5 próbach.')
    })()

    try {
      await reconnectPromise
    } finally {
      // Zwalniamy blokadę niezależnie od wyniku
      reconnectPromise = null
    }
  }

  // --- WORKER POBIERANIA ---
  const queue = [...plan.downloads]

  const downloadWorker = async (): Promise<void> => {
    while (queue.length > 0 && !signal.aborted) {
      const task = queue.shift()
      if (!task) break

      let downloadedForThisFile = 0

      const fileStep = (transferred: number): void => {
        const delta = transferred - downloadedForThisFile
        downloadedForThisFile = transferred
        globalProgress.downloadedSizeBase += delta
        updateUI()
      }

      let success = false
      // Pętla prób dla JEDNEGO pliku
      for (let attempt = 0; attempt < 3 && !success; attempt++) {
        if (signal.aborted) return
        try {
          // fastGet korzysta z concurrency:
          await state.client.fastGet(task.remotePath, task.localPath, { step: fileStep })
          success = true
        } catch (err: any) {
          const msg = err.message || String(err)
          Logger.warn(`[W] Błąd ${task.fileName} (Próba ${attempt + 1}): ${msg}`)

          // Sprawdzamy czy to błąd połączenia
          const isNetworkError = msg
            .toLowerCase()
            .match(/(socket|closed|no connection|timeout|keepalive|econnreset)/)

          if (isNetworkError) {
            try {
              // Wywołujemy bezpieczny, synchronizowany reconnect
              await handleReconnect()

              // Po udanym reconnectcie zmniejszamy licznik 'attempt',
              // aby błąd sieci nie "zjadał" prób pobrania pliku.
              // Dzięki temu plik ma nadal 3 szanse na pobranie po naprawieniu łącza.
              attempt--
            } catch (fatalError) {
              Logger.error(`[FATAL] Nie można odzyskać połączenia: ${fatalError}`)
              throw fatalError // To przerwie Promise.all i zatrzyma program
            }
          } else {
            // Zwykły błąd (np. plik zajęty), czekamy chwilę
            await new Promise((r) => setTimeout(r, 1000))
          }
        }
      }

      if (!success) {
        throw new Error(`Nie udało się pobrać pliku: ${task.fileName}`)
      }

      globalProgress.completedFiles++
    }
  }

  // Start Workerów
  const activeWorkers: Promise<void>[] = []
  for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, plan.downloads.length); i++) {
    activeWorkers.push(downloadWorker())
  }

  await Promise.all(activeWorkers)
}

export async function copyMCFiles(
  isDev: boolean,
  mainWindow: BrowserWindow,
  signal: AbortSignal,
  logHandlerName: string = 'launch:show-log'
): Promise<string | undefined> {
  const ftpService = useFTPService()
  const localRoot = posix.join(app.getPath('userData'), 'mcfiles')
  const markerFile = posix.join(app.getPath('userData'), '.mcfiles_installed')

  const logToUI = (msg: string, isEnded: boolean = false): void => {
    mainWindow.webContents.send(logHandlerName, msg, isEnded)
  }

  let state: FtpState | undefined
  try {
    const isFirstInstall = !(await fileExists(markerFile))

    state = { client: await ftpService.connect() }

    const pwd = await state.client.cwd()
    const remoteRoot = posix.join(pwd, isDev ? 'dev-mc' : 'mc')

    const globalProgress: GlobalProgress = {
      totalFiles: 0,
      completedFiles: 0,
      totalSize: 0,
      downloadedSizeBase: 0,
      startTime: 0
    }

    logToUI('Weryfikacja plików...')

    // KROK 1: Analiza
    const plan = await analyzeDirectory(
      state,
      ftpService.connect,
      remoteRoot,
      localRoot,
      isFirstInstall,
      signal,
      {},
      false
    )

    if (signal.aborted) return 'stop'

    Logger.log(
      `Plan: ${plan.downloads.length} down, ${plan.deletes.length} del. Size: ${(plan.totalSize / 1024 / 1024).toFixed(2)} MB`
    )

    // KROK 2: Wykonanie
    if (plan.downloads.length > 0 || plan.deletes.length > 0) {
      await executeSyncPlan(state, ftpService.connect, plan, logToUI, signal, globalProgress)
    } else {
      logToUI('Pliki są aktualne.')
    }

    if (signal.aborted) return 'stop'

    if (isFirstInstall) {
      await fs.promises.writeFile(markerFile, 'installed')
      Logger.log('PokeGoGo Launcher > Utworzono plik markera instalacji')
    }

    logToUI('', true)
    return 'done'
  } catch (err) {
    Logger.error(err)
    logToUI(`Błąd aktualizacji: ${err}`, true)
  } finally {
    try {
      if (state) {
        await state.client.end()
      }
    } catch {
      /* ignore */
    }
  }
  return
}
