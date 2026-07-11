import { app, ipcMain, BrowserWindow } from 'electron'
import { join, extname } from 'path'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import axios from 'axios'
import { ensureDir, downloadFile } from '../utils'
import Logger from 'electron-log'

const CACHE_DIR = join(app.getPath('userData'), 'cache', 'events')

interface ImageMeta {
  lastModified?: string
  contentLength?: string
}

export const useImageCacheService = (mainWindow: BrowserWindow | null): void => {
  ensureDir(CACHE_DIR)

  if (!ipcMain.listenerCount('image:get-event')) {
    ipcMain.handle('image:get-event', async (_, uuid: string, url: string) => {
      const extension = extname(new URL(url).pathname) || '.webp'
      const filePath = join(CACHE_DIR, `${uuid}${extension}`)
      const metaPath = join(CACHE_DIR, `${uuid}.json`)

      const localUrl = `local-image://${uuid}${extension}`

      // If file exists, return local URL immediately but revalidate in background
      if (existsSync(filePath)) {
        revalidateImage(uuid, url, filePath, metaPath, mainWindow)
        return localUrl
      }

      // If not exists, download it
      try {
        await downloadAndSave(url, filePath, metaPath)
        return localUrl
      } catch (err) {
        Logger.error(`[ImageCache] Failed to download initial image for ${uuid}:`, err)
        return url // Fallback to remote URL
      }
    })
  }
}

async function downloadAndSave(url: string, filePath: string, metaPath: string): Promise<void> {
  await downloadFile(url, filePath)

  // Get and save metadata
  try {
    const head = await axios.head(url)
    const meta: ImageMeta = {
      lastModified: head.headers['last-modified']
        ? String(head.headers['last-modified'])
        : undefined,
      contentLength: head.headers['content-length']
        ? String(head.headers['content-length'])
        : undefined
    }
    writeFileSync(metaPath, JSON.stringify(meta), 'utf8')
  } catch (err) {
    Logger.warn(`[ImageCache] Failed to fetch metadata for ${url}:`, err)
  }
}

async function revalidateImage(
  uuid: string,
  url: string,
  filePath: string,
  metaPath: string,
  mainWindow: BrowserWindow | null
): Promise<void> {
  try {
    const head = await axios.head(url)
    const remoteLastModified = head.headers['last-modified']
      ? String(head.headers['last-modified'])
      : undefined
    const remoteContentLength = head.headers['content-length']
      ? String(head.headers['content-length'])
      : undefined

    let needsUpdate = false
    if (existsSync(metaPath)) {
      const meta: ImageMeta = JSON.parse(readFileSync(metaPath, 'utf8'))
      if (meta.lastModified !== remoteLastModified || meta.contentLength !== remoteContentLength) {
        needsUpdate = true
      }
    } else {
      needsUpdate = true
    }

    if (needsUpdate) {
      Logger.log(`[ImageCache] Image ${uuid} changed on server. Updating...`)
      await downloadAndSave(url, filePath, metaPath)

      // Notify fallback/refresh if needed
      if (mainWindow) {
        const extension = extname(new URL(url).pathname) || '.webp'
        mainWindow.webContents.send(
          `image:updated:${uuid}`,
          `local-image://${uuid}${extension}?t=${Date.now()}`
        )
      }
    }
  } catch (err) {
    // Silent fail for revalidation (keep using existing cache)
    Logger.warn(`[ImageCache] Revalidation failed for ${uuid}:`, err)
  }
}
