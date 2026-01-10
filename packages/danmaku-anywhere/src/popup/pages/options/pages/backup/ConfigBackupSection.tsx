import { Download, Upload } from '@mui/icons-material'
import {
  Button,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { ConfigBackup } from '@/common/options/configBackup/types'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const ConfigBackupSection = () => {
  const { t } = useTranslation()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await chromeRpcClient.configBackupExport()
      const backup = result.data
      const json = JSON.stringify(backup, null, 2)
      
      const defaultFilename = `danmaku-anywhere-config-${new Date().toISOString().split('T')[0]}.json`
      
      // Try to use File System Access API for better UX
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: defaultFilename,
            types: [{
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] },
            }],
          })
          const writable = await handle.createWritable()
          await writable.write(json)
          await writable.close()
          toast.success(t('optionsPage.configBackup.exportSuccess'))
          return
        } catch (e) {
          // User cancelled or API not supported, fall through to download
          if ((e as Error).name === 'AbortError') {
            return
          }
        }
      }
      
      // Fallback to traditional download
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultFilename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('optionsPage.configBackup.exportSuccess'))
    } catch (error) {
      toast.error(t('optionsPage.configBackup.exportError', { message: String(error) }))
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (file: File) => {
    setIsImporting(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      
      // Handle both wrapped (from RPC) and unwrapped formats
      const backup: ConfigBackup = parsed.data ?? parsed

      if (!backup.version || !backup.danmakuOptions) {
        throw new Error('Invalid config backup file')
      }

      await chromeRpcClient.configBackupImport(backup)
      toast.success(t('optionsPage.configBackup.importSuccess'))
    } catch (error) {
      toast.error(t('optionsPage.configBackup.importError', { message: String(error) }))
    } finally {
      setIsImporting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleImport(file)
    }
    // Reset input so the same file can be selected again
    event.target.value = ''
  }

  return (
    <Stack spacing={2} mt={2} px={2}>
      <Typography variant="subtitle2" color="text.secondary">
        {t('optionsPage.configBackup.title')}
      </Typography>
      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleExport}
          disabled={isExporting}
          fullWidth
        >
          {t('optionsPage.configBackup.export')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<Upload />}
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          fullWidth
        >
          {t('optionsPage.configBackup.import')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {t('optionsPage.configBackup.description')}
      </Typography>
      <Divider />
    </Stack>
  )
}
