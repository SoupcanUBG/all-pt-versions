// hold.js

let config = {
  speed: 4,
  target: { minutes: 0, seconds: 0, millis: 0 },
  stopKey: "l",
  autoTime: true
};
export function version() {
  return {
    name: "hold.js",
    version: "1.0.0",
    speed: config.speed,
    active,
    autoTime: config.autoTime
  };
}

let active = false;
let holdEl = null;
let endPerf = 0;
let keyHandler = null;
let rafId = null;

// =========================
// TIMER DETECTION
// =========================
function parseTimeFromPage() {
  const text = document.body.innerText;

  // looks for formats like:
  // 00:03:56
  // 3:56
  const match = text.match(/(\d{1,2})\s*[:.]\s*(\d{1,2})(?:\s*[:.]\s*(\d{1,2}))?/);

  if (!match) return null;

  let m = 0, s = 0, ms = 0;

  if (match[3] !== undefined) {
    m = parseInt(match[1]);
    s = parseInt(match[2]);
    ms = parseInt(match[3]);
  } else {
    m = parseInt(match[1]);
    s = parseInt(match[2]);
  }

  return { minutes: m, seconds: s, millis: ms };
}

// =========================
// TIME ENGINE
// =========================
function computeTargetMs() {
  return (
    (config.target.minutes * 60 +
      config.target.seconds +
      config.target.millis / 1000) *
    1000
  );
}

function computeDurationReal() {
  return computeTargetMs() / config.speed;
}

// =========================
// RELEASE
// =========================
function release(reason = "unknown") {
  if (!active) return;
  active = false;

  if (holdEl) {
    holdEl.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0
      })
    );
  }

  if (keyHandler) window.removeEventListener("keydown", keyHandler);
  if (rafId) cancelAnimationFrame(rafId);

  console.log("🛑 Released:", reason);
}

// =========================
// LOOP (stable, no drift issues)
// =========================
function loop() {
  if (!active) return;

  if (performance.now() >= endPerf) {
    release("time reached");
    return;
  }

  rafId = requestAnimationFrame(loop);
}

// =========================
// START HOLD
// =========================
export function startHold(
  element = document.getElementById("hold"),
  autoTime = true
) {
  if (!element) throw new Error("Hold element not found");

  holdEl = element;
  active = true;

  // auto detect time
  if (autoTime) {
    const detected = parseTimeFromPage();
    if (detected) {
      config.target = detected;
      console.log("⏱ Auto time detected:", detected);
    } else {
      console.warn("⚠️ No timer detected, using default target");
    }
  }

  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const durationReal = computeDurationReal();
  endPerf = performance.now() + durationReal;

  console.log("⚡ Speed:", config.speed);
  console.log("🕒 Duration real:", durationReal);

  keyHandler = (e) => {
    if (e.key.toLowerCase() === config.stopKey) {
      release("manual key");
    }
  };

  window.addEventListener("keydown", keyHandler);

  element.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0
    })
  );

  requestAnimationFrame(loop);
}

// =========================
// STOP
// =========================
export function stopHold(reason = "manual stop") {
  release(reason);
}

// =========================
// SPEED FIX (THIS IS THE IMPORTANT FIX)
// =========================
export function setSpeed(s) {
  const now = performance.now();

  if (!active) {
    config.speed = s;
    console.log("⚡ speed set (idle):", s);
    return;
  }

  // remaining real time left
  const remainingReal = Math.max(0, endPerf - now);

  // convert back to game-time using OLD speed
  const remainingGameMs = remainingReal * config.speed;

  config.speed = s;

  // recompute end time using NEW speed
  endPerf = now + remainingGameMs / config.speed;

  console.log("⚡ speed updated:", s);
}

// =========================
// TARGET
// =========================
export function setTarget(m, s, ms = 0) {
  config.target = { minutes: m, seconds: s, millis: ms };
  console.log("🎯 target updated:", config.target);
}

// =========================
// STOP KEY
// =========================
export function setStopKey(k) {
  config.stopKey = k;
  console.log("⌨️ stop key:", k);
}

// =========================
// CONFIG DEBUG
// =========================
export function getConfig() {
  return config;
}
