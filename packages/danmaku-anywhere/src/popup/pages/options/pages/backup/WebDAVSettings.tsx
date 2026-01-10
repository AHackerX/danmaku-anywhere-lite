import {
  CloudDownload,
  CloudUpload,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import {
  Button,
  Collapse,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import type { WebDAVConfig } from '@/common/options/webdav/types'
import { defaultWebDAVConfig } from '@/common/options/webdav/types'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

export const WebDAVSettings = () => {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const form = useForm<WebDAVConfig>({
    defaultValues: defaultWebDAVConfig,
  })

  const { control, watch, handleSubmit, reset } = form
  const enabled = watch('enabled')

  useEffect(() => {
    chromeRpcClient.webdavGetConfig().then((res) => {
      reset(res.data)
    })
  }, [reset])

  const onSave = async (data: WebDAVConfig) => {
    try {
      await chromeRpcClient.webdavSetConfig(data)
      toast.success(t('common.saved'))
    } catch (error) {
      toast.error(String(error))
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const config = form.getValues()
      const result = await chromeRpcClient.webdavTestConnection(config)
      if (result.data.success) {
        toast.success(t('optionsPage.webdav.testSuccess'))
      } else {
        toast.error(t('optionsPage.webdav.testFailed', { message: result.data.message }))
      }
    } catch (error) {
      toast.error(String(error))
    } finally {
      setIsTesting(false)
    }
  }

  const handleUpload = async () => {
    // Save current config first
    await handleSubmit(onSave)()
    
    setIsUploading(true)
    try {
      await chromeRpcClient.webdavUpload()
      toast.success(t('optionsPage.webdav.uploadSuccess'))
    } catch (error) {
      toast.error(t('optionsPage.webdav.uploadFailed', { message: String(error) }))
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async () => {
    // Save current config first
    await handleSubmit(onSave)()
    
    setIsDownloading(true)
    try {
      await chromeRpcClient.webdavSync()
      toast.success(t('optionsPage.webdav.downloadSuccess'))
    } catch (error) {
      toast.error(t('optionsPage.webdav.downloadFailed', { message: String(error) }))
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Stack spacing={2} mt={2} px={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" color="text.secondary">
          {t('optionsPage.webdav.title')}
        </Typography>
        <Controller
          name="enabled"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value}
              onChange={(e) => {
                field.onChange(e.target.checked)
                handleSubmit(onSave)()
              }}
            />
          )}
        />
      </Stack>
      
      <Collapse in={enabled}>
        <Stack spacing={2}>
          <Controller
            name="url"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('optionsPage.webdav.url')}
                placeholder="https://dav.example.com"
                size="small"
                fullWidth
                onBlur={() => handleSubmit(onSave)()}
              />
            )}
          />

          <Controller
            name="authType"
            control={control}
            render={({ field }) => (
              <FormControl size="small" fullWidth>
                <InputLabel>{t('optionsPage.webdav.authType')}</InputLabel>
                <Select
                  {...field}
                  label={t('optionsPage.webdav.authType')}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    handleSubmit(onSave)()
                  }}
                >
                  <MenuItem value="password">{t('optionsPage.webdav.authPassword')}</MenuItem>
                  <MenuItem value="none">{t('optionsPage.webdav.authNone')}</MenuItem>
                </Select>
              </FormControl>
            )}
          />

          <Collapse in={watch('authType') === 'password'}>
            <Stack spacing={2}>
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('optionsPage.webdav.username')}
                    size="small"
                    fullWidth
                    onBlur={() => handleSubmit(onSave)()}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('optionsPage.webdav.password')}
                    type={showPassword ? 'text' : 'password'}
                    size="small"
                    fullWidth
                    onBlur={() => handleSubmit(onSave)()}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              size="small"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                )}
              />
            </Stack>
          </Collapse>

          <Controller
            name="remotePath"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('optionsPage.webdav.remotePath')}
                placeholder="/danmaku-anywhere/config.json"
                size="small"
                fullWidth
                onBlur={() => handleSubmit(onSave)()}
              />
            )}
          />

          <Button
            variant="outlined"
            onClick={handleTest}
            disabled={isTesting || !watch('url')}
          >
            {t('optionsPage.webdav.testConnection')}
          </Button>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={handleUpload}
              disabled={isUploading || !watch('url')}
              fullWidth
            >
              {t('optionsPage.webdav.upload')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudDownload />}
              onClick={handleDownload}
              disabled={isDownloading || !watch('url')}
              fullWidth
            >
              {t('optionsPage.webdav.download')}
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            {t('optionsPage.webdav.description')}
          </Typography>
        </Stack>
      </Collapse>
    </Stack>
  )
}
