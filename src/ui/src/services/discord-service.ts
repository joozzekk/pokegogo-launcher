export class DiscordService {
  private webhookUrl: string
  private logWebhookUrl: string

  constructor() {
    this.webhookUrl = import.meta.env.VITE_DISCORD_ERROR_URL
    this.logWebhookUrl = import.meta.env.VITE_DISCORD_ERROR_URL
  }

  async sendError(title: string, details: unknown, user?: string): Promise<void> {
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
        name: 'User Agent',
        value: navigator.userAgent
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

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ embeds })
      })
    } catch (error) {
      console.error('Failed to send error to Discord:', error)
    }
  }

  async sendLog(title: string, fields: { name: string; value: string }[]): Promise<void> {
    if (!this.logWebhookUrl) return

    const embeds = [
      {
        title: `📝 ${title}`,
        color: 3447003, // Blue color
        fields: [
          ...fields,
          {
            name: 'Time',
            value: new Date().toISOString()
          }
        ]
      }
    ]

    try {
      await fetch(this.logWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ embeds })
      })
    } catch (error) {
      console.error('Failed to send log to Discord:', error)
    }
  }

  private formatDetails(details: unknown): string {
    if (typeof details === 'string') return details
    if (details instanceof Error) {
      return `**Message:** ${details.message}\n**Stack:**\n\`\`\`${
        details.stack?.substring(0, 800) || 'No stack trace'
      }\`\`\``
    }
    try {
      return `\`\`\`json\n${JSON.stringify(details, null, 2).substring(0, 800)}\n\`\`\``
    } catch {
      return String(details)
    }
  }
}

export const discordLogger = new DiscordService()
