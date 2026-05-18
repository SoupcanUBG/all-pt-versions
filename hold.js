// hold.js

let config = {
  speed: 4,
  target: { minutes: 0, seconds: 0, millis: 0 },
  stopKey: "l",
  autoTime: true
};

let active = false;
let holdEl = null;
let endPerf = 0;
let keyHandler = null;
let rafId = null;

// =========================
// UTIL: LOGGING
// =========================
function log(type, msg, data) {
  const prefix = {
    info: "ℹ️",
    ok: "✅",
    warn: "⚠️",
    error: "❌"
  }[type] || "ℹ️";

  if (data !== undefined) {
    console.log(prefix, msg, data);
  } else {
    console.log(prefix, msg);
  }
}

// =========================
// TIMER DETECTION (SAFE + STRICT)
// =========================
function parseTimeFromPage() {
  const elements = document.querySelectorAll("body *");

  for (const el of elements) {
    const text = (el.textContent || "").trim();

    // strict formats only:
    // MM:SS or HH:MM:SS
    const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

    if (!match) continue;

    const hasHours = match[3] !== undefined;

    const parsed = hasHours
      ? {
          minutes: parseInt(match[1]),
          seconds: parseInt(match[2]),
          millis: parseInt(match[3])
        }
      : {
          minutes: 0,
          seconds: parseInt(match[1]),
          millis: parseInt(match[2])
        };

    const rect = el.getBoundingClientRect();
    const visible =
      rect.width > 0 &&
      rect.height > 0 &&
      getComputedStyle(el).visibility !== "hidden";

    if (visible) {
      log("ok", "Timer detected from DOM", parsed);
      return parsed;
    }
  }

  log("warn", "No valid timer found on page");
  return null;
}

// =========================
// TIME ENGINE
// =========================
function getTargetMs() {
  return (
    (config.target.minutes * 60 +
      config.target.seconds +
      config.target.millis / 1000) *
    1000
  );
}

function getDurationReal() {
  return getTargetMs() / config.speed;
}

// =========================
// RELEASE
// =========================
function release(reason) {
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

  log("warn", "Released → " + reason);
}

// =========================
// LOOP (stable, no drift logic needed)
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
export function startHold(element = document.getElementById("hold"), autoTime = true) {
  try {
    if (!element) {
      log("error", "Hold element not found (#hold missing)");
      return;
    }

    holdEl = element;
    active = true;

    // =========================
    // AUTO TIME DETECTION
    // =========================
    if (autoTime && config.autoTime) {
      const detected = parseTimeFromPage();

      if (!detected) {
        log("error", "Auto-time failed (no valid timer found)");
        return;
      }

      config.target = detected;
    }

    const targetMs = getTargetMs();

    if (targetMs <= 0) {
      log("error", "Invalid timer → target is 0ms (aborting to prevent instant release)");
      return;
    }

    const durationReal = getDurationReal();

    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    endPerf = performance.now() + durationReal;

    log("info", "Target ms", targetMs);
    log("info", "Speed", config.speed);
    log("info", "Real duration", durationReal);

    keyHandler = (e) => {
      if (e.key.toLowerCase() === config.stopKey) {
        release("manual key (" + config.stopKey + ")");
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
  } catch (err) {
    log("error", "startHold crashed", err);
  }
}

// =========================
// STOP
// =========================
export function stopHold(reason = "manual stop") {
  release(reason);
}

// =========================
// SPEED (FIXED LIVE RESCALING)
// =========================
export function setSpeed(newSpeed) {
  if (typeof newSpeed !== "number" || newSpeed <= 0) {
    log("error", "Invalid speed value", newSpeed);
    return;
  }

  const now = performance.now();

  if (!active) {
    config.speed = newSpeed;
    log("ok", "Speed set (idle)", newSpeed);
    return;
  }

  const remainingReal = Math.max(0, endPerf - now);
  const remainingGameMs = remainingReal * config.speed;

  config.speed = newSpeed;
  endPerf = now + remainingGameMs / config.speed;

  log("ok", "Speed updated live", newSpeed);
}

// =========================
// TARGET SET
// =========================
export function setTarget(m, s, ms = 0) {
  config.target = { minutes: m, seconds: s, millis: ms };
  log("ok", "Target updated", config.target);
}

// =========================
// STOP KEY
// =========================
export function setStopKey(k) {
  config.stopKey = k;
  log("ok", "Stop key set", k);
}

// =========================
// DEBUG
// =========================
export function version() {
  return {
    name: "hold.js",
    version: "2.0.0",
    speed: config.speed,
    active,
    autoTime: config.autoTime
  };
}
