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
async function downloadAll(
  client: ftp.Client,
  remoteDir: string,
  localDir: string,
  log: (data: string, isEnded?: boolean) => void,
  isFirstInstall: boolean,
  importantFolders: string[]
): Promise<void> {
  await fs.promises.mkdir(localDir, { recursive: true })
  const changed = await safeCd(client, remoteDir)
  if (!changed) return
  const list = await client.list()
  let downloadedFiles = 0
  const totalFiles = list.filter((f) => !f.isDirectory).length

  for (const file of list) {
    const remotePath = path.posix.join(remoteDir, file.name)
    const localPath = path.join(localDir, file.name)

    if (file.isDirectory) {
      await downloadAll(client, remotePath, localPath, log, isFirstInstall, importantFolders)
    } else {
      if (file.name.endsWith('.sha256')) {
        continue
      }

      const folderName = path.basename(localDir)

      let verifyHash = false
      if (isFirstInstall) {
        verifyHash = true
      } else if (importantFolders.includes(folderName)) {
        verifyHash = true
      }

      let remoteHash = ''
      if (verifyHash) {
        try {
          const remoteHashPath = remotePath + '.sha256'
          const tempHashFile = path.join(localDir, file.name + '.sha256.tmp')
          await client.downloadTo(tempHashFile, remoteHashPath)
          remoteHash = (await fs.promises.readFile(tempHashFile, 'utf8')).trim()
          await fs.promises.unlink(tempHashFile)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          log(`Brak sumy kontrolnej dla pliku ${file.name}, pobieram bez porównania.`)
        }
      }

      let downloadFile = true
      if (verifyHash && remoteHash) {
        try {
          const localHash = await getFileHash(localPath)
          if (localHash === remoteHash) {
            downloadFile = false
            log(`Plik ${file.name} aktualny, pomijam pobieranie.`)
          }
        } catch {
          downloadFile = true
        }
      } else {
        // No hash verification means we download only if file missing
        try {
          await fs.promises.access(localPath)
          downloadFile = false
          log(`Plik ${file.name} istnieje lokalnie, pomijam pobieranie (bez weryfikacji).`)
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
export async function copyMCFiles(mainWindow: BrowserWindow): Promise<void> {
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
    const remoteURL = pwd + '/mcfiles'

    mainWindow.webContents.send('show-toast', 'Instalowanie minecraft..')
    await downloadAll(
      client,
      remoteURL,
      localRoot,
      (data: string) => {
        mainWindow.webContents.send('show-log', data)
      },
      isFirstInstall,
      importantFolders
    )

    if (isFirstInstall) {
      await fs.promises.writeFile(markerFile, 'installed')
    }

    mainWindow.webContents.send('show-log', '', true)
    mainWindow.webContents.send('show-toast', 'Pomyślnie zainstalowano Minecraft.')
  } catch (err) {
    console.error(err)
  } finally {
    client.close()
  }
}
