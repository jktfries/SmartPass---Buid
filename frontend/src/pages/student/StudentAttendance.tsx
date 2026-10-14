import { useEffect, useState } from 'react'
import { ScanLine, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { attendanceApi } from '@/api/attendance'
import type { AttendanceSummary } from '@/api/attendance'
import { AttendanceTable } from '@/components/attendance/AttendanceTable'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import FormField from '@/components/ui/FormField'

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

export default function StudentAttendance() {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([])
  const [loading, setLoading] = useState(true)

  const [scanOpen, setScanOpen]   = useState(false)
  const [scanClass, setScanClass] = useState<number | ''>('')
  const [scanning, setScanning]   = useState(false)
  const [scanError, setScanError] = useState('')
  const [scanResult, setScanResult] = useState<{ status: string; course?: string } | null>(null)

  function load() {
    return attendanceApi.getStudentAttendance()
      .then((res) => setSummaries(res.data))
      .catch(() => {})
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  function openScan() {
    setScanClass(summaries.length === 1 ? summaries[0].class_section_id : '')
    setScanError('')
    setScanResult(null)
    setScanOpen(true)
  }

  async function handleScan() {
    if (scanClass === '') return
    setScanning(true)
    setScanError('')
    try {
      const res = await attendanceApi.studentSimulateScan(scanClass)
      setScanResult({ status: res.data.status ?? 'recorded', course: res.data.course })
      await load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setScanError(err.response?.data?.message ?? 'Scan failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-[var(--sp-text-muted)]">
          Your attendance summary per course.
        </p>
        {summaries.length > 0 && (
          <Button onClick={openScan} variant="secondary">
            <ScanLine size={16} /> Simulate RFID Scan
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 sp-squircle-lg bg-[var(--sp-border)]" />
          ))}
        </div>
      ) : (
        <AttendanceTable summaries={summaries} />
      )}

      {scanOpen && (
        <Modal
          title="Simulate RFID Scan"
          onClose={() => setScanOpen(false)}
          footer={
            scanResult ? (
              <Button onClick={() => setScanOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setScanOpen(false)}>Cancel</Button>
                <Button onClick={handleScan} disabled={scanning || scanClass === ''}>
                  {scanning && <Loader2 size={15} className="animate-spin" />}
                  {scanning ? 'Scanning…' : 'Tap Card'}
                </Button>
              </>
            )
          }
        >
          {scanResult ? (
            <div className="flex items-start gap-3 py-2">
              <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-base font-semibold text-[var(--sp-text)] capitalize">
                  Marked {scanResult.status}
                </p>
                <p className="text-sm text-[var(--sp-text-muted)] leading-relaxed">
                  {scanResult.course ? `${scanResult.course} · ` : ''}Recorded just now from the system clock.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-1">
              <p className="text-sm text-[var(--sp-text-muted)] leading-relaxed">
                Demo only — this stands in for tapping your card on a reader. The status is
                worked out from the current time against the class start time, exactly as
                the hardware would.
              </p>

              <FormField label="Course" required>
                <select
                  value={scanClass}
                  onChange={(e) => setScanClass(e.target.value === '' ? '' : Number(e.target.value))}
                  className="input-field"
                >
                  <option value="">Select a course…</option>
                  {summaries.map((s) => (
                    <option key={s.class_section_id} value={s.class_section_id}>
                      {s.course_code} — {s.course_name} ({s.schedule_days} {formatTime(s.time_start)})
                    </option>
                  ))}
                </select>
              </FormField>

              {scanError && (
                <p className="flex items-start gap-2 text-sm text-red-500">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {scanError}
                </p>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
