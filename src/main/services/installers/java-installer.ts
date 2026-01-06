import { exec } from 'child_process'
import { platform, arch } from 'os'
import { mkdirSync, promises as fsPromises } from 'fs'
import path, { join } from 'path'
import { app } from 'electron'
import { downloadFile, ensureDir } from '../../utils'
import Logger from 'electron-log'

const JAR_URLS = {
  21: {
    win: 'https://download.oracle.com/java/21/archive/jdk-21.0.8_windows-x64_bin.zip',
    linux: 'https://download.oracle.com/java/21/archive/jdk-21.0.8_linux-x64_bin.tar.gz',
    mac: 'https://download.oracle.com/java/21/archive/jdk-21.0.8_macos-x64_bin.tar.gz'
  }
}

function checkJavaInstalled(): Promise<boolean | string> {
  const plt = platform()

  return new Promise((resolve) => {
    fsPromises
      .readdir(
        join(
          app.getPath('userData'),
          plt !== 'darwin' ? 'java/jdk-21.0.8/bin' : 'java/jdk-21.0.8.jdk/Contents/Home/bin'
        )
      )
      .then((res) => {
        if (res) {
          resolve(true)
        }
      })
      .catch(() => resolve(false))
  })
}
export async function installJava(version: string): Promise<string> {
  const javaInstalled = await checkJavaInstalled()
  Logger.log('Java: ', javaInstalled)
  if (javaInstalled) {
    return Promise.resolve('Java jest już zainstalowana')
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
    javaUrl = JAR_URLS[version].win
    // Zmieniamy rozszerzenie na .zip
    installerPath = path.join(installerDir, 'java_installer.zip')
  } else if (plt === 'linux' && architecture === 'x64') {
    javaUrl = JAR_URLS[version].linux
    installerPath = path.join(installerDir, 'java_installer.tar.gz')
  } else if (plt === 'darwin') {
    javaUrl = JAR_URLS[version].mac
    installerPath = path.join(installerDir, 'java_installer.tar.gz')
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
          const jdkFolder = path.join(destDir, 'jdk-21.0.8.jdk')
          const jdkHome = path.join(destDir, 'jdk-21.0.8.jdk', 'Contents', 'Home')
          // const javaBinary = path.join(jdkHome, 'bin', 'java')

          // 2. Usuwamy kwarantannę dla całego folderu .jdk
          const removeQuarantine = `chmod -R 755 "${jdkFolder}" && xattr -rd com.apple.quarantine "${path.join(destDir, 'jdk-21.0.8.jdk')}"`

          // 3. Nadajemy uprawnienia wykonywania dla binarów
          const addPermissions = `chmod -R +x "${jdkHome}/bin"`

          exec(`${removeQuarantine} && ${addPermissions}`, async (err) => {
            if (err) {
              Logger.error(`Błąd podczas ustawiania uprawnień: ${err.message}`)
            }

            await fsPromises.unlink(installerPath)
            resolve('Java zainstalowana, odblokowana i gotowa do użycia')
          })
        } catch (e) {
          reject(`Błąd post-instalacji: ${e}`)
        }
      })
    })
  }

  return Promise.resolve('Nie ma implementacji dla tej platformy')
}
