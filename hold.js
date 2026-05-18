// hold.js

let config = {
  speed: 4,
  target: { minutes: 59, seconds: 59, millis: 99 },
  stopKey: "l"
};

let active = false;
let holdEl = null;
let endPerf = 0;
let keyHandler = null;
let rafId = null;

// =========================
// TIME CALC
// =========================
function computeDuration() {
  const targetMs =
    (config.target.minutes * 60 +
     config.target.seconds +
     config.target.millis / 1000) * 1000;

  return {
    targetMs,
    durationReal: targetMs / config.speed
  };
}

// =========================
// RELEASE
// =========================
function release(reason = "unknown") {
  if (!active) return;
  active = false;

  if (holdEl) {
    holdEl.dispatchEvent(new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0
    }));
  }

  if (keyHandler) window.removeEventListener("keydown", keyHandler);
  if (rafId) cancelAnimationFrame(rafId);

  console.log("🛑 Released:", reason);
}

// =========================
// LOOP
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
// START
// =========================
export function startHold(element = document.getElementById("hold")) {
  if (!element) throw new Error("Hold element not found");

  holdEl = element;

  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const { targetMs, durationReal } = computeDuration();

  endPerf = performance.now() + durationReal;
  active = true;

  console.log("⏱ Target ms:", targetMs);
  console.log("⚡ Speed:", config.speed);
  console.log("🕒 Real duration:", durationReal);

  keyHandler = (e) => {
    if (e.key.toLowerCase() === config.stopKey) {
      release("manual key");
    }
  };

  window.addEventListener("keydown", keyHandler);

  element.dispatchEvent(new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
    button: 0
  }));

  requestAnimationFrame(loop);
}

// =========================
// STOP
// =========================
export function stopHold(reason = "manual stop") {
  release(reason);
}

// =========================
// SPEED (FIXED: ACTUAL TIME RESCALE)
// =========================
export function setSpeed(s) {
  if (!active) {
    config.speed = s;
    console.log("⚡ speed set (idle):", s);
    return;
  }

  const now = performance.now();

  const remainingReal = Math.max(0, endPerf - now);
  const remainingGameMs = remainingReal * config.speed;

  config.speed = s;

  endPerf = now + (remainingGameMs / config.speed);

  console.log("⚡ speed updated:", s);
}

// =========================
// TARGET UPDATE
// =========================
export function setTarget(m, s, ms) {
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
// DEBUG
// =========================
export function getConfig() {
  return config;
}
