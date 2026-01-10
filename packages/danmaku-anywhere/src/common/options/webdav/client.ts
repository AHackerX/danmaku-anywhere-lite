import type { WebDAVConfig } from './types'

export class WebDAVClient {
  private config: WebDAVConfig

  constructor(config: WebDAVConfig) {
    this.config = config
  }

  private getAuthHeader(): string | null {
    if (this.config.authType === 'none') {
      return null
    }
    const credentials = btoa(`${this.config.username}:${this.config.password}`)
    return `Basic ${credentials}`
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    const auth = this.getAuthHeader()
    if (auth) {
      headers['Authorization'] = auth
    }
    return headers
  }

  private getFullUrl(path: string): string {
    const baseUrl = this.config.url.replace(/\/$/, '')
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${baseUrl}${cleanPath}`
  }

  /** Ensure parent directories exist */
  private async ensureDirectory(path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean)
    parts.pop() // Remove filename
    
    let currentPath = ''
    for (const part of parts) {
      currentPath += `/${part}`
      try {
        await fetch(this.getFullUrl(currentPath), {
          method: 'MKCOL',
          headers: this.getHeaders(),
        })
      } catch {
        // Directory might already exist, ignore errors
      }
    }
  }

  async upload(path: string, content: string): Promise<void> {
    await this.ensureDirectory(path)
    
    const response = await fetch(this.getFullUrl(path), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: content,
    })

    if (!response.ok && response.status !== 201 && response.status !== 204) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }
  }

  async download(path: string): Promise<string> {
    const response = await fetch(this.getFullUrl(path), {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('File not found')
      }
      throw new Error(`Download failed: ${response.status} ${response.statusText}`)
    }

    return response.text()
  }

  async exists(path: string): Promise<boolean> {
    try {
      const response = await fetch(this.getFullUrl(path), {
        method: 'HEAD',
        headers: this.getHeaders(),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(this.getFullUrl('/'), {
        method: 'PROPFIND',
        headers: {
          ...this.getHeaders(),
          'Depth': '0',
        },
      })

      if (response.ok || response.status === 207) {
        return { success: true }
      }

      if (response.status === 401) {
        return { success: false, message: 'Authentication failed' }
      }

      return { success: false, message: `Server returned ${response.status}` }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
