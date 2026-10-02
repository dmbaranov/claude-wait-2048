import { describe, expect, test } from 'claude-code/testing'

import { canMove, move, newGame } from '../hooks/game'
import type { Game } from '../types'

// Always spawns a 2 into the first empty cell.
const first = () => 0

const at = (grid: number[], score = 0): Game => ({ grid, score, isOver: false, hasWon: false })

const CHECKERED = [
  2, 4, 2, 4,
  4, 2, 4, 2,
  2, 4, 2, 4,
  4, 2, 4, 2,
]

describe('move', () => {
  test('merges each pair once and scores the merges', () => {
    const game = move(at([2, 2, 2, 2, ...Array(12).fill(0)]), 'left', first)

    expect(game.grid).toEqual([4, 4, 2, 0, ...Array(12).fill(0)])
    expect(game.score).toBe(8)
  })

  test('never merges a tile twice in one move', () => {
    const game = move(at([2, 2, 4, 0, ...Array(12).fill(0)]), 'left', first)

    expect(game.grid.slice(0, 4)).toEqual([4, 4, 2, 0])
    expect(game.score).toBe(4)
  })

  test('slides right and down toward the far edge', () => {
    const right = move(at([2, 0, 0, 2, ...Array(12).fill(0)]), 'right', first)
    expect(right.grid.slice(0, 4)).toEqual([2, 0, 0, 4])

    const down = move(at([2, ...Array(11).fill(0), 2, 0, 0, 0]), 'down', first)
    expect(down.grid[12]).toBe(4)
    expect(down.grid[0]).toBe(2)
  })

  test('a move that changes nothing returns the same game with no spawn', () => {
    const game = at([2, ...Array(15).fill(0)])

    expect(move(game, 'left', first)).toBe(game)
    expect(move(game, 'up', first)).toBe(game)
  })

  test('reaching 2048 marks the game won', () => {
    const game = move(at([1024, 1024, ...Array(14).fill(0)]), 'left', first)

    expect(game.hasWon).toBe(true)
    expect(game.score).toBe(2048)
  })

  test('a finished game ignores moves', () => {
    const game = { ...at(CHECKERED), isOver: true }

    expect(move(game, 'left', first)).toBe(game)
  })
})

describe('canMove', () => {
  test('is false on a full board with no equal neighbours', () => {
    expect(canMove(CHECKERED)).toBe(false)
  })

  test('is true with an empty cell or an equal neighbour', () => {
    expect(canMove([0, ...CHECKERED.slice(1)])).toBe(true)
    expect(canMove([4, ...CHECKERED.slice(1)])).toBe(true)
  })
})

test('a new game starts with two tiles and no score', () => {
  const game = newGame()

  expect(game.grid.filter(value => value !== 0)).toHaveLength(2)
  expect(game.score).toBe(0)
})
