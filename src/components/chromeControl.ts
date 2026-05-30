// Module-level signal for hiding the global BackToGallery affordance
// from inside an individual demo (e.g., to clean up the frame for a
// recording). Subscribers re-render when the flag flips; demos call
// setBackVisible(false) on mount and restore on cleanup.

type Listener = () => void;

let backVisible = true;
const listeners = new Set<Listener>();

export function setBackVisible(v: boolean) {
  if (backVisible === v) return;
  backVisible = v;
  for (const l of listeners) l();
}

export function getBackVisible() {
  return backVisible;
}

export function subscribeBack(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const DEFAULT_BACK_TINT = "#0a0a0a";
let backTint = DEFAULT_BACK_TINT;
const tintListeners = new Set<Listener>();

export function setBackTint(color: string) {
  if (backTint === color) return;
  backTint = color;
  for (const l of tintListeners) l();
}

export function resetBackTint() {
  setBackTint(DEFAULT_BACK_TINT);
}

export function getBackTint() {
  return backTint;
}

export function subscribeTint(l: Listener) {
  tintListeners.add(l);
  return () => {
    tintListeners.delete(l);
  };
}
