import { useEffect, useRef, useState } from 'react'
import { useFaceApi, faceapi } from '@/hooks/useFaceApi'
import { wellnessApi } from '@/api/wellness'
import type { MultimodalPayload } from '@/api/wellness'

// NOTE: the hardcoded teal in this file is deliberate and does NOT follow the
// user's accent. This screen is a self-contained dark "scanner instrument"
// surface — rings, confidence bars, glow — rather than ordinary app chrome, and
// re-tinting it to an arbitrary accent (pale yellow, say) would wreck it. The
// two primary CTAs still use --sp-primary so the way *out* of the screen
// matches the rest of the app.

// ─── Types ────────────────────────────────────────────────────────────────────

interface FacialResult {
  emotion: string
  confidence: number
  microexpressions: Record<string, number>
  frameCount: number
}

interface VoiceResult {
  emotion: string
  confidence: number
  analysis: string
  features?: Record<string, number>
  skipped?: boolean
  unavailable?: boolean
}

type Phase = 'loading' | 'start' | 'facial' | 'voice' | 'analyzing' | 'results' | 'done'
type ValidatedFeeling = 'excellent' | 'good' | 'neutral' | 'struggling' | 'critical'

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOTION_META: Record<string, { emoji: string; color: string }> = {
  happy:     { emoji: '😊', color: 'text-emerald-400' },
  sad:       { emoji: '😢', color: 'text-sky-400' },
  neutral:   { emoji: '😐', color: 'text-slate-400' },
  angry:     { emoji: '😠', color: 'text-red-400' },
  surprised: { emoji: '😲', color: 'text-teal-400' },
  fearful:   { emoji: '😰', color: 'text-teal-400' },
  disgusted: { emoji: '🤢', color: 'text-yellow-400' },
}

const VOICE_PROMPTS = [
  'How has your day been so far?',
  "What's one thing that happened today?",
  'How are you feeling right now?',
  'Tell us about your mood today.',
  "What's on your mind?",
]

const FEELINGS: { value: ValidatedFeeling; label: string; emoji: string; desc: string }[] = [
  { value: 'excellent',  label: 'Excellent',  emoji: '🌟', desc: 'Feeling great, full of energy' },
  { value: 'good',       label: 'Good',       emoji: '😊', desc: 'Generally positive' },
  { value: 'neutral',    label: 'Neutral',    emoji: '😐', desc: 'Neither good nor bad' },
  { value: 'struggling', label: 'Struggling', emoji: '😔', desc: 'Having a hard time' },
  { value: 'critical',   label: 'Critical',   emoji: '🆘', desc: 'Need support now' },
]

const CONSISTENCY_MAP: Record<string, Record<string, 'high' | 'medium' | 'low'>> = {
  happy:     { calm: 'high', energetic: 'high', content: 'high', stressed: 'low', anxious: 'low', tired: 'low' },
  sad:       { tired: 'high', stressed: 'medium', anxious: 'medium', calm: 'low', energetic: 'low' },
  neutral:   { calm: 'high', content: 'high', neutral: 'high' },
  angry:     { stressed: 'high', anxious: 'high', calm: 'low', energetic: 'low' },
  fearful:   { anxious: 'high', stressed: 'high', calm: 'low' },
  surprised: { energetic: 'high' },
  disgusted: { stressed: 'medium', anxious: 'medium' },
}

function getConsistency(facial: string, voice: string): 'high' | 'medium' | 'low' | 'single_mode' {
  return CONSISTENCY_MAP[facial]?.[voice] ?? 'low'
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function ProgressRing({ progress }: { progress: number }) {
  const r = 26
  const circumference = 2 * Math.PI * r
  const offset = circumference - (circumference * progress) / 100
  return (
    <svg width="68" height="68" className="-rotate-90">
      <circle cx="34" cy="34" r={r} stroke="rgba(13,148,136,0.2)" strokeWidth="4" fill="none" />
      <circle cx="34" cy="34" r={r} stroke="#0d9488" strokeWidth="4" fill="none"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.3s' }} />
    </svg>
  )
}

function ConfBar({ value, color = 'bg-teal-500' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${(value * 100).toFixed(0)}%` }} />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MultimodalWellnessCheck({ onClose, onSubmitted }: {
  onClose: () => void
  onSubmitted: () => void
}) {
  const faceState = useFaceApi()
  const [phase, setPhase] = useState<Phase>('loading')
  const [facialResult, setFacialResult] = useState<FacialResult | null>(null)
  const [voiceResult, setVoiceResult] = useState<VoiceResult | null>(null)
  const [selectedFeeling, setSelectedFeeling] = useState<ValidatedFeeling | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Facial phase state
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facialProgress, setFacialProgress] = useState(0)
  const [frameCount, setFrameCount] = useState(0)
  const [faceDetected, setFaceDetected] = useState(false)

  // Voice phase state
  const [voicePrompt] = useState(() => VOICE_PROMPTS[Math.floor(Math.random() * VOICE_PROMPTS.length)])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(20).fill(8))
  const [voiceProcessing, setVoiceProcessing] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Transition from loading → start once models are ready
  useEffect(() => {
    if (faceState.status === 'ready' && phase === 'loading') setPhase('start')
    if (faceState.status === 'error' && phase === 'loading') setPhase('start') // allow skip-to-standard
  }, [faceState.status, phase])

  // The <video> element only exists in the DOM once phase === 'facial' (it's behind
  // a phase-conditional render below). Attaching the stream has to happen in an effect
  // that fires *after* that render commits — doing it inline inside startFacial(),
  // before setPhase('facial') takes effect, silently no-ops on a still-null videoRef
  // and leaves the preview permanently black with no error.
  useEffect(() => {
    if (phase === 'facial' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [phase])

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  // ── Phase 1: Facial ────────────────────────────────────────────────────────

  async function startFacial() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' }, audio: true })
      streamRef.current = stream
      setPhase('facial')
      runFacialAnalysis(stream)
    } catch {
      setPhase('start')
    }
  }

  async function runFacialAnalysis(stream: MediaStream) {
    void stream
    const video = videoRef.current
    if (!video) return

    const detections: Record<string, number>[] = []
    const TOTAL_FRAMES = 75
    let processed = 0

    const interval = setInterval(async () => {
      try {
        const det = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceExpressions()

        if (det?.expressions) {
          const exps = det.expressions as unknown as Record<string, number>
          detections.push(exps)
          setFaceDetected(true)
          setFrameCount(detections.length)
        }
      } catch { /* skip frame */ }

      processed++
      setFacialProgress(Math.round((processed / TOTAL_FRAMES) * 100))

      if (processed >= TOTAL_FRAMES) {
        clearInterval(interval)

        if (detections.length < 5) {
          // Not enough — default to neutral
          setFacialResult({ emotion: 'neutral', confidence: 0.5, microexpressions: {}, frameCount: detections.length })
        } else {
          // Average all frames
          const sums: Record<string, number> = {}
          detections.forEach(d => Object.entries(d).forEach(([k, v]) => { sums[k] = (sums[k] ?? 0) + v }))
          const avg: Record<string, number> = {}
          Object.entries(sums).forEach(([k, v]) => { avg[k] = v / detections.length })
          const [topEmotion, topConf] = Object.entries(avg).reduce((a, b) => b[1] > a[1] ? b : a)
          setFacialResult({ emotion: topEmotion, confidence: topConf, microexpressions: avg, frameCount: detections.length })
        }

        // Move to voice
        setTimeout(() => setPhase('voice'), 800)
      }
    }, 200)
  }

  function skipFacial() {
    setFacialResult({ emotion: 'neutral', confidence: 0.5, microexpressions: {}, frameCount: 0 })
    setPhase('voice')
  }

  // ── Phase 2: Voice ────────────────────────────────────────────────────────

  async function startRecording() {
    setVoiceError('')

    // The stream from the facial phase may already be stopped (or was never
    // acquired if the user landed here directly) — re-acquire audio rather than
    // silently doing nothing when the button is clicked.
    let stream = streamRef.current
    const audioLive = stream?.getAudioTracks().some(t => t.readyState === 'live') ?? false
    if (!audioLive) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
      } catch {
        setVoiceError('Microphone unavailable. Check browser permissions and try again.')
        return
      }
    }

    audioChunksRef.current = []
    let mr: MediaRecorder
    try {
      // Record audio tracks only — the shared stream still carries the camera's
      // video track, and MediaRecorder.start() throws NotSupportedError if asked
      // to put video into an audio-only container.
      const audioOnly = new MediaStream(stream!.getAudioTracks())
      mr = new MediaRecorder(audioOnly, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' })
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = () => processVoice()
      mr.start(100)
    } catch {
      setVoiceError('Could not start recording on this device.')
      return
    }
    setIsRecording(true)

    // Timer
    const startTime = Date.now()
    const timerInterval = setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - startTime) / 1000))
    }, 250)

    // Waveform animation
    const waveInterval = setInterval(() => {
      setWaveHeights(Array.from({ length: 20 }, () => Math.random() * 32 + 8))
    }, 100)

    // Auto-stop at 10s
    setTimeout(() => {
      if (mr.state === 'recording') {
        mr.stop()
        clearInterval(timerInterval)
        clearInterval(waveInterval)
        setIsRecording(false)
        setWaveHeights(Array(20).fill(8))
      }
    }, 10000)
  }

  async function processVoice() {
    setVoiceProcessing(true)
    stopStream()

    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      const resp = await fetch('http://localhost:5001/api/analyze-voice', { method: 'POST', body: formData })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      if (data.success) {
        setVoiceResult({ emotion: data.emotion, confidence: data.confidence, analysis: data.analysis, features: data.features })
      } else throw new Error(data.error)
    } catch {
      setVoiceResult({ emotion: 'neutral', confidence: 0.5, analysis: 'Voice service unavailable — facial analysis only.', unavailable: true })
    }

    setVoiceProcessing(false)
    setPhase('analyzing')
    setTimeout(() => setPhase('results'), 2000)
  }

  function skipVoice() {
    stopStream()
    setVoiceResult({ emotion: 'neutral', confidence: 0.5, analysis: 'Voice analysis skipped.', skipped: true })
    setPhase('analyzing')
    setTimeout(() => setPhase('results'), 1500)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!selectedFeeling || !facialResult || !voiceResult) return
    setSubmitting(true); setSubmitError('')

    const consistency = voiceResult.skipped || voiceResult.unavailable
      ? 'single_mode'
      : getConsistency(facialResult.emotion, voiceResult.emotion)

    const payload: MultimodalPayload = {
      user_validated_feeling:  selectedFeeling,
      notes:                   notes.trim() || undefined,
      wants_counselor_meeting: selectedFeeling === 'struggling' || selectedFeeling === 'critical',
      facial_emotion:          facialResult.emotion,
      facial_confidence:       facialResult.confidence,
      facial_microexpressions: facialResult.microexpressions,
      voice_emotion:           voiceResult.emotion,
      voice_confidence:        voiceResult.confidence,
      voice_features:          voiceResult.features,
      multimodal_consistency:  consistency,
      ai_summary:              buildSummary(facialResult, voiceResult, consistency),
    }

    try {
      await wellnessApi.submitMultimodalLog(payload)
      setPhase('done')
      setTimeout(onSubmitted, 2500)
    } catch {
      setSubmitError('Could not save. Please try again.')
      setSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-[#0f0f18] border border-teal-900/40 shadow-2xl p-8">

        {/* Close */}
        <button onClick={() => { stopStream(); onClose() }}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-teal-400">
            MultiModal Wellness Check
          </h2>
          <p className="text-slate-500 text-sm mt-1">AI-assisted emotional analysis</p>
        </div>

        {/* ── Phase: Loading ── */}
        {phase === 'loading' && (
          <div className="text-center py-16 space-y-5">
            <div className="flex items-center justify-center gap-3 text-slate-400">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Loading AI models…</span>
            </div>
            {faceState.status === 'loading' && (
              <div className="mx-auto w-64 h-2 rounded-full bg-teal-900/40 overflow-hidden">
                <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${faceState.progress}%` }} />
              </div>
            )}
            {faceState.status === 'error' && (
              <div className="space-y-3">
                <p className="text-red-400 text-sm">{faceState.message}</p>
                <button onClick={onClose} className="text-slate-400 hover:text-white text-sm underline">Use Standard Wellness Log instead</button>
              </div>
            )}
          </div>
        )}

        {/* ── Phase: Start ── */}
        {phase === 'start' && (
          <div className="text-center space-y-8 py-4">
            <div className="flex justify-center gap-12 text-slate-400 text-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 sp-squircle-xl bg-teal-900/30 border border-teal-800/40 flex items-center justify-center">
                  <span className="text-2xl">📷</span>
                </div>
                <span>Facial Analysis<br /><span className="text-xs opacity-60">15 seconds</span></span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 sp-squircle-xl bg-sky-900/30 border border-sky-800/40 flex items-center justify-center">
                  <span className="text-2xl">🎙️</span>
                </div>
                <span>Voice Analysis<br /><span className="text-xs opacity-60">10 seconds</span></span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 sp-squircle-xl bg-teal-900/30 border border-teal-800/40 flex items-center justify-center">
                  <span className="text-2xl">🧠</span>
                </div>
                <span>AI Assessment<br /><span className="text-xs opacity-60">Instant</span></span>
              </div>
            </div>
            <p className="text-xs text-slate-600">Camera and microphone access required. All processing is local.</p>
            <button onClick={startFacial}
              className="bg-[var(--sp-primary)] hover:bg-[var(--sp-primary-hover)] text-[var(--sp-on-primary)] px-10 py-4 sp-squircle-xl font-semibold text-lg transition-all">
              Begin Analysis
            </button>
          </div>
        )}

        {/* ── Phase: Facial ── */}
        {phase === 'facial' && (
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">1</div>
              <h3 className="text-xl font-semibold text-white">Facial Expression Analysis</h3>
            </div>
            <div className="relative inline-block">
              <video ref={videoRef} autoPlay playsInline muted
                className="w-full max-w-xl h-80 sp-squircle-xl object-cover border border-teal-800/40 bg-black" />
              <div className="absolute top-3 right-3">
                <div className="relative">
                  <ProgressRing progress={facialProgress} />
                  <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">{facialProgress}</span>
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex justify-between">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 sp-squircle-sm">
                  <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-slate-600'}`} />
                  <span className="text-slate-400 text-xs">Face Detected</span>
                </div>
                <div className="bg-black/60 backdrop-blur px-3 py-1.5 sp-squircle-sm text-xs text-slate-400">
                  {frameCount} frames
                </div>
              </div>
            </div>
            <button onClick={skipFacial} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Skip to voice →</button>
          </div>
        )}

        {/* ── Phase: Voice ── */}
        {phase === 'voice' && (
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <div className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-white font-bold text-sm">2</div>
              <h3 className="text-xl font-semibold text-white">Voice Pattern Analysis</h3>
            </div>
            <div className="sp-squircle-xl bg-white/5 border border-white/10 p-6 max-w-lg mx-auto space-y-5">
              <div className="flex items-start gap-4 text-left">
                <div className="w-10 h-10 rounded-full bg-teal-900/40 border border-teal-700/40 flex-shrink-0 flex items-center justify-center text-lg">💬</div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Please answer:</p>
                  <p className="text-white text-lg font-medium">{voicePrompt}</p>
                </div>
              </div>
              {isRecording ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-sm font-medium">Recording</span>
                    <span className="text-slate-500 text-sm">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2,'0')}</span>
                  </div>
                  <div className="flex items-end justify-center gap-1 h-10">
                    {waveHeights.map((h, i) => (
                      <div key={i} className="w-1.5 rounded-sm bg-teal-400 transition-all duration-100"
                        style={{ height: `${h}px` }} />
                    ))}
                  </div>
                  <p className="text-slate-600 text-xs">Auto-stops at 10 seconds</p>
                </div>
              ) : voiceProcessing ? (
                <div className="flex items-center justify-center gap-3 text-slate-400">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Analyzing voice patterns…
                </div>
              ) : (
                <div className="space-y-3">
                  <button onClick={startRecording}
                    className="bg-sky-600 hover:bg-sky-500 text-white px-7 py-3 sp-squircle-lg font-medium transition-all">
                    🎙️ Start Recording
                  </button>
                  {voiceError && <p className="text-sm text-red-400">{voiceError}</p>}
                </div>
              )}
            </div>
            {!isRecording && !voiceProcessing && (
              <button onClick={skipVoice} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Skip voice analysis →</button>
            )}
          </div>
        )}

        {/* ── Phase: Analyzing ── */}
        {phase === 'analyzing' && (
          <div className="text-center py-16 space-y-5">
            <div className="w-20 h-20 mx-auto rounded-full bg-teal-900/40 border border-teal-700/40 flex items-center justify-center">
              <svg className="w-10 h-10 text-teal-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-slate-300 font-medium">Cross-referencing facial and vocal patterns…</p>
          </div>
        )}

        {/* ── Phase: Results ── */}
        {phase === 'results' && facialResult && voiceResult && (
          <div className="space-y-6">
            {/* Analysis Cards */}
            <div className="grid grid-cols-2 gap-4">
              <ResultCard
                title="Facial Analysis" icon="📷" colorClass="border-teal-800/40"
                emotion={facialResult.emotion} confidence={facialResult.confidence}
                note={`${facialResult.frameCount} micro-expressions analyzed`}
                barColor="bg-teal-500"
              />
              <ResultCard
                title="Voice Analysis" icon="🎙️" colorClass="border-sky-800/40"
                emotion={voiceResult.emotion} confidence={voiceResult.confidence}
                note={voiceResult.analysis}
                barColor="bg-sky-500"
                badge={voiceResult.skipped ? 'Skipped' : voiceResult.unavailable ? 'Unavailable' : undefined}
              />
            </div>

            {/* Consistency */}
            {!voiceResult.skipped && !voiceResult.unavailable && (() => {
              const c = getConsistency(facialResult.emotion, voiceResult.emotion)
              const map = { high: { label: 'Consistent ✓', cls: 'border-emerald-700/40 text-emerald-400' }, medium: { label: 'Moderate', cls: 'border-yellow-700/40 text-yellow-400' }, low: { label: 'Mixed signals', cls: 'border-orange-700/40 text-orange-400' }, single_mode: { label: 'Single mode', cls: 'border-slate-700/40 text-slate-400' } }
              const { label, cls } = map[c]
              return (
                <div className={`sp-squircle-lg border bg-white/5 px-4 py-3 flex items-center justify-between ${cls}`}>
                  <span className="text-slate-400 text-sm">Analysis consistency</span>
                  <span className="text-sm font-semibold">{label}</span>
                </div>
              )
            })()}

            {/* Feeling Validator */}
            <div>
              <p className="text-white font-medium mb-3">How do you really feel? <span className="text-slate-500 text-sm font-normal">(Required)</span></p>
              <div className="grid grid-cols-5 gap-2">
                {FEELINGS.map(f => (
                  <button key={f.value} onClick={() => setSelectedFeeling(f.value)}
                    className={`sp-squircle-lg border py-4 text-center transition-all ${selectedFeeling === f.value
                      ? 'border-teal-500/60 bg-teal-900/30 shadow-[0_0_20px_rgba(13,148,136,0.3)]'
                      : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <div className="text-2xl mb-1">{f.emoji}</div>
                    <div className="text-xs text-slate-300 font-medium">{f.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-400 text-sm mb-2">Additional context <span className="opacity-60">(optional)</span></label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Share what's on your mind…"
                className="w-full sp-squircle-lg bg-black/40 border border-white/10 text-white placeholder-slate-600 px-4 py-3 text-sm focus:outline-none focus:border-teal-500 resize-none" />
            </div>

            {submitError && <p className="sp-squircle-sm bg-red-900/40 border border-red-700/40 px-3 py-2 text-sm text-red-300">{submitError}</p>}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleSubmit} disabled={!selectedFeeling || submitting}
                className={`flex-1 py-4 sp-squircle-xl font-semibold text-lg transition-all ${selectedFeeling
                  ? 'bg-[var(--sp-primary)] hover:bg-[var(--sp-primary-hover)] text-[var(--sp-on-primary)]'
                  : 'bg-white/10 text-slate-600 cursor-not-allowed'}`}>
                {submitting ? 'Submitting…' : 'Submit Wellness Check'}
              </button>
              {(selectedFeeling === 'struggling' || selectedFeeling === 'critical') && (
                <div className="flex items-center px-4 sp-squircle-xl border border-teal-700/40 text-teal-400 text-sm">
                  🆘 Counselor will be notified
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Phase: Done ── */}
        {phase === 'done' && (
          <div className="text-center py-16 space-y-5">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center" style={{ boxShadow: '0 0 40px rgba(16,185,129,0.3)' }}>
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-white">Enhanced Check-in Complete</h3>
            <p className="text-slate-400">Multi-modal analysis recorded securely.</p>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ title, icon, colorClass, emotion, confidence, note, barColor, badge }: {
  title: string; icon: string; colorClass: string
  emotion: string; confidence: number; note: string; barColor: string; badge?: string
}) {
  const meta = EMOTION_META[emotion] ?? { emoji: '😐', color: 'text-slate-400' }
  return (
    <div className={`sp-squircle-xl border bg-white/5 p-5 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-4 text-slate-300 text-sm font-medium">
        <span>{icon}</span> {title}
        {badge && <span className="ml-auto text-xs text-slate-500 bg-white/10 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{meta.emoji}</span>
        <div className="flex-1">
          <p className={`font-semibold capitalize ${meta.color}`}>{emotion}</p>
          <ConfBar value={confidence} color={barColor} />
          <p className="text-slate-600 text-xs mt-0.5">{(confidence * 100).toFixed(0)}% confidence</p>
        </div>
      </div>
      <p className="text-slate-500 text-xs leading-relaxed">{note}</p>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSummary(facial: FacialResult, voice: VoiceResult, consistency: string): string {
  if (voice.skipped || voice.unavailable) {
    return `Facial analysis detected ${facial.emotion} emotion with ${(facial.confidence * 100).toFixed(0)}% confidence across ${facial.frameCount} frames.`
  }
  if (consistency === 'high') {
    return `Both facial (${facial.emotion}) and voice (${voice.emotion}) analysis are consistent, indicating an authentic emotional state.`
  }
  return `Facial expressions indicate ${facial.emotion} while voice patterns suggest ${voice.emotion}. This divergence may indicate emotional complexity.`
}
