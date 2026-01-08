import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/content/controller/store/store'
import { useLoadDanmaku } from './useLoadDanmaku'

/**
 * Hook to automatically mount danmaku when the page loads
 * if there's a saved mapping for the current URL.
 *
 * Auto-mount works regardless of the mount config mode (manual/xpath/ai).
 * If the user previously manually mounted danmaku on a page, we respect that choice
 * and auto-mount the same danmaku on subsequent visits.
 */
export const useAutoMountDanmaku = () => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const { mountDanmaku } = useLoadDanmaku()

  const { data: extensionOptions } = useExtensionOptions()
  const autoMountEnabled = extensionOptions.autoMountDanmaku

  const { isMounted } = useStore.use.danmaku()
  const hasVideo = useStore((state) => state.hasVideo())
  const videoId = useStore.use.videoId?.()

  // Track if we've already attempted auto-mount for this page
  const hasAttemptedRef = useRef(false)
  // Track the URL we last attempted to auto-mount for
  const lastUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const currentUrl = window.location.href

    // Reset attempt flag if URL changed
    if (lastUrlRef.current !== currentUrl) {
      hasAttemptedRef.current = false
      lastUrlRef.current = currentUrl
    }

    // Skip if:
    // - Auto-mount is disabled in settings
    // - Already mounted
    // - Already attempted for this URL
    // - No video detected
    if (
      !autoMountEnabled ||
      isMounted ||
      hasAttemptedRef.current ||
      !hasVideo
    ) {
      return
    }

    // Mark as attempted to prevent multiple attempts
    hasAttemptedRef.current = true

    const autoMount = async () => {
      try {
        Logger.debug('Auto-mount: checking for saved mapping', {
          currentUrl,
          autoMountEnabled,
          isMounted,
          hasVideo,
        })

        // Check if there's a saved mapping for this URL
        const mapping = await chromeRpcClient.danmakuMappingGet(currentUrl)

        Logger.debug('Auto-mount: mapping result', mapping)

        if (!mapping || !mapping.data) {
          Logger.debug('No saved danmaku mapping for this URL')
          return
        }

        Logger.debug(
          'Found saved danmaku mapping, attempting auto-mount',
          mapping
        )

        // Fetch the episodes from the database
        const { episodeIds, isCustom } = mapping.data

        // Separate custom and regular episode IDs
        const customIds: number[] = []
        const regularIds: number[] = []

        episodeIds.forEach((id: number, index: number) => {
          if (isCustom[index]) {
            customIds.push(id)
          } else {
            regularIds.push(id)
          }
        })

        // Fetch episodes from database
        const episodes = []

        if (regularIds.length > 0) {
          const regularEpisodes = await chromeRpcClient.episodeFilter({
            ids: regularIds,
          })
          episodes.push(...regularEpisodes.data)
        }

        if (customIds.length > 0) {
          const customEpisodes = await chromeRpcClient.episodeFilterCustom({
            ids: customIds,
          })
          episodes.push(...customEpisodes.data)
        }

        if (episodes.length === 0) {
          Logger.debug('Saved episodes no longer exist in database')
          // Remove the stale mapping
          await chromeRpcClient.danmakuMappingRemove(currentUrl)
          return
        }

        // Mount the danmaku
        toast.info(t('danmaku.alert.autoMounting'))

        await mountDanmaku(episodes)

        Logger.debug('Auto-mounted danmaku successfully')
      } catch (err) {
        Logger.debug('Failed to auto-mount danmaku:', err)
        // Don't show error to user, this is a background feature
      }
    }

    // Small delay to ensure the page is ready
    const timeoutId = setTimeout(autoMount, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [autoMountEnabled, hasVideo, isMounted, videoId, mountDanmaku, toast, t])
}
