import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Game } from '../types'
import { boardHeight, boardWidth, drawBoard } from './board'
import type { BoardProps, BoardSize } from './board'
import { emptyGame, move, newGame } from './game'
import type { Direction } from './game'

const PANE = 'game'
const CHROME_ROWS = 6
const FULL_ROWS = CHROME_ROWS + boardHeight('large')
const FULL_COLUMNS = 40

const gameState = atom({ plugin: 'wait-2048', key: 'game' } as const, null)
const bestScore = atom({ plugin: 'wait-2048', key: 'best' } as const, 0)
const isClaudeBusy = atom({ plugin: 'wait-2048', key: 'isBusy' } as const, false)

type Action = Direction | 'new' | 'close'

const KEYS = new Map<string, Action>([
  ['up', 'up'],
  ['w', 'up'],
  ['k', 'up'],
  ['down', 'down'],
  ['s', 'down'],
  ['j', 'down'],
  ['left', 'left'],
  ['a', 'left'],
  ['h', 'left'],
  ['right', 'right'],
  ['d', 'right'],
  ['l', 'right'],
  ['n', 'new'],
  ['q', 'close'],
])

const isGame = (value: unknown): value is Game => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const { grid, score } = value as Partial<Game>

  return Array.isArray(grid) && grid.length === 16 && typeof score === 'number'
}

const play = async ($: EngineInterface, action: Direction | 'new') => {
  const next = await update($, gameState, game =>
    action === 'new' || game === null ? newGame() : move(game, action),
  )

  if (next === null) {
    return
  }

  await $.store.set('game', next)

  if (next.score > (await read($, bestScore))) {
    await update($, bestScore, value => Math.max(value, next.score))
    await $.store.set('best', next.score)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: '2048',
      description: 'Play 2048 while Claude works',
      immediate: true,
    })

    const [storedGame, storedBest] = await Promise.all([
      $.store.get('game'),
      $.store.get('best'),
    ])
    await update($, gameState, game => game ?? (isGame(storedGame) ? storedGame : null))
    await update($, bestScore, value =>
      typeof storedBest === 'number' ? Math.max(value, storedBest) : value,
    )

    return next(e)
  })

  on('command.run', { command: '2048' }, async $ => {
    await update($, gameState, game => game ?? newGame())
    await $.ui.open({
      id: PANE,
      title: '2048',
      focus: true,
      rows: FULL_ROWS,
      columns: FULL_COLUMNS,
    })

    return {}
  })

  on('turn.start', async ($, e, next) => {
    await update($, isClaudeBusy, () => true)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }

    await update($, isClaudeBusy, () => false)

    const isPlaying = (await $.ui.panes()).some(pane => pane.id === PANE && pane.isShown)

    if (isPlaying) {
      $.ui.toast('Claude finished. Back to work!')
    }

    return next(e)
  })

  on('ui.message', { element: 'board' }, async ($, e, next) => {
    const { key } = (e.data ?? {}) as { key?: unknown }
    const action = typeof key === 'string' ? KEYS.get(key) : undefined

    if (action === undefined) {
      return next(e)
    }

    if (action === 'close') {
      await $.ui.close({ id: PANE })

      return next(e)
    }

    await play($, action)

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const game = (await read($, gameState)) ?? emptyGame()
    const best = Math.max(await read($, bestScore), game.score)
    const isBusy = await read($, isClaudeBusy)

    const hasRoom =
      e.props.scroll.bodyRows >= FULL_ROWS && e.props.bodyColumns >= boardWidth('large')
    const size: BoardSize = hasRoom ? 'large' : 'compact'
    const board: BoardProps = { grid: game.grid, size }

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    // The resolved table carries a Client on every surface; only these two run one.
    const isClientSurface = e.surface === 'terminal' || e.surface === 'desktop'
    const Client = isClientSurface && 'Client' in ui ? ui.Client : undefined

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
          <Text bold>{`score ${game.score}`}</Text>
          <Text dimColor>{`best ${best}`}</Text>
          {game.isOver && (
            <Text bold color="red">
              game over
            </Text>
          )}
          {!game.isOver && game.hasWon && (
            <Text bold color="yellow">
              2048!
            </Text>
          )}
        </Box>
        {isBusy ? (
          <Text color="yellow">● Claude is working…</Text>
        ) : (
          <Text color="green">✔ Claude is waiting for you</Text>
        )}
        <Box marginTop={1}>
          {Client ? (
            <Client key="board" module="./board.tsx" props={board} />
          ) : (
            drawBoard(ui, board)
          )}
        </Box>
        <Box marginTop={1} flexDirection="row" flexWrap="wrap" columnGap={1}>
          <Button key="up" label="↑" hotkey="w" plain onPress={() => play($, 'up')} />
          <Button key="left" label="←" hotkey="a" plain onPress={() => play($, 'left')} />
          <Button key="down" label="↓" hotkey="s" plain onPress={() => play($, 'down')} />
          <Button key="right" label="→" hotkey="d" plain onPress={() => play($, 'right')} />
          <Button key="new" label="new" hotkey="n" plain onPress={() => play($, 'new')} />
          <Button
            key="close"
            label="close"
            hotkey="q"
            plain
            role="dismiss"
            onPress={() => $.ui.close({ id: PANE })}
          />
        </Box>
        {Client && <Text dimColor>click the board for arrow keys · esc: prompt</Text>}
      </Box>
    )
  })
}
