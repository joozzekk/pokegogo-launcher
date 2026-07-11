import { discordLogger } from './discord-service'

class LoggerService {
  private name: string

  constructor(name: string = 'Launcher') {
    this.name = name
  }

  // Metoda tworząca nową instancję z nową nazwą
  with(name: string): LoggerService {
    return new LoggerService(name)
  }

  success(...args: string[]): void {
    console.log(
      `%c${this.name}`,
      'background: #00ff88; color: black; border-radius: 5px; padding: 2px 4px;',
      ...args
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  err(...args: any[]): void {
    console.error(
      `%c${this.name}`,
      'background: #ff4757; color: black; border-radius: 5px; padding: 2px 4px;',
      ...args
    )
    discordLogger.sendError(`[Logger] ${this.name} Error`, args)
  }

  log(...args: string[]): void {
    console.log(
      `%c${this.name}`,
      'background: #0088ff; color: black; border-radius: 5px; padding: 2px 4px;',
      ...args
    )
  }

  warn(...args: string[]): void {
    console.warn(
      `%c${this.name}`,
      'background: #ffcc00; color: black; border-radius: 5px; padding: 2px 4px;',
      ...args
    )
  }
}

export const LOGGER = new LoggerService('Launcher')
