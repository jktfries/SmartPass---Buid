#!/usr/bin/env node
/**
 * Turns the raw Playwright captures into deliverables.
 *
 *   node build.mjs
 *
 * demo/raw/<role>.webm  ->  demo/out/<n>-<role>.mp4   (one per role)
 *                       ->  demo/out/smartpass-demo.mp4 (stitched)
 *
 * Playwright writes VP8 webm with variable frame timing. Re-encoding each clip
 * to H.264 at a fixed 30fps is what makes the concatenation seamless — joining
 * the variable-rate sources directly produces a visible stutter at each cut.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, existsSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const RAW = path.join(HERE, 'raw')
const OUT = path.join(HERE, 'out')

// Personalisation last: its beats change the student's saved theme/accent, and
// it reads as a closing "and you can make it yours" note.
const ORDER = ['student', 'professor', 'counselor', 'admin', 'sysadmin', 'personalisation']

/** Target clip length; build flags anything outside this. */
const TARGET = { min: 80, max: 100 }

/** imageio-ffmpeg ships a static build; no system ffmpeg is required. */
function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG
  try {
    return execFileSync('python', ['-c', 'import imageio_ffmpeg,sys; sys.stdout.write(imageio_ffmpeg.get_ffmpeg_exe())'], {
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'ffmpeg' // fall back to PATH
  }
}

const FF = ffmpegPath()
const run = (args) => execFileSync(FF, args, { stdio: ['ignore', 'pipe', 'pipe'] })

/**
 * Seconds, parsed from ffmpeg's own banner.
 *
 * `ffmpeg -i <file>` with no output file prints the stream info and then exits
 * NON-ZERO ("At least one output file must be specified"), so this has to read
 * stderr out of the thrown error rather than trusting a clean exit. imageio's
 * build ships ffmpeg only — there's no ffprobe to use instead.
 */
function duration(file) {
  let text = ''
  try {
    text = execFileSync(FF, ['-i', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (e) {
    text = `${e.stderr ?? ''}${e.stdout ?? ''}`
  }
  const m = text.match(/Duration: (\d+):(\d+):([\d.]+)/)
  return m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : NaN
}

mkdirSync(OUT, { recursive: true })

const built = []
let i = 0
for (const role of ORDER) {
  const src = path.join(RAW, `${role}.webm`)
  if (!existsSync(src)) {
    console.log(`  skip ${role} (no capture)`)
    continue
  }
  i++
  const dest = path.join(OUT, `${String(i).padStart(2, '0')}-${role}.mp4`)
  if (existsSync(dest)) rmSync(dest)

  run([
    '-y', '-i', src,
    '-r', '30',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '20',
    // Required for QuickTime / PowerPoint / most hardware players.
    '-pix_fmt', 'yuv420p',
    // Even dimensions; guards against an odd capture size failing libx264.
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-movflags', '+faststart',
    '-an',
    dest,
  ])
  built.push(dest)
  console.log(`  ${role} -> ${path.relative(process.cwd(), dest)}`)
}

if (built.length > 1) {
  // The concat demuxer needs forward slashes and quoted paths, even on Windows.
  const list = path.join(OUT, '_concat.txt')
  writeFileSync(list, built.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'))
  const stitched = path.join(OUT, 'smartpass-demo.mp4')
  if (existsSync(stitched)) rmSync(stitched)
  run(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', stitched])
  rmSync(list)
  console.log(`  stitched -> ${path.relative(process.cwd(), stitched)}`)
}

console.log('\nDurations:')
for (const f of readdirSync(OUT).filter(f => f.endsWith('.mp4')).sort()) {
  const secs = duration(path.join(OUT, f))
  const flag = f.startsWith('smartpass')
    ? ''
    : (secs >= TARGET.min && secs <= TARGET.max ? '  ok' : `  OUT OF RANGE (want ${TARGET.min}-${TARGET.max}s)`)
  console.log(`  ${f.padEnd(28)} ${secs.toFixed(1)}s${flag}`)
}
