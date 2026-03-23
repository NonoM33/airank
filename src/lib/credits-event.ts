// Simple event system to notify sidebar when credits change
export function notifyCreditsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('credits-changed'))
  }
}
