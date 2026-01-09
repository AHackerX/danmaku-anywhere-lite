import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import {
  RESET_EXTENSION_BUTTON,
  settingConfigs,
  UPLOAD_DEBUG_DATA_BUTTON,
} from '@/common/settings/settingConfigs'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { ConfigBackupSection } from '@/popup/pages/options/pages/advanced/ConfigBackup'
import { DeclarativeButtonSetting } from '@/popup/pages/options/components/DeclarativeButtonSetting'
import { DeclarativeToggleSetting } from '@/popup/pages/options/components/DeclarativeToggleSetting'

export const AdvancedOptions = () => {
  const { t } = useTranslation()
  const { data, partialUpdate, isLoading } = useExtensionOptions()
  const dialog = useDialog()
  const [isResetting, setIsResetting] = useState(false)

  const handleResetExtension = () => {
    dialog.delete({
      title: t('optionsPage.resetExtension.title', 'Reset Extension'),
      content: t(
        'optionsPage.resetExtension.message',
        'Are you sure you want to reset the extension? This will delete all settings, saved danmaku, and cached data. This action cannot be undone.'
      ),
      confirmText: t('optionsPage.resetExtension.confirm', 'Reset'),
      onConfirm: async () => {
        setIsResetting(true)
        await chromeRpcClient.resetExtension()
        // Extension will reload, so we don't need to handle the response
      },
    })
  }

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.advanced', 'Advanced')} />
      {settingConfigs.advanced.map((config) => (
        <DeclarativeToggleSetting
          key={config.id}
          config={config}
          state={data}
          onUpdate={partialUpdate}
          isLoading={isLoading}
        />
      ))}
      <DeclarativeButtonSetting
        config={UPLOAD_DEBUG_DATA_BUTTON}
        isLoading={isLoading}
      />
      <ConfigBackupSection />
      <DeclarativeButtonSetting
        config={RESET_EXTENSION_BUTTON}
        isLoading={isLoading || isResetting}
        onClick={handleResetExtension}
      />
    </OptionsPageLayout>
  )
}
