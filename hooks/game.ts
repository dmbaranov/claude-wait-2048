import type { Game } from '../types'

export type Direction = 'left' | 'right' | 'up' | 'down'

const SIZE = 4

const range = Array.from({ length: SIZE }, (_, i) => i)

// Each line lists its cells in the order tiles slide toward.
const LINES: Record<Direction, number[][]> = {
  left: range.map(row => range.map(col => row * SIZE + col)),
  right: range.map(row => range.map(col => row * SIZE + (SIZE - 1 - col))),
  up: range.map(col => range.map(row => row * SIZE + col)),
  down: range.map(col => range.map(row => (SIZE - 1 - row) * SIZE + col)),
}

const slide = (values: number[]) => {
  const out: number[] = []
  let gained = 0
  let pending = 0

  for (const value of values) {
    if (value === 0) {
      continue
    }

    if (value === pending) {
      out.push(value * 2)
      gained += value * 2
      pending = 0
    } else {
      if (pending !== 0) {
        out.push(pending)
      }
      pending = value
    }
  }

  if (pending !== 0) {
    out.push(pending)
  }

  while (out.length < SIZE) {
    out.push(0)
  }

  return { out, gained }
}

const spawn = (grid: number[], random: () => number) => {
  const empty = grid.flatMap((value, i) => (value === 0 ? [i] : []))
  const cell = empty[Math.floor(random() * empty.length)]

  if (cell === undefined) {
    return grid
  }

  const next = [...grid]
  next[cell] = random() < 0.9 ? 2 : 4

  return next
}

export const canMove = (grid: number[]) =>
  grid.some(
    (value, i) =>
      value === 0 ||
      (i % SIZE < SIZE - 1 && value === grid[i + 1]) ||
      (i < SIZE * (SIZE - 1) && value === grid[i + SIZE]),
  )

export const emptyGame = (): Game => ({
  grid: Array.from({ length: SIZE * SIZE }, () => 0),
  score: 0,
  isOver: false,
  hasWon: false,
})

export const newGame = (random: () => number = Math.random): Game => {
  const game = emptyGame()

  return { ...game, grid: spawn(spawn(game.grid, random), random) }
}

export const move = (
  game: Game,
  direction: Direction,
  random: () => number = Math.random,
): Game => {
  if (game.isOver) {
    return game
  }

  const grid = [...game.grid]
  let gained = 0

  for (const line of LINES[direction]) {
    const { out, gained: lineGain } = slide(line.map(cell => game.grid[cell] ?? 0))
    line.forEach((cell, k) => {
      grid[cell] = out[k] ?? 0
    })
    gained += lineGain
  }

  if (grid.every((value, i) => value === game.grid[i])) {
    return game
  }

  const next = spawn(grid, random)

  return {
    grid: next,
    score: game.score + gained,
    isOver: !canMove(next),
    hasWon: game.hasWon || next.includes(2048),
  }
}
