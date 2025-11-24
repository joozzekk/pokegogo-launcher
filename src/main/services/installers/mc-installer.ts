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
  connect: () => Promise<Client>,
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
  } catch {
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
  let combinedHashes: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}
  // copy ancestor entries first (they are already keyed by remote path)
  Object.assign(combinedHashes, ancestorHashes)
  // then add local entries but keyed by their full remote path
  for (const [name, v] of Object.entries(localHashes)) {
    const fullRemoteKey = posix.join(remoteDir, name)
    combinedHashes[fullRemoteKey] = v
  }

  // If this is the first install, ignore remote hashes and force downloading everything.
  // Some deployments may include a hashes.txt but we still want to fetch all files
  // on the initial installation (marker file absent).
  if (isFirstInstall) {
    hasHashesFile = false
    combinedHashes = {}
  }

  let list
  try {
    list = await client.list()
  } catch {
    // Attempt reconnect on socket closed or other connection errors
    try {
      client = await connect()
      await safeCd(client, remoteDir)
      list = await client.list()
    } catch (e: unknown) {
      Logger.error('PokeGoGo Launcher > Failed to list directory ' + remoteDir + ': ' + String(e))
      return
    }
  }

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
        // We should recurse into this directory only if at least one referenced
        // important entry under this directory actually needs updating — i.e.
        // the remote hash differs from the local file hash OR the local file is missing.
        const dirRemotePath = posix.join(remoteDir, file.name)

        let shouldRecurse = false

        const keys = Object.keys(combinedHashes).filter((k) => {
          return k === dirRemotePath || k.startsWith(dirRemotePath + '/')
        })

        for (const k of keys) {
          const entry = combinedHashes[k]
          if (!entry || entry.flag !== 'important') continue

          // skip directory placeholder entries (hash === 'dir')
          if (entry.hash === 'dir') {
            // If parent folder itself is marked important:
            // - If there are nested hash entries under this dir, we'll evaluate them
            //   later in this loop (they appear as keys starting with dirRemotePath + '/').
            // - If there are NO nested entries, treat the directory itself as needing
            //   download/recurse (force update) when it's marked important.
            const nested = Object.keys(combinedHashes).some((kk) =>
              kk.startsWith(dirRemotePath + '/')
            )
            if (!nested) {
              // No nested entries -> force recurse (download whole dir)
              shouldRecurse = true
              break
            }

            // If local directory missing -> we need to recurse
            try {
              const localStat = await fs.promises.stat(posix.join(localDir, file.name))
              if (!localStat.isDirectory()) {
                shouldRecurse = true
                break
              }
            } catch {
              shouldRecurse = true
              break
            }

            // Otherwise there are nested entries and local directory exists; continue
            // to evaluate nested entries below.
            continue
          }

          // For nested file entries, map the remote key to local path and compare hashes
          const relative = k.substring(remoteDir.length + 1) // remove remoteDir + '/'
          const candidateLocalPath = posix.join(localDir, relative)
          try {
            await fs.promises.access(candidateLocalPath)
            const localHash = await getFileHash(candidateLocalPath)
            if (localHash !== entry.hash) {
              shouldRecurse = true
              break
            }
          } catch {
            // local file missing or unreadable -> needs download
            shouldRecurse = true
            break
          }
        }

        if (!shouldRecurse) continue
      }

      dirsToRecurse.push({ remotePath, localPath })
    } else if (file.isFile) {
      if (file.name.endsWith('.sha256') || file.name === 'hashes.txt') continue

      // If hashes.txt is present and not first install, skip files explicitly marked as 'ignore'.
      // Missing flag should NOT be treated as 'ignore' — only explicit 'ignore' skips on updates.
      if (!isFirstInstall && hasHashesFile) {
        const fileRemotePath = posix.join(remoteDir, file.name)
        const entry = combinedHashes[fileRemotePath]
        if (entry?.flag === 'ignore') continue
      }

      let downloadFile = true

      // Sprawdzenie hasha lub istnienia pliku
      const fileRemotePath = posix.join(remoteDir, file.name)
      const entry = combinedHashes[fileRemotePath]
      if (entry) {
        // If entry is present, compare hashes. For 'important' files we must download
        // only when hashes differ (or local file missing). For other entries the same
        // comparison applies: skip when hashes match, download otherwise.
        try {
          const localHash = await getFileHash(localPath)
          if (localHash === entry.hash) {
            downloadFile = false
            log(`Plik ${file.name} jest aktualny, pomijam pobieranie.`) // Opcjonalny log
          } else {
            downloadFile = true
          }
        } catch {
          // local missing or unreadable -> download
          downloadFile = true
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

    // Uruchamiamy pobieranie - z retry przy zamkniętym socketcie
    let downloaded = false
    for (let attempt = 0; attempt < 2 && !downloaded; attempt++) {
      try {
        await client.downloadTo(item.localPath, item.remotePath)
        downloaded = true
      } catch (err: unknown) {
        const msg = String((err as { message?: unknown })?.message ?? err)
        Logger.warn('PokeGoGo Launcher > download error: ' + msg)
        // If socket closed, try reconnect once
        if (msg.toLowerCase().includes('socket is closed') && attempt === 0) {
          try {
            client = await connect()
            await safeCd(client, remoteDir)
            // continue to retry
            continue
          } catch (reconErr) {
            Logger.error('PokeGoGo Launcher > Reconnect failed: ' + String(reconErr))
            throw reconErr
          }
        }
        throw err
      }
    }

    // Wyłączamy tracker po zakończeniu pobierania pliku
    try {
      client.trackProgress(undefined)
    } catch {
      /* ignore */
    }

    // Aktualizujemy globalny postęp *po* pomyślnym pobraniu pliku
    globalProgress.downloadedFiles++
    globalProgress.downloadedSize += item.size
  }

  // --- 3. ETAP: Rekurencja dla katalogów ---
  for (const dir of dirsToRecurse) {
    await downloadAll(
      client,
      connect,
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

  if (hasHashesFile) {
    for (const dirent of dirents) {
      if (!dirent.isFile()) continue

      const localFile = dirent.name

      if (!localHashes[localFile]) {
        try {
          await fs.promises.unlink(posix.join(localDir, localFile))
        } catch (err) {
          Logger.log(`PokeGoGo Launcher > Błąd podczas usuwania pliku ${localFile}: ${err}`)
        }
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
  const ftp = useFTPService()
  const localRoot = posix.join(app.getPath('userData'), 'mcfiles')
  const markerFile = posix.join(app.getPath('userData'), '.mcfiles_installed')
  // const importantFiles = ['mods', 'versions', 'resourcepacks', 'datapacks', 'config', 'fancymenu']
  // const ignoreFiles = ['options']

  let client: Client | undefined
  try {
    const isFirstInstall = !(await fileExists(markerFile))
    // Establish a fresh client instance and keep its reference locally.
    client = await ftp.connect()

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
      ftp.connect,
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

    return 'done'
  } catch (err) {
    Logger.error(err)
  } finally {
    try {
      if (client) {
        client.close()
      }
    } catch {
      /* ignore */
    }
  }
  return
}
