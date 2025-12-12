/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs'
import { posix, join } from 'path'
import crypto from 'crypto'
import Client from 'ssh2-sftp-client'
import { useFTPService } from '../ftp-service'
import { app, BrowserWindow } from 'electron'
import Logger from 'electron-log'
import AdmZip from 'adm-zip'

// --- TYPY ---

interface HashEntry {
  hash?: string
  zipHash?: string
  flag?: 'important' | 'ignore'
  isZipped?: boolean
  type?: 'file' | 'dir'
}

type HashMap = Record<string, HashEntry>

interface SyncTask {
  type: 'download'
  remotePath: string
  localPath: string
  size: number
  fileName: string
  isZip?: boolean
  targetDir?: string
  zipHash?: string
}

interface DeleteTask {
  localPath: string
}

interface SyncPlan {
  downloads: SyncTask[]
  deletes: DeleteTask[]
  totalSize: number
}

interface FtpState {
  client: Client
}

interface GlobalProgress {
  totalFiles: number
  completedFiles: number
  totalSize: number
  downloadedSizeBase: number
  startTime: number
}

// --- HELPERS ---

const isSftpDir = (type: string | undefined): boolean => type === 'd'
const isSftpFile = (type: string | undefined): boolean => type === '-'

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

async function loadManifest(filePath: string): Promise<HashMap> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

// --- 1. POBIERANIE GLOBALNEGO MANIFESTU ---

async function fetchGlobalManifest(state: FtpState, localTempDir: string): Promise<HashMap> {
  // Pobieramy .hashes z GŁÓWNEGO katalogu FTP ('.')
  const remoteManifestPath = '.hashes'
  const localManifestPath = posix.join(localTempDir, '.hashes_global.json')

  try {
    await fs.promises.mkdir(localTempDir, { recursive: true })

    // Logger.log(`[MANIFEST] Pobieranie globalnego pliku .hashes...`)
    await state.client.get(remoteManifestPath, localManifestPath)

    const map = await loadManifest(localManifestPath)
    await fs.promises.unlink(localManifestPath).catch(() => {})

    // Logger.log(`[MANIFEST] Załadowano ${Object.keys(map).length} wpisów.`)
    return map
  } catch (e: any) {
    Logger.warn(`[ERROR] Nie udało się pobrać głównego pliku .hashes: ${e.message}`)
    return {}
  }
}

// --- 3. WYKONANIE PLANU ---

async function executeSyncPlan(
  state: FtpState,
  connect: () => Promise<Client>,
  plan: SyncPlan,
  log: (msg: string) => void,
  signal: AbortSignal,
  globalProgress: GlobalProgress
): Promise<void> {
  const CONCURRENCY_LIMIT = 4
  const SMOOTHING_FACTOR = 0.05
  globalProgress.totalFiles = plan.downloads.length
  globalProgress.totalSize = plan.totalSize
  globalProgress.startTime = Date.now()
  let lastSpeedCalcTime = Date.now()
  let lastBytesForSpeed = 0
  let currentSpeed = 0
  let reconnectPromise: Promise<Client> | null = null
  const byteToMB = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(2)

  // 1. Usuwanie
  if (plan.deletes.length > 0) {
    log(`Usuwanie ${plan.deletes.length} zbędnych elementów...`)
    for (const delTask of plan.deletes) {
      try {
        const stats = await fs.promises.stat(delTask.localPath)
        if (stats.isDirectory())
          await fs.promises.rm(delTask.localPath, { recursive: true, force: true })
        else await fs.promises.unlink(delTask.localPath)
      } catch {
        /* ignore */
      }
    }
  }

  // UI
  const updateUI = (): void => {
    const now = Date.now()
    const timeDiff = now - lastSpeedCalcTime
    if (timeDiff > 1000) {
      const bytesInWindow = globalProgress.downloadedSizeBase - lastBytesForSpeed
      const instantSpeed = (bytesInWindow < 0 ? 0 : bytesInWindow) / timeDiff
      currentSpeed =
        currentSpeed === 0
          ? instantSpeed
          : currentSpeed * (1 - SMOOTHING_FACTOR) + instantSpeed * SMOOTHING_FACTOR
      lastSpeedCalcTime = now
      lastBytesForSpeed = globalProgress.downloadedSizeBase
    }
    let remainingText = '...'
    if (currentSpeed > 0) {
      const remainingBytes = globalProgress.totalSize - globalProgress.downloadedSizeBase
      const sec = Math.ceil(Math.max(0, remainingBytes / currentSpeed) / 1000)
      remainingText = `${Math.floor(sec / 60)}m ${sec % 60}s`
    }
    const percent =
      globalProgress.totalSize > 0
        ? Math.floor((globalProgress.downloadedSizeBase / globalProgress.totalSize) * 100)
        : 100
    log(
      `Pobieranie: ${byteToMB(globalProgress.downloadedSizeBase)}/${byteToMB(globalProgress.totalSize)} MB (${percent}%) • ETA: ${remainingText}`
    )
  }

  // Reconnect
  const handleReconnect = async (): Promise<void> => {
    if (reconnectPromise) {
      await reconnectPromise
      return
    }
    reconnectPromise = (async () => {
      await state.client.end().catch(() => {})
      await new Promise((r) => setTimeout(r, 2000))
      const newClient = await connect()
      state.client = newClient
      return newClient
    })()
    try {
      await reconnectPromise
    } finally {
      reconnectPromise = null
    }
  }

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
      for (let attempt = 0; attempt < 3 && !success; attempt++) {
        if (signal.aborted) return
        try {
          await state.client.fastGet(task.remotePath, task.localPath, { step: fileStep })

          if (task.isZip && task.targetDir) {
            Logger.log(`[ZIP] Rozpakowywanie ${task.fileName}...`)
            const zip = new AdmZip(task.localPath)
            const folderName = task.fileName.replace('.zip', '')
            const extractionPath = join(task.targetDir, folderName)
            await fs.promises.mkdir(extractionPath, { recursive: true })
            zip.extractAllTo(extractionPath, true)
            await fs.promises.unlink(task.localPath)

            if (task.zipHash) {
              const folderName = task.fileName.replace('.zip', '')
              const extractedFolderPath = join(task.targetDir, folderName)
              const markerPath = join(extractedFolderPath, '.ziphash')
              if (await fileExists(extractedFolderPath)) {
                await fs.promises.writeFile(markerPath, task.zipHash)
              }
            }
          }
          success = true
        } catch (err: any) {
          const msg = err.message || String(err)
          if (msg.match(/(socket|closed|timeout)/i)) {
            await handleReconnect()
            attempt--
          } else await new Promise((r) => setTimeout(r, 1000))
        }
      }
      if (!success) throw new Error(`Failed: ${task.fileName}`)
      globalProgress.completedFiles++
    }
  }

  const activeWorkers: Promise<void>[] = []
  for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, plan.downloads.length); i++) {
    activeWorkers.push(downloadWorker())
  }
  await Promise.all(activeWorkers)
}

// --- 4. FUNKCJA STARTOWA ---

export async function copyMCFiles(
  isDev: boolean,
  gameMode: string,
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

    const currentVersionFolder =
      gameMode === 'Pokemons' ? (isDev ? 'dev-mc' : 'mc') : gameMode.toLowerCase()

    const globalProgress: GlobalProgress = {
      totalFiles: 0,
      completedFiles: 0,
      totalSize: 0,
      downloadedSizeBase: 0,
      startTime: 0
    }

    logToUI(`Weryfikacja plików${isDev ? ' (DEV)' : ''}...`)

    const globalHashes = await fetchGlobalManifest(state, localRoot)
    const plan: SyncPlan = { downloads: [], deletes: [], totalSize: 0 }
    const localTargetDir = localRoot

    await fs.promises.mkdir(localTargetDir, { recursive: true })

    const remoteList = await state.client.list(currentVersionFolder)
    const tasks: Promise<void>[] = []
    const remoteFilesSet = new Set<string>()

    // === GŁÓWNA PĘTLA ANALIZY (POPRAWIONA) ===
    for (const file of remoteList) {
      // 1. Pomiń pliki systemowe i manifesty
      if (['.', '..', '.hashes', '.meta.json', '.ziphash'].includes(file.name)) continue

      remoteFilesSet.add(file.name)

      // 2. Ustalanie klucza i wpisu w manifeście
      // Domyślny klucz: np. "dev-mc/mods" (dla folderu) lub "dev-mc/plik.txt"
      let lookupKey = `${currentVersionFolder}/${file.name}`
      let entry = globalHashes[lookupKey]
      let isMappedZip = false
      let extractedDirName = ''

      // 3. SPECIAL CASE: Obsługa plików .zip, które mapują się na foldery w manifeście
      // Np. widzimy "mods.zip", ale w manifeście jest "dev-mc/mods" z isZipped: true
      if (!entry && file.name.endsWith('.zip')) {
        const rawName = file.name.slice(0, -4) // usuń .zip
        const rawKey = `${currentVersionFolder}/${rawName}`
        const rawEntry = globalHashes[rawKey]

        if (rawEntry?.isZipped) {
          entry = rawEntry
          lookupKey = rawKey // Używamy klucza folderu do weryfikacji hasha
          isMappedZip = true // Oznaczamy, że to zip do rozpakowania
          extractedDirName = rawName
        }
      }

      // 4. Filtrowanie (ignore / important)
      let shouldProcess = true
      if (!entry) {
        // Opcjonalnie: Pomiń nieznane pliki .zip, które nie są mapowane
        if (file.name.endsWith('.zip') && !isMappedZip) shouldProcess = false
        // Jeśli plik nie jest w manifeście w ogóle, domyślnie go pobieramy (chyba że chcesz inaczej)
      } else {
        if (entry.flag === 'ignore') shouldProcess = false
        else if (!isFirstInstall && entry.flag !== 'important') shouldProcess = false
      }

      if (!shouldProcess) continue

      const itemRemotePath = posix.join(currentVersionFolder, file.name)
      const itemLocalPath = posix.join(localTargetDir, file.name)

      // === SCENARIUSZ A: To jest ZIP odpowiadający folderowi (np. mods.zip) ===
      if (isMappedZip) {
        tasks.push(
          (async () => {
            let need = true
            // Ścieżka do ROZPAKOWANEGO folderu (np. mcfiles/mods)
            const extractedFolderPath = posix.join(localTargetDir, extractedDirName)
            const marker = posix.join(extractedFolderPath, '.ziphash')

            // Sprawdzamy czy folder istnieje i czy hash zipa się zgadza
            if (await fileExists(extractedFolderPath)) {
              if (entry.zipHash) {
                try {
                  const localH = await fs.promises.readFile(marker, 'utf8')
                  if (localH.trim() === entry.zipHash.trim()) need = false
                  else Logger.log(`[UPDATE] Zmiana hasha dla zipa: ${extractedDirName}`)
                } catch {
                  need = true // Brak markera = ponowne pobranie
                }
              } else {
                need = false // Brak hasha w manifeście = zakładamy że jest ok
              }
            } else {
              Logger.log(`[NEW] Nowy moduł (zip): ${extractedDirName}`)
            }

            if (need) {
              plan.downloads.push({
                type: 'download',
                remotePath: itemRemotePath, // dev-mc/mods.zip
                localPath: itemLocalPath, // mcfiles/mods.zip (tymczasowo)
                size: file.size,
                fileName: file.name, // mods.zip
                isZip: true,
                targetDir: localTargetDir, // Rozpakuj do mcfiles/
                zipHash: entry.zipHash
              })
              plan.totalSize += file.size
            }
          })()
        )
        continue // Zrobione, idziemy do następnego pliku
      }

      // === SCENARIUSZ B: To jest FOLDER (np. mods/) ===
      if (isSftpDir(file.type)) {
        // Jeśli folder ma być zippowany (isZipped), a my jesteśmy tutaj,
        // to znaczy, że albo nie znaleźliśmy zipa, albo zip zostanie obsłużony w innej iteracji.
        // Zazwyczaj ignorujemy folder "źródłowy" jeśli spodziewamy się zipa,
        // chyba że na serwerze są rozpakowane pliki zamiast zipa.
        // W Twoim przypadku (manifest ma zipHash) zakładamy obsługę przez SCENARIUSZ A.
        if (entry?.isZipped) {
          // SKIP: Czekamy na plik .zip w pętli lub go nie ma.
          continue
        }

        // Tutaj ewentualna logika dla zwykłych folderów (recursive), jeśli potrzebna
        continue
      }

      // === SCENARIUSZ C: Zwykły plik (nie-zip lub nie-mapowany zip) ===
      if (isSftpFile(file.type)) {
        tasks.push(
          (async () => {
            let need = true
            if (entry?.hash && (await fileExists(itemLocalPath))) {
              const h = await getFileHash(itemLocalPath)
              if (h === entry.hash) need = false
            } else if (!entry?.hash && (await fileExists(itemLocalPath))) {
              need = false
            }

            if (need) {
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
        )
      }
    }
    // === KONIEC PĘTLI ===

    await Promise.all(tasks)

    // Cleanup (bez zmian, logika jest poprawna)
    if (!isFirstInstall) {
      try {
        const lFiles = await fs.promises.readdir(localTargetDir, { withFileTypes: true })
        for (const lf of lFiles) {
          if (['.hashes', '.ziphash', '.mcfiles_installed'].includes(lf.name)) continue

          // Spróbuj znaleźć dopasowanie w haszach
          const keyDirect = `${currentVersionFolder}/${lf.name}`
          const entDirect = globalHashes[keyDirect]

          // Ważne: Jeśli lokalnie mamy folder "mods", a w hashu jest on oznaczony isZipped,
          // to nie usuwamy go, mimo że remoteFilesSet może zawierać tylko "mods.zip"
          if (entDirect?.isZipped && lf.isDirectory()) continue
          if (entDirect?.flag === 'ignore') continue

          // Jeśli plik/folder nie istnieje na serwerze (ani jako zip, ani wprost) -> usuń
          // Musimy sprawdzić, czy nazwa pliku (np. mods) nie przyszła jako mods.zip
          const zipName = `${lf.name}.zip`
          if (!remoteFilesSet.has(lf.name) && !remoteFilesSet.has(zipName)) {
            const p = posix.join(localTargetDir, lf.name)
            if (lf.isDirectory()) plan.deletes.push({ localPath: p })
            else plan.deletes.push({ localPath: p })
          }
        }
      } catch {
        /* ignore */
      }
    }

    if (signal.aborted) return 'stop'

    Logger.log(`Plan: ${plan.downloads.length} plików do pobrania.`)

    if (plan.downloads.length > 0 || plan.deletes.length > 0) {
      await executeSyncPlan(state, ftpService.connect, plan, logToUI, signal, globalProgress)
    } else {
      logToUI('Pliki są aktualne.')
    }

    if (signal.aborted) return 'stop'

    if (isFirstInstall) {
      await fs.promises.writeFile(markerFile, 'installed')
    }

    logToUI('', true)
    return 'done'
  } catch (err) {
    Logger.error(err)
    logToUI(`Błąd aktualizacji: ${err}`, true)
  } finally {
    try {
      await state?.client.end()
    } catch {
      /* ignore */
    }
  }
  return
}
