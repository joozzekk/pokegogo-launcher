import ftp from 'basic-ftp'
import { app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath)
    return true
  } catch {
    return false
  }
}

async function safeCd(client: ftp.Client, dir: string): Promise<boolean> {
  try {
    await client.cd(dir)
    return true
  } catch (e) {
    console.error(`Nie można wejść do katalogu: ${dir}`, e)
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
      const [fileName, fileHash] = line.split(' ')
      if (fileName && fileHash) {
        map[fileName] = fileHash
      }
    }
    return map
  } catch {
    // Plik nie istnieje lub błąd odczytu - traktujemy jak pusty
    return {}
  }
}

async function downloadAll(
  client: ftp.Client,
  remoteDir: string,
  localDir: string,
  log: (data: string, isEnded?: boolean) => void,
  isFirstInstall: boolean,
  importantFolders: string[],
  signal: AbortSignal
): Promise<void> {
  if (signal.aborted) {
    return
  }

  await fs.promises.mkdir(localDir, { recursive: true })
  const changed = await safeCd(client, remoteDir)
  if (!changed) return

  const localHashes = await readHashesFile(localDir)
  const list = await client.list()

  let downloadedFiles = 0
  const totalFiles = list.filter((f) => !f.isDirectory).length

  for (const file of list) {
    if (signal.aborted) {
      return // stop downloading if aborted
    }

    const remotePath = path.posix.join(remoteDir, file.name)
    const localPath = path.join(localDir, file.name)

    if (file.isDirectory) {
      await downloadAll(
        client,
        remotePath,
        localPath,
        log,
        isFirstInstall,
        importantFolders,
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
        log(`Pobrano ${downloadedFiles}/${totalFiles} plików w ${remoteDir}`, true)
      }
    }
  }
}

export async function copyMCFiles(mainWindow: BrowserWindow, signal: AbortSignal): Promise<any> {
  const client = new ftp.Client(1000 * 120)
  const localRoot = path.join(app.getPath('userData'), 'mcfiles')
  const markerFile = path.join(localRoot, '.mcfiles_installed')
  const importantFolders = ['mods', 'versions', 'resourcepacks', 'datapacks', 'config']

  try {
    const isFirstInstall = !(await fileExists(markerFile))

    await client.access({
      host: '57.128.211.105',
      user: 'ftpuser',
      password: 'Ewenement2023$',
      secure: false
    })

    client.ftp.encoding = 'utf-8'
    client.ftp.verbose = true
    await client.send('OPTS UTF8 ON')

    const pwd = await client.pwd()
    const remoteURL = pwd + '/mc'

    await downloadAll(
      client,
      remoteURL,
      localRoot,
      (data: string) => {
        mainWindow.webContents.send('show-log', data)
      },
      isFirstInstall,
      importantFolders,
      signal
    )

    if (signal.aborted) {
      return 'stop'
    }

    if (isFirstInstall) {
      await fs.promises.writeFile(markerFile, 'installed')
    }

    mainWindow.webContents.send('show-log', '', true)
  } catch (err) {
    console.error(err)
  } finally {
    client.close()
  }
}
