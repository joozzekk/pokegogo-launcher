import { exec } from 'child_process'
import { platform, arch } from 'os'
import { mkdirSync, promises as fsPromises } from 'fs'
import path from 'path'
import { app } from 'electron'
import { downloadFile, ensureDir } from '../../utils'

function checkJavaInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('java -version', (error) => {
      resolve(!error)
    })
  })
}

export async function installJava(): Promise<string> {
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
    javaUrl = 'https://download.oracle.com/java/17/archive/jdk-17.0.12_windows-x64_bin.exe'
    installerPath = path.join(installerDir, 'java_installer.exe')
  } else if (plt === 'linux' && architecture === 'x64') {
    javaUrl = 'https://download.oracle.com/java/17/archive/jdk-17.0.12_linux-aarch64_bin.tar.gz'
    installerPath = path.join(installerDir, 'java_installer.tar.gz')
  } else {
    return Promise.reject('Platforma lub architektura nie jest wspierana')
  }

  await downloadFile(javaUrl, installerPath)

  if (plt === 'win32') {
    return new Promise((resolve, reject) => {
      exec(`start /wait "" "${installerPath}" /s`, async (error) => {
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
      })
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
