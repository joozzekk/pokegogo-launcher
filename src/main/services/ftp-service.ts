import ftp, { type Client } from 'basic-ftp'
import { createHash } from 'crypto'
import { ipcMain } from 'electron'
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
  createHandlers: () => void
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

  const createHandlers = (): void => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ipcMain.handle('ftp:upload-folder', async (_, folder: string, files: any[]) => {
      const hashes: { [key: string]: string } = {}
      const tmpDir = join(process.cwd(), 'tmp')
      const localHashesPath = join(tmpDir, 'hashes.txt')

      try {
        await connect()

        const remoteHashesPath = `${folder}${folder.length ? '/' : ''}hashes.txt`

        try {
          await client.downloadTo(localHashesPath, remoteHashesPath.replace(/\\/g, '/'))
          const data = await readFile(localHashesPath, 'utf-8')
          data.split('\n').forEach((line) => {
            line = line.trim()
            if (!line) return
            const lastSpaceIndex = line.lastIndexOf(' ')
            if (lastSpaceIndex === -1) return
            const name = line.substring(0, lastSpaceIndex)
            const hash = line.substring(lastSpaceIndex + 1)
            if (name && hash) hashes[name] = hash
          })
          await unlink(localHashesPath)
        } catch {
          try {
            await unlink(localHashesPath)
          } catch {
            /* Ignore error in */
          }
        }

        const pwd = await client.pwd()
        const dir = join(pwd, folder).replace(/\\/g, '/')

        for (const file of files) {
          const { path, buffer } = file

          const normalizedPath = path.replace(/\\/g, '/')

          const relativeDir = dirname(normalizedPath)
          const fileName = basename(normalizedPath)

          const remoteFolderPath = join(dir, relativeDir)
          const remoteFilePath = fileName

          const tempFileUniqueName = `${Date.now()}-${fileName}`
          const tempFileUniquePath = join(tmpDir, tempFileUniqueName)

          if (remoteFolderPath) {
            try {
              if (dir) {
                await client.cd(dir.replace(/\\/g, '/'))
              } else {
                await client.cd(await client.pwd())
              }

              await client.ensureDir(remoteFolderPath.replace(/\\/g, '/'))
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
              throw new Error(
                `Failed to create remote directory: ${remoteFolderPath.replace(/\\/g, '/')}. Details: ${e.message}`
              )
            }
          }

          await writeFile(tempFileUniquePath, Buffer.from(buffer))

          try {
            await client.uploadFrom(tempFileUniquePath, remoteFilePath.replace(/\\/g, '/'))
          } catch (e) {
            await unlink(tempFileUniquePath)
            throw e
          }

          const fileHash = await computeHash(buffer)
          hashes[fileName] = fileHash

          await unlink(tempFileUniquePath)
        }

        const hashesContent = Object.entries(hashes)
          .map(([name, hash]) => `${name} ${hash}`)
          .join('\n')

        if (folder) {
          await client.cd(folder)
        } else {
          await client.cd(await client.pwd())
        }

        await writeFile(localHashesPath, hashesContent)
        await client.uploadFrom(localHashesPath, 'hashes.txt')

        await unlink(localHashesPath)
        client.close()

        return true
      } catch (error) {
        try {
          client.close()
        } catch {
          /* Ignore */
        }
        try {
          await unlink(localHashesPath)
        } catch {
          /* Ignore */
        }

        throw error
      }
    })

    async function removeFTPPath(client: Client, ftpPath: string): Promise<void> {
      try {
        const list = await client.list(ftpPath)

        if (list.length === 0) {
          await client.removeDir(ftpPath)
        } else {
          for (const item of list) {
            const fullPath = ftpPath + '/' + item.name
            if (item.isDirectory) {
              await removeFTPPath(client, fullPath)
            } else {
              await client.remove(fullPath)
            }
          }
          await client.removeDir(ftpPath)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err.code === 550) {
          await client.remove(ftpPath)
        } else {
          throw err
        }
      }
    }

    ipcMain.handle('ftp:remove-file', async (_, folder: string, fileName: string) => {
      await connect()

      const fullPath = posix.join(folder, fileName)

      await removeFTPPath(client, fullPath)

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
          await client.uploadFrom(tmpHashesPath, `${folder}${folder.length ? '/' : ''}hashes.txt`)
        }

        await unlink(tmpHashesPath)
      } catch {
        // jeśli plik hashes.txt nie istnieje, nic nie robimy
      }

      client.close()

      return true
    })

    ipcMain.handle('ftp:read-file', async (_, folder: string, name: string) => {
      const tempFilePath = join(process.cwd(), 'tmp', name)

      await connect()

      await client.downloadTo(tempFilePath, `${folder}/${name}`)
      const fileContent = (await readFile(tempFilePath)).toString('utf8')
      await unlink(tempFilePath)

      client.close()

      return fileContent
    })
  }

  return {
    client,
    connect,
    createHandlers
  }
}
