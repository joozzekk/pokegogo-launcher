import { exec } from 'child_process'
import { platform, arch } from 'os'
import { mkdirSync, promises as fsPromises } from 'fs'
import path from 'path'
import { app } from 'electron'
import { downloadFile, ensureDir } from '../../utils'

const JAR_URLS = {
  21: {
    win: 'https://download.oracle.com/java/21/archive/jdk-21.0.8_windows-x64_bin.exe',
    linux: 'https://download.oracle.com/java/21/archive/jdk-21.0.8_linux-aarch64_bin.tar.gz',
    mac: ''
  }
}

function checkJavaInstalled(): Promise<boolean | string> {
  return new Promise((resolve) => {
    switch (platform()) {
      case 'win32':
        fsPromises
          .readdir('C:/Program Files/java/jdk-21/bin')
          .then((res) => {
            if (res) {
              resolve(true)
            }
          })
          .catch(() => resolve(false))
        break
      case 'linux':
        fsPromises
          .readdir('/usr/bin/java')
          .then((res) => {
            if (res) {
              resolve(true)
            }
          })
          .catch(() => resolve(false))
        break
    }
  })
}

export async function installJava(version: string): Promise<string> {
  const javaInstalled = await checkJavaInstalled()
  if (javaInstalled) {
    return Promise.resolve('Java jest już zainstalowana')
  }

  const plt = platform()
  const architecture = arch()
  let javaUrl = ''
  const installerDir = path.join(app.getPath('downloads'))
  ensureDir(installerDir)

  let installerPath = ''

  if (plt === 'win32' && architecture === 'x64') {
    javaUrl = JAR_URLS[version].win
    installerPath = path.join(installerDir, 'java_installer.exe')
  } else if (plt === 'linux' && architecture === 'x64') {
    javaUrl = JAR_URLS[version].linux
    installerPath = path.join(installerDir, 'java_installer.tar.gz')
  } else {
    return Promise.reject('Platforma lub architektura nie jest wspierana')
  }

  await downloadFile(javaUrl, installerPath)

  if (plt === 'win32') {
    return new Promise((resolve, reject) => {
      exec(
        `start /wait "" "${installerPath}" /s INSTALLDIR="C:\\Program Files\\java"`,
        async (error) => {
          if (error) {
            reject(`Błąd instalacji Javy: ${error.message}`)
            return
          }
          try {
            await fsPromises.unlink(installerPath)
          } catch {
            // ignoruj błędy usuwania pliku
          }
          resolve('Java została zainstalowana pomyślnie')
        }
      )
    })
  } else if (plt === 'linux') {
    return new Promise((resolve, reject) => {
      const destDir = path.join(process.env.HOME || '', 'java')
      mkdirSync(destDir, { recursive: true })

      exec(`tar -xzf "${installerPath}" -C "${destDir}"`, async (error) => {
        if (error) {
          reject(`Błąd rozpakowywania Javy: ${error.message}`)
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
  }

  return Promise.resolve('Nie ma implementacji dla tej platformy')
}
