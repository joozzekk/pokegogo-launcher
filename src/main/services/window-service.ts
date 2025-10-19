import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import icon from '../../../resources/icon.png?asset'
import { AppUpdater } from 'electron-updater'
import { useLoginService } from './login-service'
import { useLaunchService } from './launch-service'
import { getMaxRAMInGB } from '../utils'
import { machineId } from 'node-machine-id'
import { address } from 'address/promises'
import { useFTP } from './ftp-service'
import { readFile, unlink, writeFile } from 'fs/promises'
import { createHash } from 'crypto'

const createMainWindow = (): BrowserWindow => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    darkTheme: true,
    accentColor: 'black',
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  ipcMain.handle('ftp:list-files', async (_, folder) => {
    const { client, connect } = useFTP()

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
      const { client, connect } = useFTP()

      const tempFilePath = join(process.cwd(), 'tmp', fileName)
      await writeFile(tempFilePath, Buffer.from(buffer))
      await connect()

      // Upload głównego pliku
      await client.uploadFrom(tempFilePath, `${folder}/${fileName}`)

      // Pobierz lub utwórz hashes.txt
      const hashes: { [key: string]: string } = {}
      try {
        await client.downloadTo(join(process.cwd(), 'tmp', 'hashes.txt'), `${folder}/hashes.txt`)
        const data = await readFile(join(process.cwd(), 'tmp', 'hashes.txt'), 'utf-8')
        data.split('\n').forEach((line) => {
          line = line.trim()
          if (!line) return

          const lastSpaceIndex = line.lastIndexOf(' ')
          if (lastSpaceIndex === -1) return // niepoprawny format

          const name = line.substring(0, lastSpaceIndex)
          const hash = line.substring(lastSpaceIndex + 1)
          if (name && hash) hashes[name] = hash
        })
      } catch {
        // Plik może nie istnieć, to nie jest błąd
      }

      // Oblicz hash nowego pliku i dodaj do obiektu
      const fileHash = await computeHash(buffer)
      hashes[fileName] = fileHash

      // Stwórz nowy plik hashes.txt
      const hashesContent = Object.entries(hashes)
        .map(([name, hash]) => `${name} ${hash}`)
        .join('\n')
      await writeFile(join(process.cwd(), 'tmp', 'hashes.txt'), hashesContent)

      // Upload zaktualizowanego hashes.txt
      await client.uploadFrom(join(process.cwd(), 'tmp', 'hashes.txt'), `${folder}/hashes.txt`)

      // Czyszczenie
      await unlink(tempFilePath)
      await unlink(join(process.cwd(), 'tmp', 'hashes.txt'))
      client.close()

      return true
    }
  )

  ipcMain.handle('ftp:remove-file', async (_, folder: string, fileName: string) => {
    const { client, connect } = useFTP()

    await connect()

    // Usuwamy plik
    const res = await client.remove(`${folder}/${fileName}`)

    // Aktualizacja hashes.txt
    const hashes: { [key: string]: string } = {}
    try {
      await client.downloadTo(join(process.cwd(), 'tmp', 'hashes.txt'), `${folder}/hashes.txt`)
      const data = await readFile(join(process.cwd(), 'tmp', 'hashes.txt'), 'utf-8')
      data.split('\n').forEach((line) => {
        line = line.trim()
        if (!line) return

        const lastSpaceIndex = line.lastIndexOf(' ')
        if (lastSpaceIndex === -1) return // niepoprawny format

        const name = line.substring(0, lastSpaceIndex)
        const hash = line.substring(lastSpaceIndex + 1)
        if (name && hash) hashes[name] = hash
      })

      // Usuwamy wpis
      delete hashes[fileName]

      const hashesContent = Object.entries(hashes)
        .map(([name, hash]) => `${name} ${hash}`)
        .join('\n')
      await writeFile(join(process.cwd(), 'tmp', 'hashes.txt'), hashesContent)

      // Jeśli hashes.txt jest pusty, usuwamy plik na serwerze
      if (hashesContent.length === 0) {
        await client.remove(`${folder}/hashes.txt`)
      } else {
        await client.uploadFrom(join(process.cwd(), 'tmp', 'hashes.txt'), `${folder}/hashes.txt`)
      }

      await unlink(join(process.cwd(), 'tmp', 'hashes.txt'))
    } catch {
      // Jeśli plik hashes.txt nie istnieje, nic nie robimy
    }

    client.close()

    return res
  })

  ipcMain.handle('ftp:read-file', async (_, folder: string, name: string) => {
    const tempFilePath = join(process.cwd(), 'tmp', name)
    const { client, connect } = useFTP()

    await connect()

    await client.downloadTo(tempFilePath, `${folder}/${name}`)
    const fileContent = (await readFile(tempFilePath)).toString('utf8')
    await unlink(tempFilePath)

    client.close()

    return fileContent
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.webContents.send('change:max-ram', Math.floor(getMaxRAMInGB() * 0.75))
    mainWindow.webContents.send('change:version', app.getVersion())
  })

  ipcMain.handle('data:machine', async () => {
    const hwid = await machineId()
    const addr = await address()
    return {
      machineId: hwid,
      macAddress: addr?.mac,
      ipAddress: addr?.ip
    }
  })

  ipcMain.on('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  ipcMain.on('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()

    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
        win.center()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.on('window:close', (_, isHideToTray: boolean = true) => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      console.log(isHideToTray)

      if (isHideToTray) {
        win.hide()
        return
      }

      win.close()
      if (ipcMain.listenerCount('launch:exit')) ipcMain.emit('launch:exit')
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

const createLoadingWindow = (): {
  loadingWindow: BrowserWindow
  startApp: (appUpdater: AppUpdater, maiNWindow: BrowserWindow) => Promise<void>
} => {
  const loadingWindow = new BrowserWindow({
    width: 300,
    height: 400,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    darkTheme: true,
    accentColor: 'black',
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    closable: false,
    webPreferences: {
      nodeIntegration: false,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    loadingWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/loading')
  } else {
    loadingWindow.loadFile(join(__dirname, '../renderer/loading.html'))
  }

  loadingWindow.on('ready-to-show', () => {
    loadingWindow.show()
  })

  const startApp = async (appUpdater: AppUpdater, mainWindow: BrowserWindow): Promise<void> => {
    loadingWindow.show()

    loadingWindow.webContents.send('load:status', JSON.stringify('check-for-update'))
    try {
      const res = await appUpdater.checkForUpdates()

      if (res?.isUpdateAvailable) {
        loadingWindow.webContents.send('load:status', JSON.stringify('updating'))
        await appUpdater.downloadUpdate()
        appUpdater.quitAndInstall(true, true)
      }
    } catch (err) {
      console.log(err)
    } finally {
      setTimeout(() => {
        loadingWindow.webContents.send('load:status', JSON.stringify('starting'))

        useLoginService()
        useLaunchService(mainWindow)
      }, 1500)

      setTimeout(() => {
        loadingWindow.webContents.send('load:status', JSON.stringify('app-started'))
        loadingWindow.close()
        loadingWindow.webContents.close()
        mainWindow.show()
        mainWindow.focus()
      }, 2500)
    }
  }

  return {
    loadingWindow,
    startApp
  }
}

const useWindowService = (): {
  createMainWindow: () => BrowserWindow
  createLoadingWindow: () => {
    loadingWindow: BrowserWindow
    startApp: (appUpdater: AppUpdater, maiNWindow: BrowserWindow) => Promise<void>
  }
} => {
  return {
    createMainWindow,
    createLoadingWindow
  }
}

export default useWindowService
