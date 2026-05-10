import { useEffect } from 'react'
import { usePipelineStore } from '@renderer/store/pipeline'

/**
 * Subscribes the global pipeline store to main-process events.
 * Mount once at the app root. Returns nothing.
 */
export function usePipelineEvents(): void {
  useEffect(() => {
    if (!window.sovereign?.pipeline) return
    const s = usePipelineStore.getState()

    const offProgress = window.sovereign.pipeline.onProgress(s._onProgress)
    const offEntity = window.sovereign.pipeline.onEntity(s._onEntity)
    const offLookup = window.sovereign.pipeline.onLookup(s._onLookup)
    const offMixer = window.sovereign.pipeline.onMixer(s._onMixer)
    const offDone = window.sovereign.pipeline.onDone(s._onDone)
    const offError = window.sovereign.pipeline.onError(s._onError)

    return () => {
      offProgress()
      offEntity()
      offLookup()
      offMixer()
      offDone()
      offError()
    }
  }, [])
}
