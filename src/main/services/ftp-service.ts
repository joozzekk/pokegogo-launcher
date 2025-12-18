/* eslint-disable @typescript-eslint/no-explicit-any */
import Client from 'ssh2-sftp-client'
import { createHash } from 'crypto'
import { app, BrowserWindow, ipcMain } from 'electron'
import { mkdir, readdir, readFile, rm, unlink, writeFile } from 'fs/promises'
import { basename, dirname, join, posix } from 'path'
import { createWriteStream } from 'fs'
import archiver from 'archiver'

type FTPFileFlag = 'important' | 'ignore'

interface ManifestEntry {
  type: 'file' | 'dir'
  hash?: string
  flag?: FTPFileFlag
  isZipped?: boolean
  zipHash?: string
  lastSynced?: number
}

type ManifestMap = Record<string, ManifestEntry>

const remoteJoin = (...parts: string[]): string => posix.join(...parts.filter(Boolean))

const normalizePath = (p: string): string => p.replace(/\\/g, '/')

const isSftpDir = (type: string | undefined): boolean => type === 'd'

export const useFTPService = (): {
  client: Client | null
  connect: () => Promise<Client>
  createHandlers: (mainWindow: BrowserWindow) => void
} => {
  let clientInstance: Client | null = null
  let isConnecting = false

  const MANIFEST_FILE = '.hashes'

  const connect = async (): Promise<Client> => {
    if (isConnecting) {
      let attempts = 0
      while (isConnecting && attempts < 50) {
        await new Promise((r) => setTimeout(r, 100))
        if (clientInstance) return clientInstance
        attempts++
      }
    }

    if (clientInstance) {
      try {
        await clientInstance.cwd()
        return clientInstance
      } catch (e: any) {
        console.warn('SFTP: Reconnecting...', e.message)
        try {
          await clientInstance.end()
        } catch {
          /* ignore */
        }
      }
    }

    isConnecting = true
    const c = new Client()

    try {
      await c.connect({
        host: import.meta.env.VITE_FTP_HOST,
        port: 22,
        username: import.meta.env.VITE_FTP_USER,
        password: import.meta.env.VITE_FTP_PASS,
        readyTimeout: 30000,
        keepaliveInterval: 2000,
        keepaliveCountMax: 5
      })

      c.on('close', () => {
        clientInstance = null
      })
      c.on('end', () => {
        clientInstance = null
      })
      c.on('error', (err) => {
        console.error('SFTP Error', err)
        clientInstance = null
      })

      clientInstance = c
      return c
    } catch (e) {
      clientInstance = null
      throw e
    } finally {
      isConnecting = false
    }
  }

  const ManifestManager = {
    async load(client: Client, rootPath: string): Promise<ManifestMap> {
      const tempPath = join(process.cwd(), 'tmp', `manifest_${Date.now()}.json`)
      const remotePath = remoteJoin(rootPath, MANIFEST_FILE)

      try {
        await client.get(remotePath, tempPath)
        const content = await readFile(tempPath, 'utf-8')
        await unlink(tempPath)
        return JSON.parse(content)
      } catch {
        try {
          await unlink(tempPath)
        } catch {
          /* ignore */
        }
        return {}
      }
    },

    async save(client: Client, rootPath: string, map: ManifestMap): Promise<void> {
      const tempPath = join(process.cwd(), 'tmp', `manifest_save_${Date.now()}.json`)
      const remotePath = remoteJoin(rootPath, MANIFEST_FILE)

      await writeFile(tempPath, JSON.stringify(map, null, 2))
      await client.put(tempPath, remotePath)
      await unlink(tempPath)
    },

    async updateEntry(
      client: Client,
      rootPath: string,
      path: string,
      data: Partial<ManifestEntry>
    ) {
      const map = await this.load(client, rootPath)

      // Normalizacja klucza (ścieżka relatywna od roota)
      const key = normalizePath(path)

      map[key] = {
        ...(map[key] || { type: 'file' }),
        ...data,
        lastSynced: Date.now()
      }

      await this.save(client, rootPath, map)
      return map
    }
  }

  const createHandlers = (mainWindow: BrowserWindow): void => {
    ipcMain.handle('ftp:create-folder', async (_, folder, newFolder) => {
      const client = await connect()
      const fullPath = remoteJoin(folder, newFolder)
      await client.mkdir(fullPath, true)
      await ManifestManager.updateEntry(client, '.', fullPath, { type: 'dir' })
      return true
    })

    ipcMain.handle('ftp:list-files', async (_, folder: string) => {
      const client = await connect()
      const rootPath = '.'
      const fullPath = remoteJoin(rootPath, folder)

      const [list, manifest] = await Promise.all([
        client.list(fullPath),
        ManifestManager.load(client, rootPath)
      ])

      return list.map((file) => {
        const relativeFilePath = normalizePath(remoteJoin(folder, file.name))
        const meta = manifest[relativeFilePath] || {}

        let status = 'normal'

        if (file.type === 'd') {
          if (meta.isZipped) {
            status = 'zipped'

            const filesInFolder = Object.keys(manifest).filter((k) =>
              k.startsWith(relativeFilePath + '/')
            )

            const folderLastSynced = meta.lastSynced || 0

            const hasNewFiles = filesInFolder.some((fileKey) => {
              const fileEntry = manifest[fileKey]
              return (fileEntry.lastSynced || 0) > folderLastSynced
            })

            if (hasNewFiles) {
              status = 'zipped-dirty'
            }
          }
        }

        return {
          name: file.name,
          size: file.size,
          isDirectory: file.type === 'd',
          lastModifiedAt: file.modifyTime ? new Date(file.modifyTime) : null,
          flag: meta.flag,
          isZipped: meta.isZipped || false,
          status: status,
          hash: meta.hash
        }
      })
    })

    async function computeHash(buffer: Buffer): Promise<string> {
      const hash = createHash('sha256')
      hash.update(Buffer.from(buffer))
      return hash.digest('hex')
    }

    function parseHashesContent(
      data: string
    ): Record<string, { hash: string; flag?: FTPFileFlag }> {
      const map: Record<string, { hash: string; flag?: FTPFileFlag }> = {}
      data
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((line) => {
          const parts = line.split(' ')
          if (parts.length < 2) return
          const last = parts[parts.length - 1]
          let flag: FTPFileFlag | undefined
          let hash = parts[parts.length - 1]
          let nameParts = parts.slice(0, parts.length - 1)

          if (last === 'important' || last === 'ignore') {
            flag = last as FTPFileFlag
            if (parts.length < 3) return
            hash = parts[parts.length - 2]
            nameParts = parts.slice(0, parts.length - 2)
          }

          const name = nameParts.join(' ').trim()
          if (name && hash) map[name] = { hash, flag }
        })

      return map
    }

    function serializeHashes(map: Record<string, { hash: string; flag?: FTPFileFlag }>): string {
      return Object.entries(map)
        .map(([name, v]) => `${name} ${v.hash}${v.flag ? ' ' + v.flag : ''}`)
        .join('\n')
    }

    ipcMain.handle(
      'ftp:upload-file',
      async (_, folder: string, buffer: ArrayBuffer, fileName: string) => {
        const buf = Buffer.from(buffer)
        const tempFilePath = join(process.cwd(), 'tmp', fileName)
        await writeFile(tempFilePath, buf)

        const client = await connect()
        const rootPath = '.'
        const remotePath = remoteJoin(folder, fileName)
        const relativePath = normalizePath(remotePath)

        try {
          await client.put(tempFilePath, remotePath)

          const hash = await computeHash(buf)

          await ManifestManager.updateEntry(client, rootPath, relativePath, {
            type: 'file',
            hash: hash
          })
        } finally {
          await unlink(tempFilePath).catch(() => {})
        }
        return true
      }
    )

    function groupFilesByDirectory(files: any[]): Map<string, any[]> {
      const directoryMap = new Map<string, any[]>()

      for (const file of files) {
        const normalizedPath = file.path.replace(/\\/g, '/')
        const dir = dirname(normalizedPath)

        if (!directoryMap.has(dir)) {
          directoryMap.set(dir, [])
        }
        directoryMap.get(dir)!.push({ ...file, path: normalizedPath })
      }
      return directoryMap
    }

    async function loadRemoteHashes(
      remoteDir: string,
      localTempPath: string
    ): Promise<Record<string, { hash: string; flag?: FTPFileFlag }>> {
      const client = await connect()
      const hashes: Record<string, { hash: string; flag?: FTPFileFlag }> = {}
      const remoteHashesPath = remoteJoin(remoteDir, 'hashes.txt')

      try {
        await client.get(remoteHashesPath, localTempPath)
        const data = await readFile(localTempPath, 'utf-8')
        Object.assign(hashes, parseHashesContent(data))
        await unlink(localTempPath)
      } catch {
        try {
          await unlink(localTempPath)
        } catch {
          /* ignore */
        }
      }
      return hashes
    }

    ipcMain.handle(
      'ftp:upload-folder',
      async (_, folder: string, files: any[], currentFile: number) => {
        const tmpDir = join(process.cwd(), 'tmp')
        const localHashesPath = join(tmpDir, 'hashes.temp.txt')
        const localUploadTempPath = join(tmpDir, 'upload.temp.bin')

        try {
          const client = await connect()
          const pwd = await client.cwd()
          const baseRemoteDir = remoteJoin(pwd, folder)

          const filesByDir = groupFilesByDirectory(files)
          let fileIndex = currentFile

          for (const [relativeDir, filesInDir] of filesByDir.entries()) {
            const currentRemoteDir =
              relativeDir === '.' ? baseRemoteDir : remoteJoin(baseRemoteDir, relativeDir)

            try {
              await client.mkdir(currentRemoteDir, true)
            } catch (e: any) {
              if (e.code !== 4 && e.code !== 'EEXIST') {
                console.error(`Error creating dir ${currentRemoteDir}`, e)
              }
            }

            const hashes = await loadRemoteHashes(currentRemoteDir, localHashesPath)
            let hashesChanged = false

            for (const file of filesInDir) {
              const { path: normalizedPath, buffer } = file
              const fileName = basename(normalizedPath)
              const fileHash = await computeHash(buffer)

              await writeFile(localUploadTempPath, Buffer.from(buffer))

              try {
                await client.put(localUploadTempPath, remoteJoin(currentRemoteDir, fileName))
                mainWindow.webContents.send('ftp:upload-folder-progress', ++fileIndex)
              } catch (e) {
                await unlink(localUploadTempPath)
                throw e
              }

              hashes[fileName] = { hash: fileHash, flag: hashes[fileName]?.flag ?? 'ignore' }
              hashesChanged = true

              await unlink(localUploadTempPath)
            }

            if (hashesChanged) {
              const hashesContent = serializeHashes(hashes)
              await writeFile(localHashesPath, hashesContent)
              await client.put(localHashesPath, remoteJoin(currentRemoteDir, 'hashes.txt'))
              await unlink(localHashesPath)
            }
          }

          return true
        } catch (error) {
          try {
            await unlink(localHashesPath)
          } catch {
            /* ignore */
          }
          try {
            await unlink(localUploadTempPath)
          } catch {
            /* ignore */
          }
          throw error
        }
      }
    )

    ipcMain.handle('ftp:remove-file', async (_, folder: string, fileName: string) => {
      const client = await connect()
      const rootPath = '.'
      const fullPath = remoteJoin(folder, fileName)
      const relativePath = normalizePath(fullPath)

      // Sprawdź czy to katalog czy plik
      const isDir = (await client.stat(fullPath)).isDirectory

      if (isDir) {
        await client.rmdir(fullPath, true) // recursive delete
      } else {
        await client.delete(fullPath)
      }

      // Aktualizacja manifestu - usuń wpis i wszystkie dzieci (jeśli folder)
      const map = await ManifestManager.load(client, rootPath)

      if (map[relativePath]) {
        delete map[relativePath]
      }

      // Jeśli to był folder, usuń wszystko co zaczynało się od tej ścieżki
      if (isDir) {
        Object.keys(map).forEach((key) => {
          if (key.startsWith(relativePath + '/')) {
            delete map[key]
          }
        })
      }

      await ManifestManager.save(client, rootPath, map)
      return true
    })

    ipcMain.handle('ftp:read-file', async (_, folder: string, name: string) => {
      const tempFilePath = join(process.cwd(), 'tmp', name)
      const client = await connect()

      // eslint-disable-next-line no-useless-catch
      try {
        await client.get(remoteJoin(folder, name), tempFilePath)
        const fileContent = (await readFile(tempFilePath)).toString('utf8')
        await unlink(tempFilePath)
        return fileContent
      } catch (e) {
        throw e
      }
    })

    ipcMain.handle('ftp:get-hash-entries', async (_, folder) => {
      const client = await connect()
      const tmpHashesPath = join(process.cwd(), 'tmp', 'hashes.txt')
      let remoteMissing = false
      const map: Record<string, { hash: string; flag?: FTPFileFlag }> = {}
      try {
        await client.get(remoteJoin(folder, 'hashes.txt'), tmpHashesPath)
        const data = await readFile(tmpHashesPath, 'utf-8')
        Object.assign(map, parseHashesContent(data))
        await unlink(tmpHashesPath)
      } catch {
        remoteMissing = true
        try {
          await unlink(tmpHashesPath)
        } catch {
          /* ignore */
        }
      }
      return { entries: map, missing: remoteMissing }
    })

    ipcMain.handle(
      'ftp:set-hash-flag',
      async (_, folder: string, name: string, flag: FTPFileFlag | null) => {
        const client = await connect()
        const rootPath = '.'
        const relativePath = normalizePath(remoteJoin(folder, name))

        const map = await ManifestManager.load(client, rootPath)

        if (!map[relativePath]) {
          // Jeśli wpisu nie ma (np. plik wgrany ręcznie poza aplikacją),
          // musimy go dodać, ale nie mamy hasha bez pobierania.
          // Można go oznaczyć jako 'pending' lub pobrać hash.
          // Dla wydajności - tylko dodajemy wpis z flagą.
          map[relativePath] = { type: 'file' }
        }

        if (flag === null) {
          delete map[relativePath].flag
        } else {
          map[relativePath].flag = flag
        }

        await ManifestManager.save(client, rootPath, map)
        return true
      }
    )

    ipcMain.handle('ftp:zip-folder', async (event, folderPath: string) => {
      const client = await connect()
      const rootPath = '.'
      const fullRemotePath = remoteJoin(rootPath, folderPath)

      const folderName = basename(folderPath)
      const tempDir = join(process.cwd(), 'tmp', `zip_stage_${Date.now()}`)
      const zipFileName = `${folderName}.zip`
      const tempZipPath = join(process.cwd(), 'tmp', zipFileName)

      // Helper do wysyłania postępu
      const sendProgress = (percent: number, message: string): void => {
        // Zabezpieczenie przed wysłaniem po zamknięciu okna
        if (!event.sender.isDestroyed()) {
          event.sender.send('ftp:zip-progress', { percent, message })
        }
      }

      try {
        // --- FAZA 1: POBIERANIE (0% - 30%) ---
        sendProgress(0, `Pobieranie plików z folderu ${folderName}...`)

        await mkdir(tempDir, { recursive: true })

        // downloadDir nie ma wbudowanego progress callback w tej wersji biblioteki,
        // więc symulujemy start.
        await client.downloadDir(fullRemotePath, tempDir)

        sendProgress(30, 'Pakowanie plików...')

        // --- FAZA 2: PAKOWANIE (30% - 40%) ---
        await new Promise<void>((resolve, reject) => {
          const output = createWriteStream(tempZipPath)
          const archive = archiver('zip', { zlib: { level: 9 } })

          output.on('close', resolve)
          archive.on('error', reject)

          // Możemy nasłuchiwać postępu pakowania, ale jest to bardzo szybkie
          archive.on('progress', (progress) => {
            // Opcjonalnie: mikro-aktualizacje w zakresie 30-40%
            const percent = 30 + (progress.entries.processed / progress.entries.total) * 10
            sendProgress(percent, `Pakowanie: ${Math.round(percent)}%`)
          })

          archive.pipe(output)
          archive.directory(tempDir, false)
          archive.finalize()
        })

        sendProgress(40, 'Przygotowywanie do wysyłki...')

        // --- FAZA 3: UPLOAD ZIPA (40% - 100%) ---
        const parentRemoteDir = dirname(fullRemotePath)
        const remoteZipPath = remoteJoin(parentRemoteDir, zipFileName)

        // ZMIANA: Używamy fastPut zamiast put
        await client.fastPut(tempZipPath, remoteZipPath, {
          step: (total_transferred, _, total) => {
            const uploadPercent = total_transferred / total // 0.0 do 1.0

            // Skalujemy to do zakresu 40-100% ogólnego paska
            const totalPercent = Math.round(40 + uploadPercent * 60)

            sendProgress(totalPercent, `Wysyłanie archiwum: ${Math.round(uploadPercent * 100)}%`)
          }
        })

        sendProgress(95, 'Weryfikacja i aktualizacja manifestu...')

        // --- FAZA 4: MANIFEST I CZYSZCZENIE ---
        const zipBuffer = await readFile(tempZipPath)
        const zipHash = await computeHash(zipBuffer)

        const manifest = await ManifestManager.load(client, rootPath)
        const relativeFolderPath = normalizePath(folderPath)

        manifest[relativeFolderPath] = {
          ...(manifest[relativeFolderPath] || { type: 'dir' }),
          type: 'dir',
          isZipped: true,
          zipHash: zipHash,
          lastSynced: Date.now()
        }

        await ManifestManager.save(client, rootPath, manifest)

        sendProgress(100, 'Zakończono!')
        return true
      } catch (e) {
        console.error('Zip error', e)
        throw e
      } finally {
        try {
          await rm(tempDir, { recursive: true, force: true })
          await unlink(tempZipPath)
        } catch {
          /* ignore */
        }
      }
    })

    ipcMain.handle(
      'ftp:set-hash-flag-folder',
      async (
        _: any,
        folder: string,
        folderName: string,
        flag?: FTPFileFlag | null,
        operationId?: string
      ) => {
        const client = await connect()
        const targetPath = remoteJoin(folder, folderName)

        const countFiles = async (ftpPath: string): Promise<number> => {
          let total = 0
          try {
            const list = await client.list(ftpPath)
            for (const item of list) {
              const childPath = remoteJoin(ftpPath, item.name)
              if (isSftpDir(item.type)) {
                total += await countFiles(childPath)
              } else {
                total += 1
              }
            }
          } catch {
            /* ignore */
          }
          return total
        }

        const tmpHashesPath = join(process.cwd(), 'tmp', 'hashes.txt')
        const tmpFilePath = join(process.cwd(), 'tmp', 'file.temp')

        let totalFiles = 0
        try {
          totalFiles = await countFiles(targetPath)
        } catch {
          totalFiles = 0
        }

        let processed = 0

        const traverseAndUpdate = async (ftpPath: string): Promise<void> => {
          try {
            const list = await client.list(ftpPath)
            const hashes: Record<string, { hash: string; flag?: FTPFileFlag }> = {}

            try {
              await client.get(remoteJoin(ftpPath, 'hashes.txt'), tmpHashesPath)
              const data = await readFile(tmpHashesPath, 'utf-8')
              Object.assign(hashes, parseHashesContent(data))
              await unlink(tmpHashesPath)
            } catch {
              try {
                await unlink(tmpHashesPath)
              } catch {
                /* ignore */
              }
            }

            let hashesChanged = false

            for (const item of list) {
              const childPath = remoteJoin(ftpPath, item.name)
              if (isSftpDir(item.type)) {
                await traverseAndUpdate(childPath)
              } else {
                if (!hashes[item.name]) {
                  try {
                    await client.get(childPath, tmpFilePath)
                    const content = await readFile(tmpFilePath)
                    const h = createHash('sha256')
                    h.update(content)
                    hashes[item.name] = { hash: h.digest('hex') }
                    await unlink(tmpFilePath)
                  } catch {
                    try {
                      await unlink(tmpFilePath)
                    } catch {
                      /* ignore */
                    }
                  }
                }

                if (hashes[item.name]) {
                  if (flag === null || flag === undefined) {
                    if (hashes[item.name].flag !== undefined) {
                      delete hashes[item.name].flag
                      hashesChanged = true
                    }
                  } else {
                    if (hashes[item.name].flag !== flag) {
                      hashes[item.name].flag = flag
                      hashesChanged = true
                    }
                  }

                  processed++
                  try {
                    mainWindow.webContents.send('ftp:set-flag-folder-progress', {
                      id: operationId,
                      total: totalFiles,
                      completed: processed,
                      current: childPath
                    })
                  } catch {
                    /* ignore */
                  }
                }
              }
            }

            if (hashesChanged) {
              const content = serializeHashes(hashes)
              await writeFile(tmpHashesPath, content)
              try {
                await client.put(tmpHashesPath, remoteJoin(ftpPath, 'hashes.txt'))
              } catch {
                /* ignore */
              }
              try {
                await unlink(tmpHashesPath)
              } catch {
                /* ignore */
              }
            }
          } catch {
            // ignore dir errors
          }
        }

        // eslint-disable-next-line no-useless-catch
        try {
          await traverseAndUpdate(targetPath)

          try {
            const parentHashesMap: Record<string, { hash: string; flag?: FTPFileFlag }> = {}
            try {
              await client.get(remoteJoin(folder, 'hashes.txt'), tmpHashesPath)
              const data = await readFile(tmpHashesPath, 'utf-8')
              Object.assign(parentHashesMap, parseHashesContent(data))
            } catch {
              /* ignore */
            }

            if (!parentHashesMap[folderName]) {
              parentHashesMap[folderName] = { hash: 'dir' }
            }

            if (flag === null || flag === undefined) {
              delete parentHashesMap[folderName].flag
            } else {
              parentHashesMap[folderName].flag = flag
            }

            const parentContent = serializeHashes(parentHashesMap)
            await writeFile(tmpHashesPath, parentContent)
            try {
              await client.put(tmpHashesPath, remoteJoin(folder, 'hashes.txt'))
            } catch {
              /* ignore */
            }
            try {
              await unlink(tmpHashesPath)
            } catch {
              /* ignore */
            }
          } catch {
            /* ignore */
          }

          return true
        } catch (err: any) {
          throw err
        }
      }
    )

    ipcMain.handle('ftp:read-image', async (_, folder: string, name: string) => {
      const tempFilePath = join(process.cwd(), 'tmp', name)

      // eslint-disable-next-line no-useless-catch
      try {
        const client = await connect()
        await client.get(remoteJoin(folder, name), tempFilePath)

        const fileBuffer = await readFile(tempFilePath)
        const fileBase64 = fileBuffer.toString('base64')

        await unlink(tempFilePath)
        return fileBase64
      } catch (error) {
        throw error
      }
    })

    ipcMain.handle('ftp:get-logs', async (_, gameMode: string, logType: string) => {
      let path = join(app.getPath('userData'))

      switch (logType) {
        case 'minecraft':
          try {
            const res = await readdir(join(path, 'instances', gameMode))

            if (res) {
              path = join(path, 'instances', gameMode, 'logs', 'latest.log')
            }
          } catch {
            return null
          }
          break
        default:
          path = join(path, 'logs', 'main.log')
          break
      }

      const fileContent = await readFile(path, 'utf-8')

      return fileContent
    })
  }

  return {
    client: clientInstance,
    connect,
    createHandlers
  }
}
