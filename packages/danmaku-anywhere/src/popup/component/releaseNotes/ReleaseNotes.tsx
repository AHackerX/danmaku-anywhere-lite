import { useEffect, useState } from 'react'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { ReleaseNotesDialog } from './ReleaseNotesDialog'
import { useLatestReleaseNotes } from './useLatestReleaseNotes'

export const ReleaseNotes = () => {
  const { partialUpdate, data: extensionOptions } = useExtensionOptions()
  const query = useLatestReleaseNotes()

  const [showDialog, setShowDialog] = useState(query.isSuccess)

  useEffect(() => {
    setShowDialog(query.isSuccess)
  }, [query.isSuccess])

  const handleClose = () => {
    setShowDialog(false)
    return partialUpdate({ showReleaseNotes: false })
  }

  if (!query.isSuccess) return null

  return (
    <ReleaseNotesDialog
      open={showDialog && extensionOptions.showReleaseNotes}
      onClose={handleClose}
      data={query.data}
    />
  )
}
