import { useEffect, useRef, useState } from 'react'
import * as faceapi from '@vladmandic/face-api'

export type FaceApiState =
  | { status: 'idle' }
  | { status: 'loading'; progress: number }
  | { status: 'ready' }
  | { status: 'error'; message: string }

const LOCAL_MODEL_PATHS = ['/models/tiny_face_detector', '/models/face_expression_model']
const CDN_MODELS = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'

export function useFaceApi(): FaceApiState {
  const [state, setState] = useState<FaceApiState>({ status: 'idle' })
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    async function load() {
      setState({ status: 'loading', progress: 0 })

      const nets = [
        faceapi.nets.tinyFaceDetector,
        faceapi.nets.faceExpressionNet,
      ]

      // Local models live in per-net subfolders; the CDN serves all nets from one shared path.
      const sourceSets = [LOCAL_MODEL_PATHS, [CDN_MODELS, CDN_MODELS]]

      for (let s = 0; s < sourceSets.length; s++) {
        const sources = sourceSets[s]
        try {
          for (let i = 0; i < nets.length; i++) {
            await nets[i].loadFromUri(sources[i])
            setState({ status: 'loading', progress: Math.round(((i + 1) / nets.length) * 100) })
          }
          setState({ status: 'ready' })
          return
        } catch {
          if (s === 0) {
            console.warn('Local face-api models not found, trying CDN…')
            setState({ status: 'loading', progress: 0 })
          } else {
            setState({ status: 'error', message: 'Could not load AI models. Check your connection.' })
          }
        }
      }
    }

    load()
  }, [])

  return state
}

export { faceapi }
