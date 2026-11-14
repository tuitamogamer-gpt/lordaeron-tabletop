/**
 * Whether the screen in hand is worked with a finger. A finger has no hover and no Esc key, and taps where a mouse
 * clicks, so a hint names the gesture that is actually on offer.
 */
export const byTouch = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
