import {
  Add as AddIcon,
  Delete as DeleteIcon,
  SaveAlt as SaveIcon,
  FolderOpen as LoadIcon,
  Edit as EditIcon,
} from '@mui/icons-material'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import type { DanmakuGap } from '@danmaku-anywhere/danmaku-engine'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { uiContainer } from '@/common/ioc/uiIoc'
import { GapPresetsService } from '@/common/options/gapPresets/service'
import type { GapPreset } from '@/common/options/gapPresets/types'
import { getRandomUUID } from '@/common/utils/utils'

interface DanmakuGapsEditorProps {
  gaps: DanmakuGap[]
  onChange: (gaps: DanmakuGap[]) => void
}

// Parse raw digits input (e.g., "0130" -> 90 seconds)
const parseDigitsInput = (value: string): number => {
  // Remove non-digits
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (!digits) return 0

  // Pad to at least 2 digits
  const padded = digits.padStart(2, '0')
  const len = padded.length

  if (len <= 2) {
    // SS
    return Number.parseInt(padded, 10)
  } else if (len <= 4) {
    // MMSS
    const mm = Number.parseInt(padded.slice(0, -2), 10)
    const ss = Number.parseInt(padded.slice(-2), 10)
    return mm * 60 + ss
  } else {
    // HHMMSS
    const hh = Number.parseInt(padded.slice(0, -4), 10)
    const mm = Number.parseInt(padded.slice(-4, -2), 10)
    const ss = Number.parseInt(padded.slice(-2), 10)
    return hh * 3600 + mm * 60 + ss
  }
}

// Format seconds to display string with colons (e.g., 90 -> "01:30")
const formatTimeDisplay = (seconds: number): string => {
  if (seconds < 0) seconds = 0
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Format seconds to raw digits for editing (e.g., 90 -> "0130")
const formatTimeDigits = (seconds: number): string => {
  if (seconds < 0) seconds = 0
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}${m.toString().padStart(2, '0')}${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}${s.toString().padStart(2, '0')}`
}

interface TimeInputProps {
  value: number
  onChange: (value: number) => void
  label: string
}

const TimeInput = ({ value, onChange, label }: TimeInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [editValue, setEditValue] = useState('')

  const handleFocus = () => {
    setIsFocused(true)
    setEditValue(formatTimeDigits(value))
  }

  const handleBlur = () => {
    setIsFocused(false)
    onChange(parseDigitsInput(editValue))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 6 characters
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    setEditValue(digits)
  }

  return (
    <TextField
      size="small"
      label={label}
      value={isFocused ? editValue : formatTimeDisplay(value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      sx={{ width: 95, flexShrink: 0 }}
      slotProps={{
        input: { sx: { fontFamily: 'monospace', fontSize: '0.85rem' } },
        htmlInput: { maxLength: 6 },
      }}
    />
  )
}

interface DurationInputProps {
  start: number
  end: number
  onDurationChange: (duration: number) => void
}

const DurationInput = ({ start, end, onDurationChange }: DurationInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [editValue, setEditValue] = useState('')
  const { t } = useTranslation()

  const duration = Math.max(0, end - start)

  const handleFocus = () => {
    setIsFocused(true)
    setEditValue(duration.toString())
  }

  const handleBlur = () => {
    setIsFocused(false)
    const newDuration = Number.parseInt(editValue, 10)
    if (!isNaN(newDuration) && newDuration > 0) {
      onDurationChange(newDuration)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const digits = e.target.value.replace(/\D/g, '')
    setEditValue(digits)
  }

  return (
    <TextField
      size="small"
      label={t('stylePage.gaps.duration', 'Duration')}
      value={isFocused ? editValue : `${duration}s`}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      sx={{ width: 65, flexShrink: 0 }}
      slotProps={{
        input: { sx: { fontFamily: 'monospace', fontSize: '0.85rem' } },
      }}
    />
  )
}

export const DanmakuGapsEditor = ({
  gaps,
  onChange,
}: DanmakuGapsEditorProps) => {
  const { t } = useTranslation()
  const gapPresetsService = useMemo(() => uiContainer.get(GapPresetsService), [])
  const [presets, setPresets] = useState<GapPreset[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadDialogOpen, setLoadDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)

  useEffect(() => {
    gapPresetsService.get().then(setPresets)
    return gapPresetsService.onChange(setPresets)
  }, [gapPresetsService])

  const handleAddGap = () => {
    onChange([...gaps, { start: 0, end: 60, enabled: true }])
  }

  const handleRemoveGap = (index: number) => {
    onChange(gaps.filter((_, i) => i !== index))
  }

  const handleUpdateGap = (
    index: number,
    field: keyof DanmakuGap,
    value: number | boolean
  ) => {
    const newGaps = [...gaps]
    const gap = { ...newGaps[index], [field]: value }
    
    // Ensure start < end
    if (field === 'start' && typeof value === 'number' && value >= gap.end) {
      gap.end = value + 1
    } else if (field === 'end' && typeof value === 'number' && value <= gap.start) {
      gap.start = Math.max(0, value - 1)
    }
    
    newGaps[index] = gap
    onChange(newGaps)
  }

  const handleDurationChange = (index: number, duration: number) => {
    const gap = gaps[index]
    const newGaps = [...gaps]
    
    // If start is set (> 0), calculate end from start + duration
    // Otherwise, calculate start from end - duration
    if (gap.start > 0) {
      newGaps[index] = { ...gap, end: gap.start + duration }
    } else if (gap.end > 0) {
      newGaps[index] = { ...gap, start: Math.max(0, gap.end - duration) }
    } else {
      // Both are 0, set end to duration
      newGaps[index] = { ...gap, end: duration }
    }
    
    onChange(newGaps)
  }

  const handleSavePreset = async () => {
    if (!presetName.trim()) return
    await gapPresetsService.addPreset({
      id: getRandomUUID(),
      name: presetName.trim(),
      gaps: gaps,
    })
    setPresetName('')
    setSaveDialogOpen(false)
  }

  const handleLoadPreset = (preset: GapPreset) => {
    onChange(preset.gaps)
    setLoadDialogOpen(false)
  }

  const handleDeletePreset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await gapPresetsService.deletePreset(id)
  }

  const handleOpenRenameDialog = (preset: GapPreset, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPresetId(preset.id)
    setPresetName(preset.name)
    setRenameDialogOpen(true)
  }

  const handleRenamePreset = async () => {
    if (!editingPresetId || !presetName.trim()) return
    await gapPresetsService.updatePreset(editingPresetId, { name: presetName.trim() })
    setPresetName('')
    setEditingPresetId(null)
    setRenameDialogOpen(false)
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          {t(
            'stylePage.gaps.description',
            'Danmaku within these time ranges will be delayed until the range ends'
          )}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={t('stylePage.gaps.loadPreset', 'Load Preset')}>
            <IconButton size="small" onClick={() => setLoadDialogOpen(true)}>
              <LoadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('stylePage.gaps.savePreset', 'Save as Preset')}>
            <span>
              <IconButton
                size="small"
                onClick={() => setSaveDialogOpen(true)}
                disabled={gaps.length === 0}
              >
                <SaveIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddGap}
          >
            {t('common.add', 'Add')}
          </Button>
        </Stack>
      </Stack>

      {gaps.length === 0 && (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
          {t('stylePage.gaps.empty', 'No gaps configured')}
        </Typography>
      )}

      {[...gaps]
        .map((gap, index) => ({ gap, index }))
        .sort((a, b) => a.gap.start - b.gap.start)
        .map(({ gap, index }) => (
        <Stack
          key={index}
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            p: 1,
            borderRadius: 1,
            bgcolor: 'action.hover',
            flexWrap: 'nowrap',
          }}
        >
          <Checkbox
            size="small"
            checked={gap.enabled}
            onChange={(e) => handleUpdateGap(index, 'enabled', e.target.checked)}
            sx={{ flexShrink: 0 }}
          />
          <TimeInput
            value={gap.start}
            onChange={(val) => handleUpdateGap(index, 'start', val)}
            label={t('stylePage.gaps.start', 'Start')}
          />
          <DurationInput
            start={gap.start}
            end={gap.end}
            onDurationChange={(duration) => handleDurationChange(index, duration)}
          />
          <TimeInput
            value={gap.end}
            onChange={(val) => handleUpdateGap(index, 'end', val)}
            label={t('stylePage.gaps.end', 'End')}
          />
          <IconButton
            size="small"
            color="error"
            onClick={() => handleRemoveGap(index)}
            sx={{ flexShrink: 0, ml: 'auto' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}

      {/* Save Preset Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>{t('stylePage.gaps.savePreset', 'Save as Preset')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label={t('stylePage.gaps.presetName', 'Preset Name')}
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
            {t('common.save', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Preset Dialog */}
      <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)}>
        <DialogTitle>{t('stylePage.gaps.loadPreset', 'Load Preset')}</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          {presets.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
              {t('stylePage.gaps.noPresets', 'No presets saved')}
            </Typography>
          ) : (
            <List dense>
              {presets.map((preset) => (
                <ListItem
                  key={preset.id}
                  disablePadding
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => handleOpenRenameDialog(preset, e)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        color="error"
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemButton onClick={() => handleLoadPreset(preset)}>
                    <ListItemText
                      primary={preset.name}
                      secondary={t('stylePage.gaps.presetGapCount', '{{count}} gaps', {
                        count: preset.gaps.length,
                      })}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>{t('common.close', 'Close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Rename Preset Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle>{t('stylePage.gaps.renamePreset', 'Rename Preset')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label={t('stylePage.gaps.presetName', 'Preset Name')}
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={handleRenamePreset} disabled={!presetName.trim()}>
            {t('common.save', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
