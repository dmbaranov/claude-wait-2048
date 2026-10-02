import type { ClientElements, ClientModule } from 'claude-code'

export type BoardSize = 'large' | 'compact'

export type BoardProps = { grid: number[]; size: BoardSize }

export const LAYOUT = {
  large: { tileWidth: 6, tileHeight: 3, gapX: 2, gapY: 1, padX: 2, padY: 1 },
  compact: { tileWidth: 5, tileHeight: 1, gapX: 1, gapY: 0, padX: 1, padY: 0 },
} as const

export const boardWidth = (size: BoardSize) => {
  const { tileWidth, gapX, padX } = LAYOUT[size]

  return 4 * tileWidth + 3 * gapX + 2 * padX
}

export const boardHeight = (size: BoardSize) => {
  const { tileHeight, gapY, padY } = LAYOUT[size]

  return 4 * tileHeight + 3 * gapY + 2 * padY
}

const BOARD = '#bbada0'
const DARK = '#776e65'
const LIGHT = '#f9f6f2'

const TILES: Record<number, [background: string, text: string]> = {
  0: ['#cdc1b4', DARK],
  2: ['#eee4da', DARK],
  4: ['#ede0c8', DARK],
  8: ['#f2b179', LIGHT],
  16: ['#f59563', LIGHT],
  32: ['#f67c5f', LIGHT],
  64: ['#f65e3b', LIGHT],
  128: ['#edcf72', LIGHT],
  256: ['#edcc61', LIGHT],
  512: ['#edc850', LIGHT],
  1024: ['#edc53f', LIGHT],
  2048: ['#edc22e', LIGHT],
}
const BEYOND: [string, string] = ['#3c3a32', LIGHT]

export const drawBoard = (
  { Box, Text }: Pick<ClientElements, 'Box' | 'Text'>,
  { grid, size }: BoardProps,
) => {
  const { tileWidth, tileHeight, gapX, gapY, padX, padY } = LAYOUT[size]
  const rows = [0, 1, 2, 3].map(row => grid.slice(row * 4, row * 4 + 4))

  return (
    <Box
      flexDirection="column"
      backgroundColor={BOARD}
      paddingX={padX}
      paddingY={padY}
      rowGap={gapY}
      width={boardWidth(size)}
    >
      {rows.map(cells => (
        <Box flexDirection="row" columnGap={gapX}>
          {cells.map(value => {
            const [background, text] = TILES[value] ?? BEYOND

            return (
              <Box
                width={tileWidth}
                height={tileHeight}
                backgroundColor={background}
                justifyContent="center"
                alignItems="center"
              >
                {value > 0 && (
                  <Text bold color={text} backgroundColor={background}>
                    {String(value)}
                  </Text>
                )}
              </Box>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}

const Board: ClientModule<BoardProps> = (props, surface) => {
  surface.onKey(event => {
    if (event.ctrl || event.meta) {
      return
    }

    surface.post({ key: event.key })
  })

  return drawBoard(surface.elements, props)
}

export default Board
