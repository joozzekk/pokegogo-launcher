import os from 'os'
import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'fs'
import https from 'https'
import http from 'http'

export function ensureDir(dir: string): void {
  if (existsSync(dir)) {
    const stat = statSync(dir)
    if (!stat.isDirectory()) {
      unlinkSync(dir)
    }
  }
  mkdirSync(dir, { recursive: true })
}

export function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod
      .get(url, (response) => {
        // Obsługa przekierowania
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          downloadFile(response.headers.location, dest).then(resolve).catch(reject)
          return
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Nie udało się pobrać pliku. Status: ${response.statusCode}`))
          return
        }
        const file = createWriteStream(dest)
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
        file.on('error', (err) => {
          reject(err)
        })
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

export const getMaxRAMInGB = (): number => {
  const totalMemoryBytes = os.totalmem()
  const totalMemoryGB = totalMemoryBytes / 1024 ** 3
  return Math.floor(totalMemoryGB)
}
