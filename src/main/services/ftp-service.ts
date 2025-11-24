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

    ipcMain.handle(
      'ftp:upload-file',
      async (_, folder: string, buffer: ArrayBuffer, fileName: string) => {
        const tempFilePath = join(process.cwd(), 'tmp', fileName)
        await writeFile(tempFilePath, Buffer.from(buffer))
        await connect()

        await client.uploadFrom(tempFilePath, `${folder}${folder.length ? '/' : ''}${fileName}`)

        const hashes: { [key: string]: string } = {}
        try {
          await client.downloadTo(
            join(process.cwd(), 'tmp', 'hashes.txt'),
            `${folder}${folder.length ? '/' : ''}hashes.txt`
          )
          const data = await readFile(join(process.cwd(), 'tmp', 'hashes.txt'), 'utf-8')
          data.split('\n').forEach((line) => {
            line = line.trim()
            if (!line) return

            const lastSpaceIndex = line.lastIndexOf(' ')
            if (lastSpaceIndex === -1) return

            const name = line.substring(0, lastSpaceIndex)
            const hash = line.substring(lastSpaceIndex + 1)
            if (name && hash) hashes[name] = hash
          })
        } catch {
          // Plik może nie istnieć, to nie jest błąd
        }

        const fileHash = await computeHash(buffer)
        hashes[fileName] = fileHash

        const hashesContent = Object.entries(hashes)
          .map(([name, hash]) => `${name} ${hash}`)
          .join('\n')
        await writeFile(join(process.cwd(), 'tmp', 'hashes.txt'), hashesContent)

        await client.uploadFrom(
          join(process.cwd(), 'tmp', 'hashes.txt'),
          `${folder}${folder.length ? '/' : ''}hashes.txt`
        )

        await unlink(tempFilePath)
        await unlink(join(process.cwd(), 'tmp', 'hashes.txt'))
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
    ): Promise<{ [key: string]: string }> {
      const hashes: { [key: string]: string } = {}
      const remoteHashesPath = join(remoteDir, 'hashes.txt').replace(/\\/g, '/')

      try {
        await client.downloadTo(localTempPath, remoteHashesPath)

        const data = await readFile(localTempPath, 'utf-8')
        data.split('\n').forEach((line) => {
          line = line.trim()
          if (!line) return
          const lastSpaceIndex = line.lastIndexOf(' ')
          if (lastSpaceIndex === -1) return

          const name = line.substring(0, lastSpaceIndex)
          const hash = line.substring(lastSpaceIndex + 1)
          if (name && hash) hashes[name] = hash
        })
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

              hashes[fileName] = fileHash
              hashesChanged = true

              await unlink(localUploadTempPath)
            }

            if (hashesChanged) {
              const hashesContent = Object.entries(hashes)
                .map(([name, hash]) => `${name} ${hash}`)
                .join('\n')

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

          const hashes: { [key: string]: string } = {}
          try {
            const tmpHashesPath = join(process.cwd(), 'tmp', 'hashes.txt')
            await client.downloadTo(tmpHashesPath, `${folder}${folder.length ? '/' : ''}hashes.txt`)
            const data = await readFile(tmpHashesPath, 'utf-8')
            data.split('\n').forEach((line) => {
              const trimmed = line.trim()
              if (!trimmed) return
              const lastSpaceIndex = trimmed.lastIndexOf(' ')
              if (lastSpaceIndex === -1) return
              const name = trimmed.substring(0, lastSpaceIndex)
              const hash = trimmed.substring(lastSpaceIndex + 1)
              hashes[name] = hash
            })

            for (const key of Object.keys(hashes)) {
              if (key === fileName || key.startsWith(fileName + '/')) {
                delete hashes[key]
              }
            }

            const hashesContent = Object.entries(hashes)
              .map(([name, hash]) => `${name} ${hash}`)
              .join('\n')

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
