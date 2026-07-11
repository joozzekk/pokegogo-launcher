import { exec } from 'child_process'
import { platform, arch } from 'os'
import { mkdirSync, promises as fsPromises } from 'fs'
import path, { join } from 'path'
import { app } from 'electron'
import { downloadFile, ensureDir } from '../../utils'
import Logger from 'electron-log'

interface JavaInfo {
  urls: {
    win: string
    linux: string
    mac: string
  }
  folderName: string
}

const JAVA_CONFIG: Record<string, JavaInfo> = {
  '17': {
    urls: {
      win: 'https://download.oracle.com/java/17/archive/jdk-17.0.12_windows-x64_bin.zip',
      linux: 'https://download.oracle.com/java/17/archive/jdk-17.0.12_linux-x64_bin.tar.gz',
      mac: 'https://download.oracle.com/java/17/archive/jdk-17.0.12_macos-x64_bin.tar.gz'
    },
    folderName: 'jdk-17.0.12'
  },
  '21': {
    urls: {
      win: 'https://download.oracle.com/java/21/archive/jdk-21.0.8_windows-x64_bin.zip',
      linux: 'https://download.oracle.com/java/21/archive/jdk-21.0.8_linux-x64_bin.tar.gz',
      mac: 'https://download.oracle.com/java/21/archive/jdk-21.0.8_macos-x64_bin.tar.gz'
    },
    folderName: 'jdk-21.0.8'
  }
}

function checkJavaInstalled(version: string): Promise<boolean | string> {
  const plt = platform()
  const config = JAVA_CONFIG[version]
  if (!config) return Promise.resolve(false)

  const folderName = plt === 'darwin' ? `${config.folderName}.jdk` : config.folderName
  const binPath =
    plt === 'darwin'
      ? join('java', folderName, 'Contents', 'Home', 'bin')
      : join('java', folderName, 'bin')

  return new Promise((resolve) => {
    fsPromises
      .readdir(join(app.getPath('userData'), binPath))
      .then((res) => {
        if (res && res.length > 0) {
          resolve(true)
        } else {
          resolve(false)
        }
      })
      .catch(() => resolve(false))
  })
}
export async function installJava(version: string): Promise<string> {
  const javaInstalled = await checkJavaInstalled(version)
  Logger.log(`Java ${version} install check:`, javaInstalled)
  if (javaInstalled) {
    return Promise.resolve(`Java ${version} jest już zainstalowana`)
  }

  const config = JAVA_CONFIG[version]
  if (!config) {
    return Promise.reject(`Wersja Javy ${version} nie jest wspierana`)
  }

  const plt = platform()
  const architecture = arch()
  let javaUrl = ''
  // Pobrane pliki tymczasowe będą w katalogu 'downloads'
  const installerDir = path.join(app.getPath('downloads'))
  ensureDir(installerDir)

  let installerPath = ''

  const destDir = path.join(app.getPath('userData'), 'java')
  // Zapewniamy istnienie katalogu docelowego w userData
  mkdirSync(destDir, { recursive: true })

  if (plt === 'win32' && architecture === 'x64') {
    javaUrl = config.urls.win
    // Zmieniamy rozszerzenie na .zip
    installerPath = path.join(installerDir, `java_installer_${version}.zip`)
  } else if (plt === 'linux' && architecture === 'x64') {
    javaUrl = config.urls.linux
    installerPath = path.join(installerDir, `java_installer_${version}.tar.gz`)
  } else if (plt === 'darwin') {
    javaUrl = config.urls.mac
    installerPath = path.join(installerDir, `java_installer_${version}.tar.gz`)
  } else {
    return Promise.reject('Platforma lub architektura nie jest wspierana')
  }

  await downloadFile(javaUrl, installerPath)

  if (plt === 'win32') {
    return new Promise((resolve, reject) => {
      const powershellCommand = `powershell -Command "Expand-Archive -Path '${installerPath}' -DestinationPath '${destDir}' -Force"`

      exec(powershellCommand, async (error) => {
        if (error) {
          reject(`Błąd rozpakowywania Javy (Windows): ${error.message}`)
          return
        }
        try {
          await fsPromises.unlink(installerPath)
        } catch {
          // ignoruj błędy usuwania pliku
        }
        resolve('Java została rozpakowana pomyślnie')
      })
    })
  } else if (plt === 'linux') {
    return new Promise((resolve, reject) => {
      exec(`tar -xzf "${installerPath}" -C "${destDir}"`, async (error) => {
        if (error) {
          reject(`Błąd rozpakowywania Javy (Linux): ${error.message}`)
          return
        }
        try {
          await fsPromises.unlink(installerPath)
        } catch {
          // ignoruj błędy usuwania pliku
        }
        resolve('Java została rozpakowana pomyślnie')
      })
    })
  } else if (plt === 'darwin') {
    return new Promise((resolve, reject) => {
      // 1. Rozpakowanie
      exec(`tar -xzf "${installerPath}" -C "${destDir}"`, async (error) => {
        if (error) {
          reject(`Błąd rozpakowywania Javy (macOS): ${error.message}`)
          return
        }

        try {
          const folderName = `${config.folderName}.jdk`
          const jdkFolder = path.join(destDir, folderName)
          const jdkHome = path.join(jdkFolder, 'Contents', 'Home')

          // 2. Usuwamy kwarantannę dla całego folderu .jdk
          const removeQuarantine = `chmod -R 755 "${jdkFolder}" && xattr -rd com.apple.quarantine "${jdkFolder}"`

          // 3. Nadajemy uprawnienia wykonywania dla binarów
          const addPermissions = `chmod -R +x "${jdkHome}/bin"`

          exec(`${removeQuarantine} && ${addPermissions}`, async (err) => {
            if (err) {
              Logger.error(`Błąd podczas ustawiania uprawnień: ${err.message}`)
            }

            await fsPromises.unlink(installerPath)
            resolve(`Java ${version} zainstalowana, odblokowana i gotowa do użycia`)
          })
        } catch (e) {
          reject(`Błąd post-instalacji: ${e}`)
        }
      })
    })
  }

  return Promise.resolve('Nie ma implementacji dla tej platformy')
}
