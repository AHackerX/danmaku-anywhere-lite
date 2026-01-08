import { GitHub } from '@mui/icons-material'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import { ExternalLink } from '@/common/components/ExternalLink'
import type { ReleaseNotesResponse } from './useLatestReleaseNotes'

interface ReleaseNotesDialogProps {
  open: boolean
  onClose: () => void
  data: ReleaseNotesResponse | undefined
}

export const ReleaseNotesDialog = ({
  open,
  onClose,
  data,
}: ReleaseNotesDialogProps) => {
  const { t } = useTranslation()

  if (!data) return null

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          {data.name}
          <ExternalLink
            to={data.html_url}
            target="_blank"
            rel="noreferrer"
            style={{ float: 'right', lineHeight: 0 }}
            icon={<GitHub fontSize="inherit" color="primary" />}
          />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div">
          <Markdown urlTransform={(url) => url}>{data.body}</Markdown>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="success" variant="contained">
          {t('common.acknowledge', 'Ok')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
