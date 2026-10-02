import type { On, RenderSurface } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine, Mounted } from 'claude-code/testing'

const PLUGIN = 'wait-2048'
const MOVES = ['left', 'up', 'right', 'down'] as const

const mountPane = <S extends RenderSurface>($: Engine, surface: S, bodyRows = 40) =>
  $.ui.mount({
    plugin: PLUGIN,
    surface,
    component: 'Pane',
    requestId: 'game',
    props: {
      title: '2048',
      isFocused: true,
      bodyColumns: 40,
      placement: 'dock',
      scroll: { offset: 0, bodyRows },
      view: {},
    },
  })

const openGame = async ($: Engine, on: On, store: Record<string, unknown> = {}) => {
  mock.store(on, store)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.command.run({
    command: '2048',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  })
}

type Drawing = Pick<Mounted, 'surface' | 'find' | 'findAll'>

const hasClient = (surface: RenderSurface) => surface === 'terminal' || surface === 'desktop'

const tiles = async (ui: Drawing) => {
  const found = await ui.findAll(
    hasClient(ui.surface) ? { type: 'Text', in: 'board' } : { type: 'Text' },
  )

  return found.filter(text => /^\d+$/.test(text.text)).map(text => Number(text.text))
}

// A move that changes the board spawns a tile and merges keep the sum, so the sum only grows.
const tileSum = async (ui: Drawing) => (await tiles(ui)).reduce((sum, value) => sum + value, 0)

const shown = async (ui: Drawing, label: 'score' | 'best') => {
  const text = (await ui.find({ type: 'Text', text: new RegExp(`^${label} \\d+$`) }))?.text

  return Number(text?.slice(label.length + 1))
}

test('arrow keys on the board move the tiles', async ($, on) => {
  await openGame($, on)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface)
    const before = await tileSum(ui)

    for (const key of MOVES) {
      await ui.key({ key, in: 'board' })
    }

    expect(await tileSum(ui)).toBeGreaterThan(before)
    await ui.unmount()
  }
})

test('hotkey buttons move the tiles on every surface, inline where there is no Client', async ($, on) => {
  await openGame($, on)

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await mountPane($, surface)
    const before = await tileSum(ui)

    for (const key of MOVES) {
      await ui.press({ key })
    }

    expect(await tileSum(ui)).toBeGreaterThan(before)
    expect((await ui.find({ type: 'Client' })) !== undefined).toBe(hasClient(surface))
    await ui.unmount()
  }
})

test('n starts over and the best score outlives the game', async ($, on) => {
  await openGame($, on)
  const ui = await mountPane($, 'terminal')

  for (let i = 0; i < 40; i++) {
    await ui.key({ key: MOVES[i % 4] ?? 'left', in: 'board' })
  }

  const played = await shown(ui, 'score')
  await ui.key({ key: 'n', in: 'board' })

  expect(played).toBeGreaterThan(0)
  expect(await shown(ui, 'score')).toBe(0)
  expect(await tiles(ui)).toHaveLength(2)
  expect(await shown(ui, 'best')).toBe(played)
})

test('the best score comes back from the store', async ($, on) => {
  await openGame($, on, { best: 512 })
  const ui = await mountPane($, 'terminal')

  expect(await shown(ui, 'best')).toBe(512)
})

test('the status line follows the main turn and ignores subagents', async ($, on) => {
  await openGame($, on)
  const ui = await mountPane($, 'terminal')
  const turn = { answer: '', durationMs: 1, isAborted: false, reason: 'answer' as const }

  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(await ui.find({ type: 'Text', text: /working/ })).toBeDefined()

  await $.turn.complete({ ...turn, turnId: 'sub', agentId: 'agent-1' })
  expect(await ui.find({ type: 'Text', text: /working/ })).toBeDefined()

  await $.turn.complete({ ...turn, turnId: 't1' })
  expect(await ui.find({ type: 'Text', text: /waiting for you/ })).toBeDefined()
})

test('a short pane gets the compact board', async ($, on) => {
  await openGame($, on)

  const tall = await mountPane($, 'terminal', 40)
  expect((await tall.find({ type: 'Client' }))?.props.props).toMatchObject({ size: 'large' })
  await tall.unmount()

  const short = await mountPane($, 'terminal', 12)
  expect((await short.find({ type: 'Client' }))?.props.props).toMatchObject({ size: 'compact' })
})
