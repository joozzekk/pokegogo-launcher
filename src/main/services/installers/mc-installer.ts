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

// --- LOGIKA GŁÓWNA (FAZA 1: ANALIZA) ---

/**
 * FAZA 1: Skanowanie i budowanie planu
 */
async function analyzeDirectory(
  state: FtpState,
  connect: () => Promise<Client>,
  remoteDir: string,
  localDir: string,
  isFirstInstall: boolean,
  signal: AbortSignal,
  ancestorHashes: HashMap = {},
  isStrictFolder: boolean = false
): Promise<SyncPlan> {
  const plan: SyncPlan = { downloads: [], deletes: [], totalSize: 0 }

  if (signal.aborted) return plan

  await fs.promises.mkdir(localDir, { recursive: true })

  // 1. Pobranie i parsowanie hashes.txt
  let currentDirHashes: HashMap = {}
  const remoteHashesPath = posix.join(remoteDir, 'hashes.txt')

  try {
    const localHashesPath = posix.join(localDir, 'hashes.txt')
    await state.client.get(remoteHashesPath, localHashesPath)
    const content = await fs.promises.readFile(localHashesPath, 'utf8')
    currentDirHashes = await parseHashes(content)
  } catch {
    // Brak hashes.txt - traktujemy jako pusty
  }

  // Budujemy mapę hashy dla tego poziomu
  const combinedHashes: HashMap = { ...ancestorHashes }
  for (const [name, entry] of Object.entries(currentDirHashes)) {
    const fullRemotePath = posix.join(remoteDir, name)
    combinedHashes[fullRemotePath] = entry
  }

  // Jeśli to pierwsza instalacja, UKRYWAMY flagi 'ignore'.
  const effectiveHashes = isFirstInstall ? {} : combinedHashes

  // 2. Listing plików na serwerze
  let list
  try {
    // W SFTP podajemy pełną ścieżkę do list(), nie używamy cd()
    list = await state.client.list(remoteDir)
  } catch {
    try {
      // Próba reconnectu
      await state.client.end() // upewnij się, że stary jest zamknięty
      state.client = await connect()
      list = await state.client.list(remoteDir)
    } catch (err) {
      Logger.error(`Błąd listowania ${remoteDir}: ${err}`)
      return plan
    }
  }

  const remoteFilesSet = new Set<string>()

  // 3. Przetwarzanie listy plików ZDALNYCH
  for (const file of list) {
    if (signal.aborted) return plan
    if (file.name === '.' || file.name === '..') continue

    const itemRemotePath = posix.join(remoteDir, file.name)
    const itemLocalPath = posix.join(localDir, file.name)

    remoteFilesSet.add(file.name)

    const entry = effectiveHashes[itemRemotePath]
    const currentEntry = combinedHashes[itemRemotePath]
    const isEntryImportant = currentEntry?.flag === 'important'
    const isEntryIgnored = currentEntry?.flag === 'ignore'

    if (isSftpDir(file.type)) {
      let shouldRecurse = true

      if (!isFirstInstall) {
        if (isEntryImportant) {
          shouldRecurse = true
        } else if (isEntryIgnored) {
          shouldRecurse = false
        } else {
          // Folder nie jest ani 'important', ani 'ignore' -> OPTYMALIZACJA
          shouldRecurse = false
          Logger.log(`[OPT] Pomijam skanowanie folderu: ${itemRemotePath}`)
        }
      }

      if (shouldRecurse) {
        const nextIsStrict = isStrictFolder || isEntryImportant

        const subPlan = await analyzeDirectory(
          state,
          connect,
          itemRemotePath,
          itemLocalPath,
          isFirstInstall,
          signal,
          combinedHashes,
          nextIsStrict
        )

        plan.downloads.push(...subPlan.downloads)
        plan.deletes.push(...subPlan.deletes)
        plan.totalSize += subPlan.totalSize
      }
    } else if (isSftpFile(file.type)) {
      if (file.name === 'hashes.txt' || file.name.endsWith('.sha256')) continue
      if (isEntryIgnored && !isFirstInstall) continue

      let needDownload = true

      if (entry && !isFirstInstall) {
        const localExists = await fileExists(itemLocalPath)
        if (localExists) {
          const localHash = await getFileHash(itemLocalPath)
          if (localHash === entry.hash) {
            needDownload = false
          }
        }
      } else if (!isFirstInstall) {
        if (await fileExists(itemLocalPath)) {
          needDownload = false
        }
      }

      if (needDownload) {
        plan.downloads.push({
          type: 'download',
          fileName: file.name,
          localPath: itemLocalPath,
          remotePath: itemRemotePath,
          size: file.size
        })
        plan.totalSize += file.size
      }
    }
  }

  // 4. CLEANUP
  if (!isFirstInstall) {
    try {
      const localFiles = await fs.promises.readdir(localDir, { withFileTypes: true })

      for (const localDirent of localFiles) {
        if (!localDirent.isFile()) continue
        const name = localDirent.name
        if (name === 'hashes.txt') continue

        const fullRemotePath = posix.join(remoteDir, name)
        const entryInHashes = combinedHashes[fullRemotePath]

        if (entryInHashes?.flag === 'ignore') continue

        if (!remoteFilesSet.has(name)) {
          if (isStrictFolder) {
            plan.deletes.push({ localPath: posix.join(localDir, name) })
            Logger.log(`[CLEANUP] Usunięto nadmiarowy plik: ${posix.join(localDir, name)}`)
          }
        }
      }
    } catch (e) {
      Logger.warn(`Błąd cleanupu w ${localDir}: ${e}`)
    }
  }

  return plan
}

// --- LOGIKA GŁÓWNA (FAZA 2: WYKONANIE) ---

/**
 * FAZA 2: Wykonanie (Pobieranie i usuwanie)
 */
async function executeSyncPlan(
  state: FtpState,
  connect: () => Promise<Client>,
  plan: SyncPlan,
  log: (msg: string) => void,
  signal: AbortSignal,
  globalProgress: GlobalProgress
): Promise<void> {
  globalProgress.totalFiles = plan.downloads.length
  globalProgress.totalSize = plan.totalSize
  globalProgress.startTime = Date.now()

  // 1. Usuwanie zbędnych plików
  log(`Usuwanie ${plan.deletes.length} zbędnych plików...`)
  for (const delTask of plan.deletes) {
    if (signal.aborted) return
    try {
      await fs.promises.unlink(delTask.localPath)
    } catch {
      /* ignore */
    }
  }

  // 2. Pobieranie plików
  for (let i = 0; i < plan.downloads.length; i++) {
    if (signal.aborted) return
    const task = plan.downloads[i]

    // Funkcja raportowania postępu dla ssh2-sftp-client (fastGet)
    const stepCallback = (totalTransferredForFile: number): void => {
      // Obliczamy całkowity postęp: to co już pobrano z poprzednich plików + to co leci teraz
      const totalDownloadedNow = globalProgress.downloadedSizeBase + totalTransferredForFile

      // Czas i ETA
      const elapsed = Date.now() - globalProgress.startTime
      let remainingText = 'Oszacowywanie...'

      if (elapsed > 1000 && totalDownloadedNow > 0) {
        const speed = totalDownloadedNow / elapsed // bytes per ms
        const remainingBytes = globalProgress.totalSize - totalDownloadedNow
        const remainingMs = remainingBytes / speed

        const sec = Math.floor((remainingMs / 1000) % 60)
        const min = Math.floor((remainingMs / (1000 * 60)) % 60)

        const timeParts: string[] = []
        if (min > 0) timeParts.push(`${min}m`)
        if (sec >= 0) timeParts.push(`${sec}s`)
        remainingText = timeParts.join(' ')
      }

      const percent =
        globalProgress.totalSize > 0
          ? Math.floor((totalDownloadedNow / globalProgress.totalSize) * 100)
          : 100

      log(
        `Pobieranie (${i + 1}/${globalProgress.totalFiles}) ${percent}% (Pozostało: ${remainingText})`
      )
    }

    // Próba pobrania z retry
    let success = false
    for (let attempt = 0; attempt < 3 && !success; attempt++) {
      if (signal.aborted) return
      try {
        // fastGet jest szybsze dla SFTP (korzysta z concurrency)
        // Opcja 'step' pozwala śledzić postęp
        await state.client.fastGet(task.remotePath, task.localPath, {
          step: stepCallback
        })
        success = true
      } catch (err: any) {
        const msg = err.message || String(err)
        Logger.warn(`Błąd pobierania ${task.fileName}: ${msg}. Próba ${attempt + 1}`)

        // Reconnect przy błędach połączenia
        if (
          msg.toLowerCase().includes('socket') ||
          msg.toLowerCase().includes('closed') ||
          msg.toLowerCase().includes('no connection')
        ) {
          try {
            // Zamknij stare połączenie jeśli wisi
            try {
              await state.client.end()
            } catch {
              /* ignore */
            }

            state.client = await connect()
          } catch (reconErr) {
            Logger.error(`Krytyczny błąd reconnectu: ${reconErr}`)
            throw reconErr
          }
        } else {
          await new Promise((r) => setTimeout(r, 1000))
        }
      }
    }

    if (!success) {
      throw new Error(`Nie udało się pobrać pliku ${task.fileName} po 3 próbach.`)
    }

    // Po zakończeniu pliku aktualizujemy bazę pobranych bajtów
    globalProgress.downloadedSizeBase += task.size
    globalProgress.completedFiles++
  }
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
