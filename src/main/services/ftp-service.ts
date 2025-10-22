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

    function groupFilesByDirectory(files: any[]): Map<string, any[]> {
      const directoryMap = new Map<string, any[]>()

      for (const file of files) {
        // Używamy normalizedPath (z ukośnikami /) dla spójności
        const normalizedPath = file.path.replace(/\\/g, '/')
        const dir = dirname(normalizedPath)

        if (!directoryMap.has(dir)) {
          directoryMap.set(dir, [])
        }
        // Dodajemy plik z już znormalizowaną ścieżką
        directoryMap.get(dir)!.push({ ...file, path: normalizedPath })
      }
      return directoryMap
    }

    /**
     * Funkcja pomocnicza do wczytania i sparsowania pliku hashes.txt
     */
    async function loadRemoteHashes(
      remoteDir: string,
      localTempPath: string
    ): Promise<{ [key: string]: string }> {
      const hashes: { [key: string]: string } = {}
      const remoteHashesPath = join(remoteDir, 'hashes.txt').replace(/\\/g, '/')

      try {
        // Pobierz plik hashes.txt z konkretnego katalogu
        await client.downloadTo(localTempPath, remoteHashesPath)

        const data = await readFile(localTempPath, 'utf-8')
        data.split('\n').forEach((line) => {
          line = line.trim()
          if (!line) return
          const lastSpaceIndex = line.lastIndexOf(' ')
          if (lastSpaceIndex === -1) return

          // Ważne: w hashes.txt przechowujemy tylko NAZWY PLIKÓW (basename)
          const name = line.substring(0, lastSpaceIndex)
          const hash = line.substring(lastSpaceIndex + 1)
          if (name && hash) hashes[name] = hash
        })
        await unlink(localTempPath)
      } catch (e) {
        // Błąd (np. brak pliku) jest OK, oznacza to, że nie ma starych hashy
        try {
          await unlink(localTempPath) // Posprzątaj, jeśli pobieranie się udało, a czytanie nie
        } catch {
          /* Ignoruj błąd usuwania */
        }
      }
      return hashes
    }

    // --- Główna funkcja IPC ---

    ipcMain.handle('ftp:upload-folder', async (_, folder: string, files: any[]) => {
      const tmpDir = join(process.cwd(), 'tmp')
      // Użyjemy jednej tymczasowej ścieżki dla wszystkich plików hashes.txt
      const localHashesPath = join(tmpDir, 'hashes.temp.txt')
      // Użyjemy jednej tymczasowej ścieżki dla wysyłanych plików
      const localUploadTempPath = join(tmpDir, 'upload.temp.bin')

      try {
        await connect()

        const pwd = await client.pwd()
        // Główny folder projektu na serwerze, np. /home/user/my-project
        const baseRemoteDir = join(pwd, folder).replace(/\\/g, '/')

        // 1. Pogrupuj pliki według ich katalogów
        const filesByDir = groupFilesByDirectory(files)

        // 2. Przejdź pętlą po każdym katalogu, który zawiera pliki
        for (const [relativeDir, filesInDir] of filesByDir.entries()) {
          // Katalog na serwerze, do którego będziemy wysyłać, np. /home/user/my-project/src/components
          // Jeśli relativeDir to '.', baseRemoteDir pozostanie niezmieniony
          const currentRemoteDir =
            relativeDir === '.'
              ? baseRemoteDir
              : join(baseRemoteDir, relativeDir).replace(/\\/g, '/')

          // Upewnij się, że katalog istnieje i do niego przejdź
          try {
            await client.ensureDir(currentRemoteDir)
            await client.cd(currentRemoteDir)
          } catch (e: any) {
            throw new Error(`Failed to cd/ensureDir ${currentRemoteDir}. Details: ${e.message}`)
          }

          // 3. Wczytaj istniejący plik hashes.txt z TEGO katalogu
          // hashes przechowuje teraz wpisy typu { 'Button.js': 'hash123' }
          const hashes = await loadRemoteHashes(currentRemoteDir, localHashesPath)

          let hashesChanged = false // Flaga, czy trzeba będzie wgrać nowy hashes.txt

          // 4. Przejdź pętlą po plikach w tym katalogu
          for (const file of filesInDir) {
            const { path: normalizedPath, buffer } = file
            const fileName = basename(normalizedPath) // Np. 'Button.js'

            // Oblicz hash dla pliku z bufora
            const fileHash = await computeHash(buffer)

            // TODO: Tutaj powinieneś dodać logikę porównywania hashy
            // if (hashes[fileName] === fileHash) {
            //   console.log(`Skipping ${normalizedPath} (hash matches)`);
            //   continue; // Pomiń wysyłanie, jeśli hash się zgadza
            // }

            // Przygotuj plik lokalnie
            await writeFile(localUploadTempPath, Buffer.from(buffer))

            try {
              // Wysyłamy plik używając TYLKO jego nazwy (fileName),
              // ponieważ jesteśmy już w odpowiednim katalogu (client.cd)
              await client.uploadFrom(localUploadTempPath, fileName)
            } catch (e) {
              await unlink(localUploadTempPath) // Sprzątanie po błędzie
              throw e
            }

            // Zaktualizuj hash dla tego pliku i oznacz, że plik hashes.txt wymaga aktualizacji
            hashes[fileName] = fileHash
            hashesChanged = true

            await unlink(localUploadTempPath) // Sprzątanie po sukcesie
          } // Koniec pętli po plikach

          // 5. Jeśli cokolwiek się zmieniło, zapisz i wyślij nowy plik hashes.txt
          if (hashesChanged) {
            const hashesContent = Object.entries(hashes)
              .map(([name, hash]) => `${name} ${hash}`) // name to już jest basename
              .join('\n')

            // Jesteśmy już w `currentRemoteDir`
            await writeFile(localHashesPath, hashesContent)
            await client.uploadFrom(localHashesPath, 'hashes.txt')
            await unlink(localHashesPath)
          }
        } // Koniec pętli po katalogach

        client.close()
        return true
      } catch (error) {
        try {
          client.close()
        } catch {
          /* Ignoruj */
        }

        // Posprzątaj pliki tymczasowe na wszelki wypadek
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
