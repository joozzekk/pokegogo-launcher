import { exec } from 'child_process'
import os from 'os'
import Logger from 'electron-log'

/**
 * Searches for a running Minecraft process associated with a specific instance path.
 * @param instancePath The absolute path to the game instance directory.
 * @returns The PID if found, null otherwise.
 */
export async function findMinecraftProcess(instancePath: string): Promise<number | null> {
  const platform = os.platform()
  const normalizedPath = instancePath.replace(/\\/g, '/') // Standardize slashes for detection

  return new Promise((resolve) => {
    let command = ''

    if (platform === 'win32') {
      // WMIC is reliable on Windows for getting full command line
      command =
        "wmic process where \"name='java.exe' or name='javaw.exe'\" get CommandLine,ProcessId"
    } else {
      // Standard ps on Unix-like systems
      command = 'ps ax -o pid,command'
    }

    exec(command, (error, stdout) => {
      if (error) {
        // Skip logging error if it's just "No Instance(s) Available" on Windows (code 2147749902 or similar)
        if (platform !== 'win32') {
          Logger.warn('GameScanner: Failed to list processes:', error)
        }
        return resolve(null)
      }

      const p1 = normalizedPath.toLowerCase()
      const p2 = instancePath.toLowerCase().replace(/\//g, '\\')
      const p3 = instancePath.toLowerCase().replace(/\\/g, '/')

      const lines = stdout.split('\n')
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        const lowerLine = trimmedLine.toLowerCase()

        if (lowerLine.includes(p1) || lowerLine.includes(p2) || lowerLine.includes(p3)) {
          // Extract PID. wmic output for 'CommandLine,ProcessId' usually has PID at the very end
          // after some whitespace. We must be careful as the CommandLine itself might contain numbers.
          let pidMatch: RegExpMatchArray | null = null
          if (platform === 'win32') {
            // Match the last sequence of digits on the line
            pidMatch = trimmedLine.match(/(\d+)\s*$/)
          } else {
            pidMatch = trimmedLine.match(/^(\d+)/)
          }

          if (pidMatch) {
            const pid = parseInt(pidMatch[1], 10)
            Logger.log(`GameScanner: Found active game process for ${instancePath} (PID: ${pid})`)
            return resolve(pid)
          }
        }
      }

      resolve(null)
    })
  })
}
