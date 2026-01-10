import { useTranslation } from 'react-i18next'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { ConfigBackupSection } from './ConfigBackupSection'
import { WebDAVSettings } from './WebDAVSettings'

export const BackupSyncPage = () => {
  const { t } = useTranslation()

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.backupSync')} />
      <ConfigBackupSection />
      <WebDAVSettings />
    </OptionsPageLayout>
  )
}
