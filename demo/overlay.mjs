/**
 * Everything that gets injected INTO the page for the recording: a synthetic
 * mouse cursor, a caption bar and a title card.
 *
 * These have to be injected rather than drawn afterwards with ffmpeg because
 * Playwright's video capture has no cursor at all — an automated demo without
 * one looks like the UI is operating itself, which reads as a glitch. Doing the
 * captions in-page too keeps their timing implicit in the script (a caption is
 * simply on screen for as long as the beat runs) and lets them inherit the
 * app's own design tokens instead of being a mismatched ffmpeg text overlay.
 */

/** Runs in the browser on every navigation, before page scripts. */
export function injectedOverlay() {
  if (window.__demoOverlayInstalled) return
  window.__demoOverlayInstalled = true

  const install = () => {
    if (!document.body || document.getElementById('demo-cursor')) return

    const style = document.createElement('style')
    style.textContent = `
      #demo-cursor {
        position: fixed; top: 0; left: 0; width: 22px; height: 22px;
        margin: -11px 0 0 -11px; border-radius: 50%;
        background: rgba(255,255,255,0.92);
        box-shadow: 0 0 0 2px rgba(15,23,42,0.55), 0 4px 14px rgba(0,0,0,0.45);
        pointer-events: none; z-index: 2147483647;
        transition: transform 0.08s ease-out;
      }
      #demo-cursor.click { transform: scale(0.6); }
      #demo-cursor::after {
        content: ''; position: absolute; inset: -9px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.9); opacity: 0; transform: scale(0.5);
      }
      #demo-cursor.pulse::after { animation: demo-pulse 0.45s ease-out; }
      @keyframes demo-pulse {
        0%   { opacity: 0.95; transform: scale(0.5); }
        100% { opacity: 0;    transform: scale(1.9); }
      }
      #demo-caption {
        position: fixed; left: 50%; bottom: 42px; transform: translateX(-50%) translateY(10px);
        max-width: 74%; padding: 16px 30px;
        background: rgba(11,18,32,0.93);
        color: #f1f5f9;
        font: 600 25px/1.35 'Work Sans', system-ui, sans-serif;
        letter-spacing: -0.01em; text-align: center;
        border-radius: 22px; corner-shape: squircle;
        box-shadow: 0 18px 50px -12px rgba(0,0,0,0.6);
        pointer-events: none; z-index: 2147483646;
        opacity: 0; transition: opacity 0.35s ease, transform 0.35s ease;
      }
      #demo-caption.on { opacity: 1; transform: translateX(-50%) translateY(0); }
      #demo-title {
        position: fixed; inset: 0; z-index: 2147483645;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 18px; background: #0b1220; color: #fff;
        font-family: 'Work Sans', system-ui, sans-serif;
        opacity: 0; transition: opacity 0.5s ease; pointer-events: none;
      }
      #demo-title.on { opacity: 1; }
      #demo-title .eyebrow {
        font-size: 18px; font-weight: 700; letter-spacing: 0.32em; text-transform: uppercase;
        color: #2dd4bf;
      }
      #demo-title .role { font-size: 72px; font-weight: 800; letter-spacing: -0.03em; }
      #demo-title .sub { font-size: 26px; font-weight: 500; color: #94a3b8; }
    `
    document.head.appendChild(style)

    const cur = document.createElement('div'); cur.id = 'demo-cursor'
    const cap = document.createElement('div'); cap.id = 'demo-caption'
    const tit = document.createElement('div'); tit.id = 'demo-title'
    tit.innerHTML = '<div class="eyebrow"></div><div class="role"></div><div class="sub"></div>'
    document.body.append(cur, cap, tit)

    // Park the cursor off-screen until the first real move, so it doesn't sit
    // in the top-left corner of the opening frame.
    cur.style.left = '-100px'
    cur.style.top = '-100px'
    document.addEventListener('mousemove', (e) => {
      cur.style.left = e.clientX + 'px'
      cur.style.top = e.clientY + 'px'
    }, true)

    window.__demo = {
      caption(text) {
        if (!text) { cap.classList.remove('on'); return }
        // Swap the text only once faded, so captions cross-fade cleanly.
        if (cap.classList.contains('on') && cap.textContent !== text) {
          cap.classList.remove('on')
          setTimeout(() => { cap.textContent = text; cap.classList.add('on') }, 340)
        } else {
          cap.textContent = text
          cap.classList.add('on')
        }
      },
      clickPulse() {
        cur.classList.add('click', 'pulse')
        setTimeout(() => cur.classList.remove('click'), 130)
        setTimeout(() => cur.classList.remove('pulse'), 480)
      },
      title(eyebrow, role, sub) {
        tit.querySelector('.eyebrow').textContent = eyebrow
        tit.querySelector('.role').textContent = role
        tit.querySelector('.sub').textContent = sub
        tit.classList.add('on')
      },
      hideTitle() { tit.classList.remove('on') },
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install)
  } else {
    install()
  }
  // React route changes can remount aggressively; re-assert periodically.
  setInterval(install, 500)
}
