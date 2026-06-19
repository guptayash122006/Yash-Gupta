/* ================================================================
   YASH GUPTA PORTFOLIO — PRELOADER JAVASCRIPT
   ScannerIntro + TerminalLoader
   ================================================================
   Mirrors the React component architecture requested:
     • ScannerIntro  — Phase 1 (2-3s radar scanner)
     • TerminalLoader — Phase 2 (2s terminal + progress bar)
   Uses sessionStorage so intro only plays once per session.
   ================================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
     SESSION GUARD — skip intro if already seen this session
  ────────────────────────────────────────────────────────────── */
  if (sessionStorage.getItem('yg-intro-done') === '1') {
    const overlay = document.getElementById('yg-preloader');
    if (overlay) {
      overlay.style.display = 'none';
    }
    return; // bail out entirely — portfolio already visible
  }

  /* ──────────────────────────────────────────────────────────────
     DOM REFERENCES
  ────────────────────────────────────────────────────────────── */
  const overlay   = document.getElementById('yg-preloader');
  const scanner   = document.getElementById('yg-scanner');
  const terminal  = document.getElementById('yg-terminal');
  const progFill  = document.getElementById('yg-prog-fill');
  const progPct   = document.getElementById('yg-prog-pct');
  const progLabel = document.getElementById('yg-prog-label');
  const accessRow = document.getElementById('yg-access-row');
  const termCursorLine = document.getElementById('yg-term-cursor-line');

  if (!overlay) return; // safety guard

  /* ──────────────────────────────────────────────────────────────
     COMPONENT: ScannerIntro
     Animates the radar canvas + status text sequence
  ────────────────────────────────────────────────────────────── */
  const ScannerIntro = (() => {
    const canvas = document.getElementById('yg-radar-canvas');
    const statusEl = document.getElementById('yg-scanner-status');
    let ctx, angle = 0, rafId, canvasSize;

    const MESSAGES = [
      { text: 'Initializing Portfolio...',        delay: 0 },
      { text: 'Loading Profile & Projects...',    delay: 700 },
      { text: 'Preparing Skills & Experience...', delay: 1450 },
      { text: 'Ready',                            delay: 2150, grant: true },
    ];

    function initCanvas() {
      const size = Math.min(280, Math.floor(window.innerWidth * 0.68));
      canvasSize = size;
      canvas.width  = size;
      canvas.height = size;
      canvas.style.width  = size + 'px';
      canvas.style.height = size + 'px';
      ctx = canvas.getContext('2d');
    }

    function drawFrame() {
      if (!ctx) return;
      const W = canvasSize, cx = W / 2, cy = W / 2, r = W / 2;

      ctx.clearRect(0, 0, W, W);

      // --- Sweep fan (40 thin arc slices fading out) ---
      const SWEEP = Math.PI * 0.55;
      for (let i = 0; i < 48; i++) {
        const a     = angle - (i * SWEEP / 48);
        const alpha = (1 - i / 48) * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, a - SWEEP / 48, a);
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 212, 255, ${alpha})`;
        ctx.fill();
      }

      // --- Sweep arm ---
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.75)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // --- Center glow dot ---
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
      grad.addColorStop(0, 'rgba(0,212,255,0.25)');
      grad.addColorStop(1, 'rgba(0,212,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      angle += 0.028;
      rafId = requestAnimationFrame(drawFrame);
    }

    function showStatusMessages(onDone) {
      MESSAGES.forEach(({ text, delay, grant }) => {
        setTimeout(() => {
          if (statusEl) {
            statusEl.classList.remove('yg-visible', 'yg-access-granted');
            // Force reflow so transition re-triggers
            void statusEl.offsetWidth;
            statusEl.textContent = text;
            statusEl.classList.add('yg-visible');
            if (grant) statusEl.classList.add('yg-access-granted');
          }
        }, delay);
      });

      // After last message + brief pause, call done
      setTimeout(onDone, MESSAGES[MESSAGES.length - 1].delay + 500);
    }

    function start(onDone) {
      initCanvas();
      drawFrame();

      // Resize handler
      window._ygResizeRadar = () => {
        const newSize = Math.min(280, Math.floor(window.innerWidth * 0.68));
        if (newSize !== canvasSize) {
          canvasSize = newSize;
          canvas.width  = newSize;
          canvas.height = newSize;
          canvas.style.width  = newSize + 'px';
          canvas.style.height = newSize + 'px';
        }
      };
      window.addEventListener('resize', window._ygResizeRadar);

      showStatusMessages(onDone);
    }

    function stop() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', window._ygResizeRadar);
    }

    return { start, stop };
  })();


  /* ──────────────────────────────────────────────────────────────
     COMPONENT: TerminalLoader
     Fires terminal commands + progress bar
  ────────────────────────────────────────────────────────────── */
  const TerminalLoader = (() => {
    const COMMANDS = [
      { id: 'yg-cmd-1', text: 'loading profile',       pctEnd: 18,  success: false },
      { id: 'yg-cmd-2', text: 'importing projects',    pctEnd: 40,  success: false },
      { id: 'yg-cmd-3', text: 'loading skill matrix',  pctEnd: 63,  success: false },
      { id: 'yg-cmd-4', text: 'connecting github',     pctEnd: 82,  success: false },
      { id: 'yg-cmd-5', text: 'build status: success', pctEnd: 100, success: true  },
    ];

    let currentPct = 0;

    function animatePct(from, to, duration, onDone) {
      const start = performance.now();
      function step(now) {
        const t     = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 2);
        const val   = Math.round(from + (to - from) * eased);
        currentPct = val;

        if (progFill)  progFill.style.width = val + '%';
        if (progPct)   progPct.textContent  = val + '%';
        if (progLabel) progLabel.textContent = val === 100 ? 'Complete' : 'Loading';

        if (t < 1) requestAnimationFrame(step);
        else if (onDone) onDone();
      }
      requestAnimationFrame(step);
    }

    function runSequence(onDone) {
      const BASE_INTERVAL = 340; // ms between commands
      let prevPct = 0;

      COMMANDS.forEach((cmd, i) => {
        const delay = i * BASE_INTERVAL;

        setTimeout(() => {
          // Show this command line
          const lineEl = document.getElementById(cmd.id);
          if (lineEl) {
            lineEl.classList.add('yg-show');
            if (cmd.success) lineEl.classList.add('yg-success');
          }

          // Hide cursor line after last command
          if (i === COMMANDS.length - 1 && termCursorLine) {
            termCursorLine.style.opacity = '0';
          }

          // Animate progress
          const from = prevPct;
          const to   = cmd.pctEnd;
          prevPct    = to;

          animatePct(from, to, 280, () => {
            if (i === COMMANDS.length - 1) {
              // Show "Access Granted" row
              setTimeout(() => {
                if (accessRow) accessRow.classList.add('yg-show');
                setTimeout(onDone, 350);
              }, 200);
            }
          });
        }, delay);
      });
    }

    function start(onDone) {
      runSequence(onDone);
    }

    return { start };
  })();


  /* ──────────────────────────────────────────────────────────────
     ORCHESTRATOR — sequences Phase1 → Phase2 → Dismiss
  ────────────────────────────────────────────────────────────── */
  function startPreloader() {
    // Phase 1: Scanner
    ScannerIntro.start(() => {
      // Fade out scanner, fade in terminal
      scanner.classList.add('yg-fade-out');

      setTimeout(() => {
        terminal.classList.add('yg-visible');
        ScannerIntro.stop();

        // Phase 2: Terminal
        TerminalLoader.start(() => {
          // Dismiss overlay
          setTimeout(dismissPreloader, 200);
        });
      }, 450);
    });
  }

  function dismissPreloader() {
    overlay.classList.add('yg-hidden');
    sessionStorage.setItem('yg-intro-done', '1');

    // Remove from DOM after fade completes to free memory
    overlay.addEventListener('transitionend', () => {
      overlay.remove();
    }, { once: true });
  }

  /* ──────────────────────────────────────────────────────────────
     KICK OFF
  ────────────────────────────────────────────────────────────── */
  // Wait for DOM to be fully parsed (script is deferred)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPreloader);
  } else {
    startPreloader();
  }

})();
