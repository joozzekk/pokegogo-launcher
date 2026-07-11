import { net } from 'electron'

export class DiscordLogger {
  private webhookUrl: string

  constructor() {
    this.webhookUrl = import.meta.env.VITE_DISCORD_ERROR_URL
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendError(title: string, details: any, user?: string): void {
    if (!this.webhookUrl) return

    const fields = [
      {
        name: 'Details',
        value: this.formatDetails(details)
      },
      {
        name: 'Time',
        value: new Date().toISOString()
      },
      {
        name: 'Platform',
        value: process.platform
      }
    ]

    if (user) {
      fields.unshift({
        name: 'User',
        value: user
      })
    }

    const embeds = [
      {
        title: `🚨 ${title}`,
        color: 15158332, // Red color
        fields
      }
    ]

    const request = net.request({
      method: 'POST',
      url: this.webhookUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    request.on('error', (err) => {
      console.error('Failed to send error to Discord:', err)
    })

    request.write(JSON.stringify({ embeds }))
    request.end()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatDetails(details: any): string {
    if (typeof details === 'string') return details.substring(0, 1000)
    if (details instanceof Error) {
      return `**Message:** ${details.message}\n**Stack:**\n\`\`\`${
        details.stack?.substring(0, 800) || 'No stack trace'
      }\`\`\``
    }
    try {
      return `\`\`\`json\n${JSON.stringify(details, null, 2).substring(0, 800)}\n\`\`\``
    } catch {
      return String(details).substring(0, 1000)
    }
  }
}

export const discordLogger = new DiscordLogger()
