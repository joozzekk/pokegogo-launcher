/* eslint-disable @typescript-eslint/no-explicit-any */
import Client from 'ssh2-sftp-client'
import { createHash } from 'crypto'
import { BrowserWindow, ipcMain } from 'electron'
import { readFile, unlink, writeFile } from 'fs/promises'
import { basename, dirname, join, posix } from 'path'

const remoteJoin = (...parts: string[]): string => posix.join(...parts.filter(Boolean))

const isSftpDir = (type: string | undefined): boolean => type === 'd'
const isSftpFile = (type: string | undefined): boolean => type === '-'

export const useFTPService = (): {
  client: Client | null
  connect: () => Promise<Client>
  createHandlers: (mainWindow: BrowserWindow) => void
} => {
  let clientInstance: Client | null = null
  let isConnecting = false

  const connect = async (): Promise<Client> => {
    // 1. Sprawdzenie, czy trwa łączenie
    if (isConnecting) {
      // ... (logika oczekiwania na połączenie)
      let attempts = 0
      while (isConnecting && attempts < 50) {
        await new Promise((r) => setTimeout(r, 100))
        if (clientInstance) return clientInstance
        attempts++
      }
    }

    // 2. Jeśli instancja istnieje, spróbujmy ją zweryfikować
    if (clientInstance) {
      try {
        // Weryfikacja: Wykonaj lekką operację na serwerze (cwd)
        await clientInstance.cwd()
        return clientInstance
      } catch (e: any) {
        console.warn(
          'SFTP: Weryfikacja połączenia nie powiodła się. Wymuszam reconnect.',
          e.message
        )
        try {
          // Koniec starego klienta (może się nie udać, ale próbujemy)
          await clientInstance.end()
        } catch {
          /* ignore */
        }
      }
    }

    // 3. Ustanowienie nowego połączenia
    isConnecting = true
    const c = new Client()

    try {
      await c.connect({
        host: '57.128.211.104',
        port: 22,
        username: 'ftpclient',
        password: 'PokeAdmin321b!#',
        ident: 'utf8',
        readyTimeout: 30000, // Dłuższy czas na handshake
        keepaliveInterval: 2000, // Ping co 2s (zamiast 5s)
        keepaliveCountMax: 5 // Więcej prób zanim uznamy zgon
      })

      c.on('close', () => {
        console.log('SFTP: Connection closed')
        clientInstance = null
      })

      c.on('end', () => {
        console.log('SFTP: Connection ended')
        clientInstance = null
      })

      c.on('error', (err) => {
        console.error('SFTP: Connection error', err)
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

  const createHandlers = (mainWindow: BrowserWindow): void => {
    ipcMain.handle('ftp:create-folder', async (_, folder, newFolder: string) => {
      const client = await connect()
      const pwd = await client.cwd()
      const remoteURL = remoteJoin(pwd, folder, newFolder)

      try {
        await client.mkdir(remoteURL, true)
      } catch (e: any) {
        // Ignorujemy błąd jeśli folder już istnieje
        if (e.code !== 4 && e.code !== 'EEXIST') throw e
      }

      return true
    })

    ipcMain.handle('ftp:list-files', async (_, folder) => {
      const client = await connect()
      const pwd = await client.cwd()
      const remoteURL = remoteJoin(pwd, folder)

      const list = await client.list(remoteURL)

      const mappedList = list.map((file) => {
        const lastModifiedAt = file.modifyTime ? new Date(file.modifyTime) : null

        return {
          name: file.name,
          size: file.size,
          isDirectory: isSftpDir(file.type),
          isFile: isSftpFile(file.type),
          lastModifiedAt
        }
      })

      return mappedList
    })

    async function computeHash(buffer: ArrayBuffer): Promise<string> {
      const hash = createHash('sha256')
      hash.update(Buffer.from(buffer))
      return hash.digest('hex')
    }

    function parseHashesContent(
      data: string
    ): Record<string, { hash: string; flag?: 'important' | 'ignore' }> {
      const map: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}
      data
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((line) => {
          const parts = line.split(' ')
          if (parts.length < 2) return
          const last = parts[parts.length - 1]
          let flag: 'important' | 'ignore' | undefined
          let hash = parts[parts.length - 1]
          let nameParts = parts.slice(0, parts.length - 1)

          if (last === 'important' || last === 'ignore') {
            flag = last as 'important' | 'ignore'
            if (parts.length < 3) return
            hash = parts[parts.length - 2]
            nameParts = parts.slice(0, parts.length - 2)
          }

          const name = nameParts.join(' ').trim()
          if (name && hash) map[name] = { hash, flag }
        })

      return map
    }

    function serializeHashes(
      map: Record<string, { hash: string; flag?: 'important' | 'ignore' }>
    ): string {
      return Object.entries(map)
        .map(([name, v]) => `${name} ${v.hash}${v.flag ? ' ' + v.flag : ''}`)
        .join('\n')
    }

    ipcMain.handle(
      'ftp:upload-file',
      async (_, folder: string, buffer: ArrayBuffer, fileName: string) => {
        const tempFilePath = join(process.cwd(), 'tmp', fileName)
        await writeFile(tempFilePath, Buffer.from(buffer))

        const client = await connect()
        const remotePath = remoteJoin(folder, fileName)

        await client.put(tempFilePath, remotePath)

        const tmpHashesPath = join(process.cwd(), 'tmp', 'hashes.txt')
        let remoteMissing = false
        const hashesMap: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}

        try {
          await client.get(remoteJoin(folder, 'hashes.txt'), tmpHashesPath)
          const data = await readFile(tmpHashesPath, 'utf-8')
          Object.assign(hashesMap, parseHashesContent(data))
        } catch {
          remoteMissing = true
        }

        const fileHash = await computeHash(buffer)
        const defaultFlag: 'important' | 'ignore' = remoteMissing ? 'important' : 'ignore'

        hashesMap[fileName] = { hash: fileHash, flag: hashesMap[fileName]?.flag ?? defaultFlag }

        const hashesContent = serializeHashes(hashesMap)
        await writeFile(tmpHashesPath, hashesContent)

        await client.put(tmpHashesPath, remoteJoin(folder, 'hashes.txt'))

        await unlink(tempFilePath)
        try {
          await unlink(tmpHashesPath)
        } catch {
          /* ignore */
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
    ): Promise<Record<string, { hash: string; flag?: 'important' | 'ignore' }>> {
      const client = await connect()
      const hashes: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}
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

    ipcMain.handle(
      'ftp:remove-file',
      async (event, folder: string, fileName: string, operationId?: string) => {
        const client = await connect()
        const fullPath = remoteJoin(folder, fileName)

        const countItems = async (ftpPath: string): Promise<number> => {
          let total = 0
          try {
            const list = await client.list(ftpPath)
            for (const item of list) {
              const childPath = remoteJoin(ftpPath, item.name)
              total += 1
              if (isSftpDir(item.type)) {
                total += await countItems(childPath)
              }
            }
          } catch {
            /* ignore */
          }
          return total
        }

        let totalToDelete = 1
        try {
          const stat = await client.stat(fullPath)
          if (stat.isDirectory) {
            totalToDelete = await countItems(fullPath)
          }
        } catch {
          totalToDelete = 1
        }

        let deletedCount = 0

        async function removeSFTPPathWithProgress(path: string): Promise<void> {
          let list: any[] = []
          let isDir = false

          try {
            const stat = await client.stat(path)
            isDir = stat.isDirectory
          } catch {
            return
          }

          if (isDir) {
            try {
              list = await client.list(path)
            } catch {
              /* Empty */
            }

            for (const item of list) {
              const childPath = remoteJoin(path, item.name)
              await removeSFTPPathWithProgress(childPath)
            }

            try {
              await client.rmdir(path)
            } catch (e) {
              console.error('Błąd usuwania katalogu', path, e)
            }
          } else {
            try {
              await client.delete(path)
            } catch (e) {
              console.error('Błąd usuwania pliku', path, e)
            }
          }

          deletedCount++
          event.sender.send('ftp:remove-progress', {
            id: operationId,
            total: totalToDelete,
            deleted: deletedCount,
            current: path
          })
        }

        // eslint-disable-next-line no-useless-catch
        try {
          await removeSFTPPathWithProgress(fullPath)

          try {
            const tmpHashesPath = join(process.cwd(), 'tmp', 'hashes.txt')
            await client.get(remoteJoin(folder, 'hashes.txt'), tmpHashesPath)
            const data = await readFile(tmpHashesPath, 'utf-8')
            const map = parseHashesContent(data)

            let changed = false
            for (const key of Object.keys(map)) {
              if (key === fileName || key.startsWith(fileName + '/')) {
                delete map[key]
                changed = true
              }
            }

            if (changed) {
              const hashesContent = serializeHashes(map)
              await writeFile(tmpHashesPath, hashesContent)

              if (hashesContent.length === 0) {
                await client.delete(remoteJoin(folder, 'hashes.txt'))
              } else {
                await client.put(tmpHashesPath, remoteJoin(folder, 'hashes.txt'))
              }
            }
            await unlink(tmpHashesPath)
          } catch {
            /* ignore hash errors */
          }

          return true
        } catch (error) {
          throw error
        }
      }
    )

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
      const map: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}
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
      async (_, folder: string, name: string, flag?: 'important' | 'ignore' | null) => {
        const client = await connect()
        const tmpHashesPath = join(process.cwd(), 'tmp', 'hashes.txt')
        const tmpFilePath = join(process.cwd(), 'tmp', 'file.temp')
        const map: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}

        try {
          await client.get(remoteJoin(folder, 'hashes.txt'), tmpHashesPath)
          const data = await readFile(tmpHashesPath, 'utf-8')
          Object.assign(map, parseHashesContent(data))
        } catch {
          /* ignore */
        }

        if (!map[name]) {
          try {
            await client.get(remoteJoin(folder, name), tmpFilePath)
            const content = await readFile(tmpFilePath)
            const h = createHash('sha256')
            h.update(content)
            map[name] = { hash: h.digest('hex') }
            await unlink(tmpFilePath)
          } catch {
            try {
              await unlink(tmpFilePath)
            } catch {
              /* ignore */
            }
          }
        }

        if (map[name]) {
          if (flag === null || flag === undefined) {
            delete map[name].flag
          } else {
            map[name].flag = flag
          }
        }

        const content = serializeHashes(map)
        await writeFile(tmpHashesPath, content)
        await client.put(tmpHashesPath, remoteJoin(folder, 'hashes.txt'))
        try {
          await unlink(tmpHashesPath)
        } catch {
          /* ignore */
        }

        return true
      }
    )

    ipcMain.handle(
      'ftp:set-hash-flag-folder',
      async (
        _: any,
        folder: string,
        folderName: string,
        flag?: 'important' | 'ignore' | null,
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
            const hashes: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}

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
            const parentHashesMap: Record<string, { hash: string; flag?: 'important' | 'ignore' }> =
              {}
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
  }

  return {
    client: clientInstance,
    connect,
    createHandlers
  }
}
