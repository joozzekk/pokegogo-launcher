import fs from 'fs'
import { posix } from 'path'
import crypto from 'crypto'
import { Client } from 'basic-ftp'
import { safeCd, useFTPService } from '../ftp-service'
import { app, BrowserWindow } from 'electron'
import Logger from 'electron-log'

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

async function readHashesFile(
  localDir: string
): Promise<Record<string, { hash: string; flag?: 'important' | 'ignore' }>> {
  const hashesFilePath = posix.join(localDir, 'hashes.txt')
  try {
    const data = await fs.promises.readFile(hashesFilePath, 'utf8')
    const lines = data
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const map: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}
    for (const line of lines) {
      // Split by space but allow name to contain spaces. Format: <name> <hash> [flag]
      const parts = line.split(' ')
      if (parts.length < 2) continue

      let flag: 'important' | 'ignore' | undefined
      let hash = parts[parts.length - 1]
      let nameParts = parts.slice(0, parts.length - 1)

      const last = parts[parts.length - 1]
      if (last === 'important' || last === 'ignore') {
        flag = last as 'important' | 'ignore'
        if (parts.length < 3) continue
        hash = parts[parts.length - 2]
        nameParts = parts.slice(0, parts.length - 2)
      }

      const fileName = nameParts.join(' ').trim()
      if (fileName && hash) map[fileName] = { hash, flag }
    }
    return map
  } catch {
    return {}
  }
}

// Zmodyfikowana struktura globalProgress
interface GlobalProgress {
  totalFiles: number
  downloadedFiles: number
  totalSize: number // Całkowity rozmiar wszystkich plików w bajtach
  downloadedSize: number // Rozmiar pobranych plików w bajtach
  startTime: number
}

interface DownloadItem {
  remotePath: string
  localPath: string
  fileName: string
  size: number
}

// Kompletna funkcja downloadAll
async function downloadAll(
  client: Client,
  remoteDir: string,
  localDir: string,
  log: (data: string, isEnded?: boolean) => void,
  isFirstInstall: boolean,
  signal: AbortSignal,
  globalProgress: GlobalProgress, // Nowy parametr
  // ancestorHashes - map keyed by full remote path (posix) to allow
  // honoring flags set in parent folders (e.g. parent hashes.txt containing "folder/file ...")
  ancestorHashes: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}
): Promise<void> {
  if (signal.aborted) {
    return
  }

  await fs.promises.mkdir(localDir, { recursive: true })
  const changed = await safeCd(client, remoteDir)
  if (!changed) return

  // Pobieranie i wczytywanie pliku hashes.txt (bez zmian)
  const localHashesFile = posix.join(localDir, 'hashes.txt')
  let hasHashesFile = false
  try {
    await client.downloadTo(localHashesFile, posix.join(remoteDir, 'hashes.txt'))
    hasHashesFile = true
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    Logger.log('PokeGoGo Launcher > Brak zdalnego hashes.txt, przyjmujemy pusty zestaw hashy')
    hasHashesFile = false
  }

  let localHashes: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}
  if (hasHashesFile) {
    localHashes = await readHashesFile(localDir)
  } else {
    localHashes = {}
  }

  // Build a combined map keyed by full remote path so we can resolve entries
  // defined in parent hashes.txt files (they may reference nested paths like "mods/x.jar").
  const combinedHashes: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}
  // copy ancestor entries first (they are already keyed by remote path)
  Object.assign(combinedHashes, ancestorHashes)
  // then add local entries but keyed by their full remote path
  for (const [name, v] of Object.entries(localHashes)) {
    const fullRemoteKey = posix.join(remoteDir, name)
    combinedHashes[fullRemoteKey] = v
  }

  const list = await client.list()

  // Listy do przetworzenia
  const itemsToProcess: DownloadItem[] = []
  const dirsToRecurse: { remotePath: string; localPath: string }[] = []

  // --- 1. ETAP: Zbieranie informacji o plikach ---
  for (const file of list) {
    if (signal.aborted) return
    const remotePath = posix.join(remoteDir, file.name)
    const localPath = posix.join(localDir, file.name)

    if (file.isDirectory) {
      // If hashes.txt is missing, default to legacy behaviour: treat folder as important
      if (!isFirstInstall && hasHashesFile) {
        // Check if this directory (or any child inside it) is marked important.
        // Use combinedHashes keyed by full remote paths so parent entries referencing
        // nested files/folders are respected.
        const dirRemotePath = posix.join(remoteDir, file.name)
        const hasImportant = Object.keys(combinedHashes).some((k) => {
          return (
            (k === dirRemotePath || k.startsWith(dirRemotePath + '/')) &&
            combinedHashes[k].flag === 'important'
          )
        })
        if (!hasImportant) continue
      }

      dirsToRecurse.push({ remotePath, localPath })
    } else if (file.isFile) {
      if (file.name.endsWith('.sha256') || file.name === 'hashes.txt') continue

      // If hashes.txt is present and not first install, skip files marked as ignore.
      // Use combinedHashes keyed by full remote path to include parent references.
      if (!isFirstInstall && hasHashesFile) {
        const fileRemotePath = posix.join(remoteDir, file.name)
        const entry = combinedHashes[fileRemotePath]
        const flag = entry?.flag
        // default when flag missing is 'ignore'
        if (flag === 'ignore' || flag === undefined) continue
      }

      let downloadFile = true

      // Sprawdzenie hasha lub istnienia pliku
      const fileRemotePath = posix.join(remoteDir, file.name)
      const entry = combinedHashes[fileRemotePath]
      if (entry) {
        try {
          const localHash = await getFileHash(localPath)
          if (localHash === entry.hash) {
            downloadFile = false
            log(`Plik ${file.name} jest aktualny, pomijam pobieranie.`) // Opcjonalny log
          }
        } catch {
          downloadFile = true // Lokalny plik nie istnieje lub jest uszkodzony
        }
      } else {
        try {
          await fs.promises.access(localPath)
          // Plik istnieje lokalnie, ale nie ma go w hashu - zostanie usunięty na końcu
          downloadFile = false
          log(`Plik ${file.name} istnieje lokalnie (brak hasha), pomijam pobieranie.`) // Opcjonalny log
        } catch {
          downloadFile = true // Nie istnieje lokalnie, pobieramy
        }
      }

      if (downloadFile) {
        itemsToProcess.push({
          remotePath,
          localPath,
          fileName: file.name,
          size: file.size
        })
        globalProgress.totalFiles++ // Zliczanie globalne
        globalProgress.totalSize += file.size // Sumowanie rozmiaru globalnie
      }
    }
  }

  // Jeśli to pierwsze wywołanie i mamy co pobierać, startujemy zegar
  if (globalProgress.startTime === 0 && globalProgress.totalFiles > 0) {
    globalProgress.startTime = Date.now()
  }

  // --- 2. ETAP: Pobieranie plików ---
  for (const item of itemsToProcess) {
    if (signal.aborted) return

    // Ustawiamy tracker PRZED wywołaniem downloadTo
    client.trackProgress((info) => {
      // info.bytes -> bajty pobrane dla bieżącego pliku
      const totalElapsedMs = Date.now() - globalProgress.startTime

      // Całkowita pobrana kwota = (to co pobrano do tej pory) + (postęp bieżącego pliku)
      const totalDownloadedNow = globalProgress.downloadedSize + info.bytes

      let remainingTime = 'Oszacowywanie...'

      if (totalElapsedMs > 1000 && globalProgress.totalSize > 0) {
        const averageSpeedBps = totalDownloadedNow / (totalElapsedMs / 1000)

        if (averageSpeedBps > 0) {
          const remainingSize = globalProgress.totalSize - totalDownloadedNow
          const remainingSeconds = remainingSize / averageSpeedBps

          const hours = Math.floor(remainingSeconds / 3600)
          const minutes = Math.floor((remainingSeconds % 3600) / 60)
          const seconds = Math.floor(remainingSeconds % 60)

          const timeParts: string[] = []
          if (hours > 0) timeParts.push(`${hours}g`)
          if (minutes > 0) timeParts.push(`${minutes}m`)
          if (seconds >= 0) timeParts.push(`${seconds}s`)

          remainingTime = timeParts.join(' ')
        }
      }

      const globalProgressPercent =
        globalProgress.totalSize > 0
          ? ((totalDownloadedNow / globalProgress.totalSize) * 100).toFixed(0)
          : '0'

      const logMessage = `Pobieranie: (${globalProgress.downloadedFiles + 1}/${globalProgress.totalFiles}) - ${globalProgressPercent}% (Pozostało: ${remainingTime})`
      log(logMessage)
    })

    // Uruchamiamy pobieranie
    await client.downloadTo(item.localPath, item.remotePath)

    // Wyłączamy tracker po zakończeniu pobierania pliku
    client.trackProgress(undefined)

    // Aktualizujemy globalny postęp *po* pomyślnym pobraniu pliku
    globalProgress.downloadedFiles++
    globalProgress.downloadedSize += item.size
  }

  // --- 3. ETAP: Rekurencja dla katalogów ---
  for (const dir of dirsToRecurse) {
    await downloadAll(
      client,
      dir.remotePath,
      dir.localPath,
      log,
      isFirstInstall,
      signal,
      globalProgress, // Przekazanie stanu globalnego
      combinedHashes // Przekazanie mapy ancestorów (zawierającej pełne remote-path klucze)
    )
  }

  // --- 4. ETAP: Usuwanie lokalnych plików (logika z oryginalnego kodu) ---
  const dirents = await fs.promises.readdir(localDir, { withFileTypes: true })

  for (const dirent of dirents) {
    if (!dirent.isFile()) {
      continue
    }

    const localFile = dirent.name
    const remoteKey = posix.join(remoteDir, localFile)

    // Only delete local files that are not present in the combined hashes map
    // (which includes entries from parent hashes.txt files). This prevents
    // accidentally removing files that are referenced only from ancestor hashes.
    if (!combinedHashes[remoteKey]) {
      try {
        await fs.promises.unlink(posix.join(localDir, localFile))
        // log(`Usunięto lokalny plik ${localFile}.`)
      } catch (err) {
        Logger.log(`PokeGoGo Launcher > Błąd podczas usuwania pliku ${localFile}: ${err}`)
      }
    }
  }
}

export async function copyMCFiles(
  isDev: boolean,
  mainWindow: BrowserWindow,
  signal: AbortSignal,
  logHandlerName: string = 'launch:show-log'
): Promise<string | undefined> {
  const { client, connect } = useFTPService()
  const localRoot = posix.join(app.getPath('userData'), 'mcfiles')
  const markerFile = posix.join(app.getPath('userData'), '.mcfiles_installed')
  // const importantFiles = ['mods', 'versions', 'resourcepacks', 'datapacks', 'config', 'fancymenu']
  // const ignoreFiles = ['options']

  try {
    const isFirstInstall = !(await fileExists(markerFile))

    await connect()

    const pwd = await client.pwd()
    const remoteURL = posix.join(pwd, isDev ? 'dev-mc' : 'mc')

    // Inicjalizacja stanu globalnego
    const globalProgress: GlobalProgress = {
      totalFiles: 0,
      downloadedFiles: 0,
      totalSize: 0,
      downloadedSize: 0,
      startTime: 0
    }

    await downloadAll(
      client,
      remoteURL,
      localRoot,
      (data: string) => {
        mainWindow.webContents.send(logHandlerName, data)
      },
      isFirstInstall,
      signal,
      globalProgress // Przekazanie stanu
    )

    // ... (pozostała część funkcji)
    if (signal.aborted) {
      return 'stop'
    }

    if (isFirstInstall) {
      await fs.promises.writeFile(markerFile, 'installed')
      Logger.log('PokeGoGo Launcher > Created marker file')
    }

    mainWindow.webContents.send(logHandlerName, '', true)
  } catch (err) {
    Logger.error(err)
  } finally {
    client.close()
  }
  return
}
