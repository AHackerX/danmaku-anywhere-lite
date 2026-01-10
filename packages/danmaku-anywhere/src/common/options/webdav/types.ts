export type WebDAVAuthType = 'password' | 'none'

export interface WebDAVConfig {
  enabled: boolean
  url: string
  username: string
  password: string
  authType: WebDAVAuthType
  /** Remote path for config file */
  remotePath: string
}

export const defaultWebDAVConfig: WebDAVConfig = {
  enabled: false,
  url: '',
  username: '',
  password: '',
  authType: 'password',
  remotePath: '/danmaku-anywhere/config.json',
}

export interface WebDAVTestResult {
  success: boolean
  message?: string
}
