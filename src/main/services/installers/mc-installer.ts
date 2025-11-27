/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs'
import { posix } from 'path'
import crypto from 'crypto'
import { Client } from 'basic-ftp'
import { safeCd, useFTPService } from '../ftp-service'
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

// Wrapper dla klienta FTP, aby obsługiwać reconnect przez referencję
interface FtpState {
  client: Client
}

interface GlobalProgress {
  totalFiles: number
  downloadedFiles: number
  totalSize: number
  downloadedSize: number
  startTime: number
}

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

  // POPRAWKA: Regex akceptuje 64 znaki hasha LUB słowo kluczowe 'dir' jako "hash".
  // Grupa 2 ([a-fA-F0-9]{64}|dir) jest kluczową zmianą.
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
    await state.client.downloadTo(localHashesPath, remoteHashesPath)
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
    await safeCd(state.client, remoteDir)
    list = await state.client.list()
  } catch {
    try {
      state.client = await connect()
      await safeCd(state.client, remoteDir)
      list = await state.client.list()
    } catch (err) {
      Logger.error(`Błąd listowania ${remoteDir}: ${err}`)
      return plan
    }
  }

  const remoteFilesSet = new Set<string>()

  // 3. Przetwarzanie listy plików ZDALNYCH (co pobrać/zaktualizować)
  for (const file of list) {
    if (signal.aborted) return plan
    if (file.name === '.' || file.name === '..') continue

    const itemRemotePath = posix.join(remoteDir, file.name)
    const itemLocalPath = posix.join(localDir, file.name)

    remoteFilesSet.add(file.name)

    // Sprawdzamy flagi z pełnej mapy, aby wiedzieć, czy są 'important' lub 'ignore'.
    const entry = effectiveHashes[itemRemotePath]
    const currentEntry = combinedHashes[itemRemotePath]
    const isEntryImportant = currentEntry?.flag === 'important'
    const isEntryIgnored = currentEntry?.flag === 'ignore'

    if (file.isDirectory) {
      let shouldRecurse = true

      // Warunek optymalizacyjny dla kolejnych aktualizacji
      if (!isFirstInstall) {
        // Jeśli nie jest to pierwsza instalacja, wchodzimy TYLKO do folderów 'important'
        if (isEntryImportant) {
          shouldRecurse = true
        } else if (isEntryIgnored) {
          // Folder ignorowany jest zawsze pomijany
          shouldRecurse = false
        } else {
          // Folder nie jest ani 'important', ani 'ignore' -> OPTYMALIZUJEMY I POMIJAMY SKANOWANIE
          shouldRecurse = false
          Logger.log(`[OPT] Pomijam skanowanie folderu: ${itemRemotePath}`)
        }
      }

      if (shouldRecurse) {
        // Decyzja o "Strict Mode" dla podkatalogu.
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
    } else if (file.isFile) {
      if (file.name === 'hashes.txt' || file.name.endsWith('.sha256')) continue

      // Jeśli plik jest ignorowany (np. options.txt po instalacji), pomijamy
      if (isEntryIgnored && !isFirstInstall) continue

      let needDownload = true

      // Sprawdzanie hasha (jeśli dostępny i nie jest to pierwsza instalacja)
      if (entry && !isFirstInstall) {
        const localExists = await fileExists(itemLocalPath)
        if (localExists) {
          const localHash = await getFileHash(itemLocalPath)
          if (localHash === entry.hash) {
            needDownload = false
          }
        }
      } else if (!isFirstInstall) {
        // Plik bez hasha w spisie. Jeśli istnieje lokalnie, zostawiamy.
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

  // 4. CLEANUP - Usuwanie nadmiarowych plików (Cheaty, stare mody)
  if (!isFirstInstall) {
    try {
      const localFiles = await fs.promises.readdir(localDir, { withFileTypes: true })

      for (const localDirent of localFiles) {
        if (!localDirent.isFile()) continue
        const name = localDirent.name
        if (name === 'hashes.txt') continue

        const fullRemotePath = posix.join(remoteDir, name)
        const entryInHashes = combinedHashes[fullRemotePath]

        // 1. Jeśli plik ma flagę 'ignore' -> NIE USUWAĆ.
        if (entryInHashes?.flag === 'ignore') continue

        // 2. Jeśli pliku NIE MA na liście serwera:
        if (!remoteFilesSet.has(name)) {
          // Usuwamy go TYLKO JEŚLI jesteśmy w folderze "Strict"
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

    // Callback do paska postępu
    state.client.trackProgress((info) => {
      const currentSessionBytes = info.bytes
      const totalDownloadedNow = globalProgress.downloadedSize + currentSessionBytes

      // Obliczanie czasu
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
    })

    // Próba pobrania z retry
    let success = false
    for (let attempt = 0; attempt < 3 && !success; attempt++) {
      if (signal.aborted) return
      try {
        await state.client.downloadTo(task.localPath, task.remotePath)
        success = true
      } catch (err: any) {
        const msg = err.message || String(err)
        Logger.warn(`Błąd pobierania ${task.fileName}: ${msg}. Próba ${attempt + 1}`)

        if (msg.toLowerCase().includes('socket') || msg.toLowerCase().includes('closed')) {
          try {
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

    state.client.trackProgress(undefined)
    globalProgress.downloadedSize += task.size
    globalProgress.downloadedFiles++
  }
}

// --- Główna funkcja eksportowana ---

export async function copyMCFiles(
  isDev: boolean,
  mainWindow: BrowserWindow,
  signal: AbortSignal,
  logHandlerName: string = 'launch:show-log'
): Promise<string | undefined> {
  const ftp = useFTPService()
  const localRoot = posix.join(app.getPath('userData'), 'mcfiles')
  const markerFile = posix.join(app.getPath('userData'), '.mcfiles_installed')

  const logToUI = (msg: string, isEnded: boolean = false): void => {
    mainWindow.webContents.send(logHandlerName, msg, isEnded)
  }

  let state: FtpState | undefined
  try {
    const isFirstInstall = !(await fileExists(markerFile))

    state = { client: await ftp.connect() }

    const pwd = await state.client.pwd()
    const remoteRoot = posix.join(pwd, isDev ? 'dev-mc' : 'mc')

    const globalProgress: GlobalProgress = {
      totalFiles: 0,
      downloadedFiles: 0,
      totalSize: 0,
      downloadedSize: 0,
      startTime: 0
    }

    logToUI('Weryfikacja plików...')

    // KROK 1: Analiza
    const plan = await analyzeDirectory(
      state,
      ftp.connect,
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
      await executeSyncPlan(state, ftp.connect, plan, logToUI, signal, globalProgress)
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
        state.client.close()
      }
    } catch {
      /* ignore */
    }
  }
  return
}
