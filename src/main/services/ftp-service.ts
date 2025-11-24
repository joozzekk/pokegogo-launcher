/* eslint-disable @typescript-eslint/no-explicit-any */
import ftp, { type Client } from 'basic-ftp'
import { createHash } from 'crypto'
import { BrowserWindow, ipcMain } from 'electron'
import { readFile, unlink, writeFile } from 'fs/promises'
import { basename, dirname, join, posix } from 'path'

export const safeCd = async (client: Client, dir: string): Promise<boolean> => {
  try {
    await client.cd(dir)
    return true
  } catch (e) {
    console.error(`Nie można wejść do katalogu: ${dir}`, e)
    return false
  }
}

export const useFTPService = (): {
  client: Client
  connect: () => Promise<void>
  createHandlers: (mainWindow: BrowserWindow) => void
} => {
  const client = new ftp.Client(1000 * 120)

  const connect = async (): Promise<void> => {
    await client.access({
      host: '57.128.211.105',
      user: 'ftpuser',
      password: 'Ewenement2023$'
    })

    client.ftp.encoding = 'utf-8'
    client.ftp.verbose = true
  }

  const createHandlers = (mainWindow: BrowserWindow): void => {
    ipcMain.handle('ftp:create-folder', async (_, folder, newFolder: string) => {
      await connect()
      const pwd = await client.pwd()
      const remoteURL = pwd + `/${folder}`

      await client.ensureDir(remoteURL + `${remoteURL.length ? `/${newFolder}` : newFolder}`)
      client.close()
      return true
    })

    ipcMain.handle('ftp:list-files', async (_, folder) => {
      await connect()
      const pwd = await client.pwd()
      const remoteURL = pwd + `/${folder}`

      const list = await client.list(remoteURL)

      const listWithModDates = await Promise.all(
        list.map(async (file) => {
          let lastModifiedAt: Date | null = null

          if (file.isFile) {
            try {
              lastModifiedAt = await client.lastMod(remoteURL + file.name)
            } catch {
              lastModifiedAt = null
            }
          }

          return {
            ...file,
            isDirectory: file.isDirectory,
            isFile: file.isFile,
            lastModifiedAt
          }
        })
      )

      client.close()

      return listWithModDates
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
          // name can contain spaces. Format: <name> <hash> [flag]
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
        await connect()

        await client.uploadFrom(tempFilePath, `${folder}${folder.length ? '/' : ''}${fileName}`)

        const tmpHashesPath = join(process.cwd(), 'tmp', 'hashes.txt')
        let remoteMissing = false
        const hashesMap: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}

        try {
          await client.downloadTo(tmpHashesPath, `${folder}${folder.length ? '/' : ''}hashes.txt`)
          const data = await readFile(tmpHashesPath, 'utf-8')
          Object.assign(hashesMap, parseHashesContent(data))
        } catch {
          // hashes.txt may not exist
          remoteMissing = true
        }

        const fileHash = await computeHash(buffer)

        // when remote hashes file doesn't exist, new entries should be marked important by default
        const defaultFlag: 'important' | 'ignore' = remoteMissing ? 'important' : 'ignore'

        hashesMap[fileName] = { hash: fileHash, flag: hashesMap[fileName]?.flag ?? defaultFlag }

        const hashesContent = serializeHashes(hashesMap)
        await writeFile(tmpHashesPath, hashesContent)

        await client.uploadFrom(tmpHashesPath, `${folder}${folder.length ? '/' : ''}hashes.txt`)

        await unlink(tempFilePath)
        try {
          await unlink(tmpHashesPath)
        } catch {
          /* ignore */
        }
        client.close()

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
      const hashes: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}
      const remoteHashesPath = join(remoteDir, 'hashes.txt').replace(/\\/g, '/')

      try {
        await client.downloadTo(localTempPath, remoteHashesPath)

        const data = await readFile(localTempPath, 'utf-8')
        Object.assign(hashes, parseHashesContent(data))
        await unlink(localTempPath)
      } catch {
        try {
          await unlink(localTempPath)
        } catch {
          /* Ignoruj błąd usuwania */
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
          await connect()

          const pwd = await client.pwd()
          const baseRemoteDir = join(pwd, folder).replace(/\\/g, '/')

          const filesByDir = groupFilesByDirectory(files)

          let fileIndex = currentFile

          for (const [relativeDir, filesInDir] of filesByDir.entries()) {
            const currentRemoteDir =
              relativeDir === '.'
                ? baseRemoteDir
                : join(baseRemoteDir, relativeDir).replace(/\\/g, '/')

            try {
              await client.ensureDir(currentRemoteDir)
              await client.cd(currentRemoteDir)
            } catch (e: any) {
              throw new Error(`Failed to cd/ensureDir ${currentRemoteDir}. Details: ${e.message}`)
            }

            const hashes = await loadRemoteHashes(currentRemoteDir, localHashesPath)

            let hashesChanged = false

            for (const file of filesInDir) {
              const { path: normalizedPath, buffer } = file
              const fileName = basename(normalizedPath)

              const fileHash = await computeHash(buffer)

              await writeFile(localUploadTempPath, Buffer.from(buffer))

              try {
                await client.uploadFrom(localUploadTempPath, fileName)
                mainWindow.webContents.send('ftp:upload-folder-progress', ++fileIndex)
              } catch (e) {
                await unlink(localUploadTempPath)
                throw e
              }

              // preserve existing flag or default to ignore
              hashes[fileName] = { hash: fileHash, flag: hashes[fileName]?.flag ?? 'ignore' }
              hashesChanged = true

              await unlink(localUploadTempPath)
            }

            if (hashesChanged) {
              const hashesContent = serializeHashes(hashes)

              await writeFile(localHashesPath, hashesContent)
              await client.uploadFrom(localHashesPath, 'hashes.txt')
              await unlink(localHashesPath)
            }
          }

          client.close()
          return true
        } catch (error) {
          try {
            client.close()
          } catch {
            /* Ignoruj */
          }

          try {
            await unlink(localHashesPath)
          } catch {
            /* Ignoruj */
          }
          try {
            await unlink(localUploadTempPath)
          } catch {
            /* Ignoruj */
          }

          throw error
        }
      }
    )

    ipcMain.handle(
      'ftp:remove-file',
      async (event, folder: string, fileName: string, operationId?: string) => {
        await connect()

        const fullPath = posix.join(folder, fileName)

        // Count total items to delete (files + directories)
        const countItems = async (ftpPath: string): Promise<number> => {
          let total = 0
          try {
            const list = await client.list(ftpPath)
            for (const item of list) {
              const childPath = ftpPath + '/' + item.name
              total += 1
              if (item.isDirectory) {
                total += await countItems(childPath)
              }
            }
          } catch {
            // ignore listing errors
          }
          return total
        }

        let totalToDelete = 1
        try {
          totalToDelete = await countItems(fullPath)
        } catch {
          totalToDelete = 1
        }

        let deletedCount = 0

        // recursive removal that reports progress
        async function removeFTPPathWithProgress(client: Client, ftpPath: string): Promise<void> {
          try {
            const list = await client.list(ftpPath)

            if (list.length === 0) {
              try {
                await client.removeDir(ftpPath)
              } catch (e: any) {
                if (e.code === 550) {
                  await client.remove(ftpPath)
                } else {
                  throw e
                }
              }
              deletedCount++
              event.sender.send('ftp:remove-progress', {
                id: operationId,
                total: totalToDelete,
                deleted: deletedCount,
                current: ftpPath
              })
            } else {
              for (const item of list) {
                const fullPathItem = ftpPath + '/' + item.name
                if (item.isDirectory) {
                  await removeFTPPathWithProgress(client, fullPathItem)
                } else {
                  try {
                    await client.remove(fullPathItem)
                  } catch (e: any) {
                    if (e.code !== 550) throw e
                  }
                  deletedCount++
                  event.sender.send('ftp:remove-progress', {
                    id: operationId,
                    total: totalToDelete,
                    deleted: deletedCount,
                    current: fullPathItem
                  })
                }
              }

              try {
                await client.removeDir(ftpPath)
                deletedCount++
                event.sender.send('ftp:remove-progress', {
                  id: operationId,
                  total: totalToDelete,
                  deleted: deletedCount,
                  current: ftpPath
                })
              } catch (e: any) {
                if (e.code === 550) {
                  await client.remove(ftpPath)
                  deletedCount++
                  event.sender.send('ftp:remove-progress', {
                    id: operationId,
                    total: totalToDelete,
                    deleted: deletedCount,
                    current: ftpPath
                  })
                } else {
                  throw e
                }
              }
            }
          } catch (err: any) {
            // If path is a file
            try {
              await client.remove(ftpPath)
              deletedCount++
              event.sender.send('ftp:remove-progress', {
                id: operationId,
                total: totalToDelete,
                deleted: deletedCount,
                current: ftpPath
              })
            } catch (e: any) {
              if (e.code === 550) {
                // try remove as file
                try {
                  await client.remove(ftpPath)
                  deletedCount++
                  event.sender.send('ftp:remove-progress', {
                    id: operationId,
                    total: totalToDelete,
                    deleted: deletedCount,
                    current: ftpPath
                  })
                } catch {
                  // ignore
                }
              } else {
                throw err
              }
            }
          }
        }

        try {
          await removeFTPPathWithProgress(client, fullPath)

          try {
            const tmpHashesPath = join(process.cwd(), 'tmp', 'hashes.txt')
            await client.downloadTo(tmpHashesPath, `${folder}${folder.length ? '/' : ''}hashes.txt`)
            const data = await readFile(tmpHashesPath, 'utf-8')
            const map = parseHashesContent(data)

            for (const key of Object.keys(map)) {
              if (key === fileName || key.startsWith(fileName + '/')) {
                delete map[key]
              }
            }

            const hashesContent = serializeHashes(map)

            await writeFile(tmpHashesPath, hashesContent)

            if (hashesContent.length === 0) {
              await client.remove(`${folder}${folder.length ? '/' : ''}hashes.txt`)
            } else {
              await client.uploadFrom(
                tmpHashesPath,
                `${folder}${folder.length ? '/' : ''}hashes.txt`
              )
            }

            await unlink(tmpHashesPath)
          } catch {
            /* Ignoruj */
          }

          client.close()

          return true
        } catch (error) {
          try {
            client.close()
          } catch {
            /* Ignoruj */
          }
          throw error
        }
      }
    )

    ipcMain.handle('ftp:read-file', async (_, folder: string, name: string) => {
      const tempFilePath = join(process.cwd(), 'tmp', name)

      await connect()

      await client.downloadTo(tempFilePath, `${folder}/${name}`)
      const fileContent = (await readFile(tempFilePath)).toString('utf8')
      await unlink(tempFilePath)

      client.close()

      return fileContent
    })

    ipcMain.handle('ftp:get-hash-entries', async (_, folder: string) => {
      await connect()
      const tmpHashesPath = join(process.cwd(), 'tmp', 'hashes.txt')
      let remoteMissing = false
      const map: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}
      try {
        await client.downloadTo(tmpHashesPath, `${folder}${folder.length ? '/' : ''}hashes.txt`)
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
      client.close()
      return { entries: map, missing: remoteMissing }
    })

    ipcMain.handle(
      'ftp:set-hash-flag',
      async (_, folder: string, name: string, flag?: 'important' | 'ignore' | null) => {
        await connect()
        const tmpHashesPath = join(process.cwd(), 'tmp', 'hashes.txt')
        const tmpFilePath = join(process.cwd(), 'tmp', 'file.temp')
        const map: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}

        try {
          await client.downloadTo(tmpHashesPath, `${folder}${folder.length ? '/' : ''}hashes.txt`)
          const data = await readFile(tmpHashesPath, 'utf-8')
          Object.assign(map, parseHashesContent(data))
        } catch {
          // hashes.txt missing - proceed with empty map
        }

        // If entry doesn't exist, try to download file to compute its hash
        if (!map[name]) {
          try {
            await client.downloadTo(tmpFilePath, `${folder}${folder.length ? '/' : ''}${name}`)
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
        await client.uploadFrom(tmpHashesPath, `${folder}${folder.length ? '/' : ''}hashes.txt`)
        try {
          await unlink(tmpHashesPath)
        } catch {
          /* ignore */
        }

        client.close()
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
        await connect()

        const targetPath = `${folder}${folder.length ? '/' : ''}${folderName}`

        // Count total files under targetPath
        const countFiles = async (ftpPath: string): Promise<number> => {
          let total = 0
          try {
            const list = await client.list(ftpPath)
            for (const item of list) {
              const childPath = ftpPath + '/' + item.name
              if (item.isDirectory) {
                total += await countFiles(childPath)
              } else {
                total += 1
              }
            }
          } catch {
            // ignore listing errors
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

        // Traverse and update hashes per-directory
        const traverseAndUpdate = async (ftpPath: string): Promise<void> => {
          try {
            const list = await client.list(ftpPath)

            // load hashes for this directory
            const hashes: Record<string, { hash: string; flag?: 'important' | 'ignore' }> = {}
            try {
              await client.downloadTo(tmpHashesPath, `${ftpPath.replace(/\\/g, '/')}/hashes.txt`)
              const data = await readFile(tmpHashesPath, 'utf-8')
              Object.assign(hashes, parseHashesContent(data))
              try {
                await unlink(tmpHashesPath)
              } catch {
                // ignore
              }
            } catch {
              // no hashes.txt - proceed with empty map
            }

            let hashesChanged = false

            for (const item of list) {
              const childPath = ftpPath + '/' + item.name
              if (item.isDirectory) {
                await traverseAndUpdate(childPath)
              } else {
                // For files, ensure hash exists (download to compute if missing)
                if (!hashes[item.name]) {
                  try {
                    await client.downloadTo(tmpFilePath, childPath)
                    const content = await readFile(tmpFilePath)
                    const h = createHash('sha256')
                    h.update(content)
                    hashes[item.name] = { hash: h.digest('hex') }
                    try {
                      await unlink(tmpFilePath)
                    } catch {
                      /* ignore */
                    }
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
                  // send progress
                  try {
                    mainWindow.webContents.send('ftp:set-flag-folder-progress', {
                      id: operationId,
                      total: totalFiles,
                      completed: processed,
                      current: childPath
                    })
                  } catch {
                    // ignore
                  }
                }
              }
            }

            if (hashesChanged) {
              const content = serializeHashes(hashes)
              await writeFile(tmpHashesPath, content)
              try {
                await client.uploadFrom(tmpHashesPath, `${ftpPath.replace(/\\/g, '/')}/hashes.txt`)
              } catch {
                // ignore upload errors
              }
              try {
                await unlink(tmpHashesPath)
              } catch {
                // ignore
              }
            }
          } catch {
            // ignore directory errors
          }
        }

        try {
          await traverseAndUpdate(targetPath)
          client.close()
          return true
        } catch (err) {
          try {
            client.close()
          } catch {
            /* ignore */
          }
          throw err
        }
      }
    )

    ipcMain.handle('ftp:read-image', async (_, folder: string, name: string) => {
      const tempFilePath = join(process.cwd(), 'tmp', name)

      try {
        await connect()
        await client.downloadTo(tempFilePath, `${folder}/${name}`)

        const fileBuffer = await readFile(tempFilePath)
        const fileBase64 = fileBuffer.toString('base64')

        await unlink(tempFilePath)
        client.close()

        return fileBase64
      } catch (error) {
        client.close()
        throw error
      }
    })
  }

  return {
    client,
    connect,
    createHandlers
  }
}
