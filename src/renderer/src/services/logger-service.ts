export const LOGGER = {
  success: (...args: string[]) => {
    console.log(
      '%cLauncher',
      'background: #00ff88; color: black; border-radius: 5px; padding-left: 4px; padding-right: 4px; padding-top: 2px; padding-bottom: 2px',
      ...args
    )
  },
  err: (...args: string[]) => {
    console.error(
      '%cLauncher',
      'background: #ff4757; color: black; border-radius: 5px; padding-left: 4px; padding-right: 4px; padding-top: 2px; padding-bottom: 2px',
      ...args
    )
  },
  log: (...args: string[]) => {
    console.log(
      '%cLauncher',
      'background: #0088ff; color: black; border-radius: 5px; padding-left: 4px; padding-right: 4px; padding-top: 2px; padding-bottom: 2px',
      ...args
    )
  }
}
