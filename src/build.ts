/** Which build is running, so that a player can tell whether the page they see is the latest one. Vite defines it; plain Node (the render check) has none. */
declare const __BUILD__: { commit: string; date: string };
export const BUILD: { commit: string; date: string } = typeof __BUILD__ === 'undefined' ? { commit: 'dev', date: '' } : __BUILD__;
