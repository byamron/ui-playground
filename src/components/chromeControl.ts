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
