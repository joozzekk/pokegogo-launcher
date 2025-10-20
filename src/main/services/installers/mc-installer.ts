import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { Client } from 'basic-ftp'
import { safeCd, useFTP } from '../ftp-service'
import { app, BrowserWindow } from 'electron'

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
  const hashesFilePath = path.join(localDir, 'hashes.txt')
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

async function downloadAll(
  client: Client,
  remoteDir: string,
  localDir: string,
  log: (data: string, isEnded?: boolean) => void,
  isFirstInstall: boolean,
  importantFiles: string[],
  ignoreFiles: string[],
  signal: AbortSignal
): Promise<void> {
  if (signal.aborted) {
    return
  }

  await fs.promises.mkdir(localDir, { recursive: true })
  const changed = await safeCd(client, remoteDir)
  if (!changed) return

  const localHashesFile = path.join(localDir, 'hashes.txt')
  let hasHashesFile = false
  try {
    await client.downloadTo(localHashesFile, path.posix.join(remoteDir, 'hashes.txt'))
    hasHashesFile = true
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    console.log('PokeGoGo Launcher > Brak zdalnego hashes.txt, przyjmujemy pusty zestaw hashy')
    hasHashesFile = false
  }

  let localHashes: Record<string, string> = {}
  if (hasHashesFile) {
    localHashes = await readHashesFile(localDir)
  } else {
    localHashes = {}
  }

  const list = await client.list()

  let downloadedFiles = 0
  const totalFiles = list.filter((f) => !f.isDirectory).length

  for (const file of list) {
    if (signal.aborted) {
      return
    }

    const remotePath = path.posix.join(remoteDir, file.name)
    const localPath = path.join(localDir, file.name)

    if (
      file.isFile &&
      !isFirstInstall &&
      ignoreFiles.some((importantFile) => file.name.includes(importantFile))
    )
      continue

    if (file.isDirectory) {
      if (
        !isFirstInstall &&
        !importantFiles.some((importantFolder) => remotePath.includes(importantFolder))
      )
        continue

      await downloadAll(
        client,
        remotePath,
        localPath,
        log,
        isFirstInstall,
        importantFiles,
        ignoreFiles,
        signal
      )
    } else {
      if (file.name.endsWith('.sha256') || file.name === 'hashes.txt') continue

      let downloadFile = true

      if (localHashes[file.name]) {
        try {
          const localHash = await getFileHash(localPath)
          if (localHash === localHashes[file.name]) {
            downloadFile = false
            log(`Plik ${file.name} jest aktualny, pomijam pobieranie.`)
          }
        } catch {
          downloadFile = true
        }
      } else {
        try {
          await fs.promises.access(localPath)
          downloadFile = false
          log(`Plik ${file.name} istnieje lokalnie, pomijam pobieranie.`)
        } catch {
          downloadFile = true
        }
      }

      if (downloadFile) {
        await client.downloadTo(localPath, remotePath)
        downloadedFiles++
        log(`Pobrano ${downloadedFiles}/${totalFiles} plików w ${remoteDir}`)
      }
    }
  }

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
        await fs.promises.unlink(path.join(localDir, localFile))
        log(`Usunięto lokalny plik ${localFile}.`)
      } catch (err) {
        console.log(`PokeGoGo Launcher > Błąd podczas usuwania pliku ${localFile}: ${err}`)
      }
    }
  }

  try {
    await fs.promises.unlink(path.join(localDir, 'hashes.txt'))
    console.log('PokeGoGo Launcher > Usunięto lokalny plik hashes.txt po synchronizacji.')
  } catch {
    // Ignorujemy błąd usuwania hashes.txt jeśli plik już nie istnieje
  }
}

export async function copyMCFiles(
  mainWindow: BrowserWindow,
  signal: AbortSignal
): Promise<string | undefined> {
  const { client, connect } = useFTP()
  const localRoot = path.join(app.getPath('userData'), 'mcfiles')
  const markerFile = path.join(app.getPath('userData'), '.mcfiles_installed')
  const importantFiles = ['mods', 'versions', 'resourcepacks', 'datapacks', 'config', 'fancymenu']
  const ignoreFiles = ['options']

  try {
    const isFirstInstall = !(await fileExists(markerFile))

    await connect()

    const pwd = await client.pwd()
    const remoteURL = pwd + '/mc'

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
      signal
    )

    if (signal.aborted) {
      return 'stop'
    }

    if (isFirstInstall) await fs.promises.writeFile(markerFile, 'installed')

    mainWindow.webContents.send('launch:show-log', '', true)
  } catch (err) {
    console.error(err)
  } finally {
    client.close()
  }
  return
}
