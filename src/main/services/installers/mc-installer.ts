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

async function readHashesFile(localDir: string): Promise<Record<string, string>> {
  const hashesFilePath = posix.join(localDir, 'hashes.txt')
  try {
    const data = await fs.promises.readFile(hashesFilePath, 'utf8')
    const lines = data
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const map: Record<string, string> = {}
    for (const line of lines) {
      const lastSpaceIndex = line.lastIndexOf(' ')
      if (lastSpaceIndex === -1) continue
      const fileName = line.substring(0, lastSpaceIndex)
      const fileHash = line.substring(lastSpaceIndex + 1)
      if (fileName && fileHash) {
        map[fileName] = fileHash
      }
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
  importantFiles: string[],
  ignoreFiles: string[],
  signal: AbortSignal,
  globalProgress: GlobalProgress // Nowy parametr
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

  let localHashes: Record<string, string> = {}
  if (hasHashesFile) {
    localHashes = await readHashesFile(localDir)
  } else {
    localHashes = {}
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
      if (
        !isFirstInstall &&
        !importantFiles.some((importantFolder) => remotePath.includes(importantFolder))
      )
        continue

      dirsToRecurse.push({ remotePath, localPath })
    } else if (file.isFile) {
      if (file.name.endsWith('.sha256') || file.name === 'hashes.txt') continue

      if (!isFirstInstall && ignoreFiles.some((ignoredFile) => file.name.includes(ignoredFile)))
        continue

      let downloadFile = true

      // Sprawdzenie hasha lub istnienia pliku
      if (localHashes[file.name]) {
        try {
          const localHash = await getFileHash(localPath)
          if (localHash === localHashes[file.name]) {
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
      importantFiles,
      ignoreFiles,
      signal,
      globalProgress // Przekazanie stanu globalnego
    )
  }

  // --- 4. ETAP: Usuwanie lokalnych plików (logika z oryginalnego kodu) ---
  const dirents = await fs.promises.readdir(localDir, { withFileTypes: true })

  for (const dirent of dirents) {
    if (!dirent.isFile()) {
      continue // pomijamy katalogi i inne nie-pliki
    }

    const localFile = dirent.name

    if (localFile === 'hashes.txt' || localFile.endsWith('.sha256')) {
      continue // pomijamy kontrolne pliki
    }

    if (!localHashes[localFile]) {
      try {
        await fs.promises.unlink(posix.join(localDir, localFile))
        log(`Usunięto lokalny plik ${localFile}.`)
      } catch (err) {
        Logger.log(`PokeGoGo Launcher > Błąd podczas usuwania pliku ${localFile}: ${err}`)
      }
    }
  }

  // Usuwanie lokalnego hashes.txt (logika z oryginalnego kodu)
  try {
    await fs.promises.unlink(posix.join(localDir, 'hashes.txt'))
    Logger.log('PokeGoGo Launcher > Usunięto lokalny plik hashes.txt po synchronizacji.')
  } catch {
    // Ignorujemy błąd usuwania hashes.txt jeśli plik już nie istnieje
  }
}

export async function copyMCFiles(
  isDev: boolean,
  mainWindow: BrowserWindow,
  signal: AbortSignal
): Promise<string | undefined> {
  const { client, connect } = useFTPService()
  const localRoot = posix.join(app.getPath('userData'), 'mcfiles')
  const markerFile = posix.join(app.getPath('userData'), '.mcfiles_installed')
  const importantFiles = ['mods', 'versions', 'resourcepacks', 'datapacks', 'config', 'fancymenu']
  const ignoreFiles = ['options']

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
        mainWindow.webContents.send('launch:show-log', data)
      },
      isFirstInstall,
      importantFiles,
      ignoreFiles,
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

    mainWindow.webContents.send('launch:show-log', '', true)
  } catch (err) {
    Logger.error(err)
  } finally {
    client.close()
  }
  return
}
