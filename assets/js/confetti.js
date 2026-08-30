/**
 * MockMaster — Confetti blast
 * Brand colors: sage, natural green, forest, gold, white
 * Usage: MockMasterConfetti.blast() or MockMasterConfetti.blast({ duration: 3500 })
 */
(function (global) {
  var COLORS = ['#9CB080', '#618764', '#2B5748', '#D4AF37', '#E8F0E0', '#FFFFFF', '#C4A35A'];

  function createCanvas() {
    var c = document.createElement('canvas');
    c.id = 'mm-confetti-canvas';
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10000;';
    document.body.appendChild(c);
    return c;
  }

  function blast(opts) {
    opts = opts || {};
    var duration = opts.duration || 3200;
    var particleCount = opts.count || 160;

    var canvas = document.getElementById('mm-confetti-canvas') || createCanvas();
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = window.innerWidth;
    var H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var particles = [];
    var cx = W / 2;
    var cy = H * 0.35;

    for (var i = 0; i < particleCount; i++) {
      var angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.6;
      var speed = 6 + Math.random() * 12;
      particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
        vy: Math.sin(angle) * speed * 0.4 - (8 + Math.random() * 10),
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.35,
        gravity: 0.18 + Math.random() * 0.12,
        drag: 0.985 + Math.random() * 0.01,
        opacity: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }

    // Extra bursts from sides
    for (var s = 0; s < 40; s++) {
      var side = s % 2 === 0 ? 0 : W;
      particles.push({
        x: side,
        y: H * (0.2 + Math.random() * 0.4),
        vx: (side === 0 ? 1 : -1) * (4 + Math.random() * 10),
        vy: -4 - Math.random() * 8,
        w: 5 + Math.random() * 7,
        h: 3 + Math.random() * 5,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        gravity: 0.2,
        drag: 0.988,
        opacity: 1,
        shape: 'rect'
      });
    }

    var start = performance.now();
    var raf;

    function frame(now) {
      var t = now - start;
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.opacity = Math.max(0, 1 - t / duration);

        if (p.opacity <= 0) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }

      if (t < duration) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W, H);
        // keep canvas for reuse; optional remove:
        // if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    }

    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  global.MockMasterConfetti = { blast: blast };
})(window);
