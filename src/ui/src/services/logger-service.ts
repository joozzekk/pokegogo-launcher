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

  err(...args: string[]): void {
    console.error(
      `%c${this.name}`,
      'background: #ff4757; color: black; border-radius: 5px; padding: 2px 4px;',
      ...args
    )
  }

  log(...args: string[]): void {
    console.log(
      `%c${this.name}`,
      'background: #0088ff; color: black; border-radius: 5px; padding: 2px 4px;',
      ...args
    )
  }
}

export const LOGGER = new LoggerService('Launcher')
