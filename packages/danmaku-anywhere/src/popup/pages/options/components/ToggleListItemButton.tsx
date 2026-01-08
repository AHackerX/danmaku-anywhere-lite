import { Warning } from '@mui/icons-material'
import {
  CircularProgress,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Tooltip,
} from '@mui/material'
import type { ReactNode } from 'react'

interface ToggleListItemButtonProps {
  enabled: boolean
  disableToggle?: boolean
  onToggle: (checked: boolean) => void
  itemText: string
  secondaryText?: string
  isLoading?: boolean
  showWarning?: boolean
  warningTooltip?: ReactNode
  prefix?: ReactNode
}

export const ToggleListItemButton = ({
  itemText,
  secondaryText,
  onToggle,
  enabled,
  disableToggle,
  isLoading,
  showWarning,
  warningTooltip,
}: ToggleListItemButtonProps) => {
  return (
    <ListItem
      secondaryAction={
        isLoading ? (
          <CircularProgress size={24} sx={{ mr: 2 }} />
        ) : (
          <Switch
            checked={enabled}
            onChange={(e) => {
              onToggle(e.target.checked)
            }}
            disabled={disableToggle || isLoading}
          />
        )
      }
    >
      <ListItemText
        primary={itemText}
        secondary={secondaryText}
        sx={{ pr: 6 }}
      />
      {showWarning && (
        <ListItemIcon>
          <Tooltip
            slotProps={{
              popper: {
                // prevent clicks being propagated to the parent
                onMouseDown(e) {
                  e.stopPropagation()
                },
                onClick(e) {
                  e.stopPropagation()
                },
              },
            }}
            title={warningTooltip}
          >
            <Warning color="warning" />
          </Tooltip>
        </ListItemIcon>
      )}
    </ListItem>
  )
}
