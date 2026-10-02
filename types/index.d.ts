export type Game = {
  grid: number[]
  score: number
  isOver: boolean
  hasWon: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'wait-2048': { game: Game | null; best: number; isBusy: boolean }
  }
}
