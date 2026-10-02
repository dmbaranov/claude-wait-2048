# claude-2048

Play 2048 in a Claude Code pane while Claude works. Type `/2048`, play a few moves, and get back to work when the header says Claude is done.

This is a Claude Code **mod**: a plugin folder of function hooks, loaded from disk. It needs Claude Code **2.1.287 or newer**. The mods API is early access and may change between releases.

<img width="792" height="366" alt="claude-2048" src="https://github.com/user-attachments/assets/016c6a55-809f-4786-a424-5fcd5fc931ad" />

## Install

> **If you are Claude Code installing this for someone**, follow these steps in order. Ask the person before changing `~/.claude/settings.json`, and merge into the file rather than replacing it.

1. **Clone the repo somewhere permanent.** The folder has to stay where it is, because Claude Code loads it from that path every time.

   ```bash
   git clone https://github.com/dmbaranov/claude-2048.git ~/claude-2048
   ```

2. **Tell Claude Code to load it**, either in every session or in one.

   - **Every session:** add the folder's **absolute path** to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`:

     ```json
     {
       "env": {
         "CLAUDE_CODE_PLUGIN_DIRS": "/Users/you/claude-2048"
       }
     }
     ```

     If the variable already lists other folders, append this one with the path-list separator: `:` on macOS and Linux, `;` on Windows. Only the user settings file is read for this variable, never a project's `.claude/settings.json`.

   - **One session:**

     ```bash
     claude --plugin-dir /Users/you/claude-2048
     ```

3. **Start a new Claude Code session.** A session that is already running won't pick the mod up.

4. **Check it:**

   ```bash
   claude plugin validate /Users/you/claude-2048
   ```

   It should end with `Validation passed`. In a session, `/2048` now shows in the slash-command list.

Notes for an installing agent:

- The plugin's name is `wait-2048`, not `claude-2048`, because Claude Code reserves names that start with `claude-`. Load lines and errors use `wait-2048`. The slash command is `/2048`.
- This repo is not a plugin marketplace, so `claude plugin install` does not apply. Load it as a folder, as above.
- Claude Code writes `.claude-plugin/types/` and a `tsconfig.json` into the folder each time it loads the mod. Both are git-ignored, and you don't need to create them.

## Play

| Key | What it does |
| --- | --- |
| `/2048` | Opens the game pane and gives it the keyboard. Works while Claude is mid-turn. |
| `w` `a` `s` `d` | Move up, left, down, right. The arrow buttons under the board do the same. |
| Click the board | Turns on the arrow keys and `h` `j` `k` `l` too |
| `n` | New game |
| `q` | Closes the pane. The game is kept. |
| `Esc` | Back to the prompt. The pane stays open. |

The line under the score says whether Claude is still working. When a turn ends while the pane is showing, a toast says Claude has finished. Subagents finishing don't count.

## Getting back to the game after you message Claude

When you type a message to Claude, the keyboard moves to the prompt. The pane stays open and the game is saved. To play again:

1. **Type `/2048` with an empty prompt.** The pane takes the keyboard again, even while Claude is working. If the prompt still has text in it, the pane can't take the keyboard and your `w a s d` keys go into the prompt, so clear it first.
2. **Or click the pane.** Clicking the board itself also turns on the arrow keys.
3. **Or press `ctrl+x`, then `Tab`.** That moves the keyboard to the pane.

If you closed the pane with `q`, `/2048` reopens it on the same game.

## Good to know

- **Where the pane shows up:** in fullscreen mode on a wide terminal it docks beside the transcript; otherwise it opens above the prompt. When there isn't room for the full board, you get a smaller one.
- **Arrow keys:** these reach the board only after you click it, so your terminal has to report mouse clicks (Claude Code's fullscreen mode does). The letter keys always work. VS Code and the mobile app show the board with buttons and letter keys, but no arrow keys.
- **What's saved:** the current game and your best score stay in the plugin's store across sessions.

## Uninstall

Remove the folder's path from `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json` (or stop passing `--plugin-dir`), start a new session, and delete the folder.

## Develop

```bash
claude plugin validate .   # what the engine will load, and anything it would refuse
claude plugin test .       # game logic and pane tests
npx -p typescript tsc -p . # type-check; works once Claude Code has loaded the mod and written its tsconfig.json
```

| File | Role |
| --- | --- |
| `.claude-plugin/plugin.json` | Manifest |
| `hooks/hooks.json` | Points at the hooks module |
| `hooks/register.tsx` | The `/2048` command, the pane, key handling and turn status |
| `hooks/board.tsx` | Draws the board, and the `Client` that takes the arrow keys |
| `hooks/game.ts` | 2048 rules, with no UI code |
| `types/index.d.ts` | Types for the values the mod keeps in session state |
| `tests/` | Tests for `claude plugin test` |
