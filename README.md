# Pomodoro — focus timer for the Omarchy bar

A pomodoro timer for the [Omarchy](https://omarchy.org) shell. A countdown sits
in the bar next to the clock, a click opens the controls. When a block ends you
get a desktop notification and a chime, and a break can also cover the screen
with a progress ring if you turn that on (off by default). Notifications are
silenced while you focus, and the timer survives shell restarts, theme switches
and suspend.

Classic rhythm out of the box: **25 min focus · 5 min break · 15 min long break
after every 4th block**. Everything is a setting.

## The popup

![Pomodoro popup in the bar](screenshots/popup.png)

- Big countdown with a progress line and session dots (one per focus block in
  the current set).
- Start / Pause / Resume, skip the current block, add five minutes, stop.
  A skipped focus block is not a finished session: it does not count towards
  the set (so the long break is not moved on) or today's stats. The break that
  follows is chosen from the count you have so far.
- Focus presets (`15 · 25 · 50 · 90` min by default — right-click one to make
  it the default length).
- Start a short or long break on demand.
- Three toggles: silence notifications while focusing, full-screen break
  screen, chime at the end of a block.
- Today's sessions and focused minutes.

## The break

A break is a desktop notification and a chime by default. When a focus block
ends you get a chime and a "Focus complete" notification, and the break starts
(or waits for you, see `autoStartBreak`). When the break ends you get a chime
and a "Break over" notification. Nothing covers your screen.

## The break screen (optional, off by default)

![Full-screen break screen](screenshots/break.png)

Turn on the full-screen break screen with the popup toggle or the `overlay`
setting. When a focus block ends it covers every monitor: phase title,
a progress ring counting the break down, a short tip, the session dots, and
buttons for Pause, +5 min, Skip break and Stop.

**Press `Esc` to get out of the break screen at any time** — it hides the
overlay for the rest of that break while the timer keeps running in the bar.
`Space` (or `Enter`) skips the break and starts the next focus block. When the
break is over the screen waits for you with a *Start 25 min focus* button
(press `Enter`) rather than starting the next block on its own, so a break that
runs long never silently eats into a focus block. Whether the break screen
shows at all is set by the popup toggle or the `overlay` setting.

## Bar widget

The bar shows a timer icon when idle, the countdown alone while a block runs
(the clock turns the accent colour during focus and dims while paused), the
word `focus` or `break` when a block is waiting for you to start it, and a thin
progress hairline under the label while a block runs. The vertical bar shows
the icon instead. The tooltip adds today's total once a session has finished,
for example `· today 3 sessions, 75 min`.

| Action | Result |
|---|---|
| Left click | Open / close the popup |
| Right click | Start (or pause / resume) |
| Middle click | Skip the current block |
| Scroll | ± 1 minute on the running block |

## Requirements

- Omarchy with the Quattro shell (`omarchy-shell`, Quickshell based).
- `pipewire` (`pw-play`) or `pulseaudio` (`paplay`) for the chime, and the
  freedesktop sound theme (`/usr/share/sounds/freedesktop`) — all standard on
  Omarchy. Set `sound` to `false` if you have neither.
- `python3` (standard library only) for the bundled state reader — a hard
  dependency of Omarchy itself, so nothing extra to install.
- Optional, for the CLI: `jq` (standard on Omarchy).

No sudo or pkexec is required.

## Install

```bash
omarchy plugin add https://github.com/techywilbur/omarchy-pomodoro.git --enable
```

`--enable` places the widget in the bar's center section (you can choose a
section when prompted). To add it later, or move it next to the clock:

```bash
omarchy plugin enable techywilbur.pomodoro
omarchy bar move techywilbur.pomodoro --section center
```

## Update

```bash
omarchy plugin update techywilbur.pomodoro
```

## Remove

```bash
omarchy plugin remove techywilbur.pomodoro
```

That deletes the plugin folder and its bar entry. The only other thing the
plugin creates is its state file, `~/.local/state/uni-pomo/state.json`, which
you can delete by hand. If you installed the optional CLI, menu entries or
keybinds below, remove those the same way you added them.

## Settings

Settings live inline on the widget's entry in `~/.config/omarchy/shell.json`
and can be edited from the Omarchy bar settings panel or the popup toggles.
Changes apply immediately.

| Key | Default | Meaning |
|---|---|---|
| `focus` | `25` | Focus block length in minutes |
| `shortBreak` | `5` | Short break length |
| `longBreak` | `15` | Long break length |
| `longEvery` | `4` | Long break after every Nth focus block (`0` = never) |
| `presets` | `[15, 25, 50, 90]` | Focus preset buttons in the popup |
| `dnd` | `true` | Turn on Do Not Disturb during focus, restore afterwards |
| `pauseOnIdle` | `true` | Pause a running focus block after `idleAfter` minutes without input, resume when you are back. Only a pause made this way resumes by itself. Breaks are never paused |
| `idleAfter` | `5` | Minutes without input before a focus block pauses (`1`–`60`) |
| `overlay` | `false` | Full-screen break screen (optional). Off: a break is a notification and chime only |
| `overlayDim` | `0.93` | Darkness of the break screen (`0.3`–`1`) |
| `sound` | `true` | Chime at the end of a block |
| `notify` | `true` | Desktop notification at the end of a block |
| `autoStartBreak` | `true` | Focus done → break starts by itself |
| `autoStartFocus` | `false` | Break done → next focus starts by itself (off: wait for you) |
| `soundFocusEnd` | freedesktop `complete.oga` | Sound file played when focus ends |
| `soundBreakEnd` | freedesktop `message.oga` | Sound file played when a break ends |
| `staleAfter` | `30` | Minutes after which a restored, already-ended block is dropped |

`overlay` changed default in this version: it is now off. If you already have
`overlay` saved in `~/.config/omarchy/shell.json`, your saved value is kept.
The new default only applies when the key is missing.

Example entry:

```json
{ "id": "techywilbur.pomodoro", "focus": 50, "shortBreak": 10, "presets": [25, 50, 90], "dnd": false }
```

## Optional: CLI, keybinds and menu entries

The repository ships `uni-pomo`, a small bash CLI that talks to the plugin over
IPC. Nothing installs it for you — copy it if you want it:

```bash
install -m 755 ~/.config/omarchy/plugins/techywilbur.pomodoro/uni-pomo ~/.local/bin/uni-pomo
uni-pomo help
```

```
uni-pomo                     short human status
uni-pomo status [--json]     status (JSON with --json)
uni-pomo start | toggle | pause | resume | stop | skip
uni-pomo focus [min]         start a focus block
uni-pomo break [min]         start a short break
uni-pomo long [min]          start a long break
uni-pomo extend <min>        add (or subtract) minutes on the running block
uni-pomo hide | show         hide / show the break screen
uni-pomo panel               toggle the bar popup
uni-pomo get <key>           read a setting
uni-pomo set <key> <value>   write a setting (edits shell.json with jq)
uni-pomo settings            print all settings
```

With the CLI in place, `extras/bindings.lua` adds `SUPER+SHIFT+P` (start /
pause), `SUPER+SHIFT+CTRL+P` (stop) and `SUPER+SHIFT+ALT+P` (popup) — append it
to `~/.config/hypr/bindings.lua`. Note that stock Omarchy binds `SUPER+SHIFT+P`
to Google Photos; the snippet unbinds it first, so pick other keys if you use
that. `extras/omarchy-menu.jsonc` adds a **Pomodoro** entry to the Omarchy menu
(`SUPER+SPACE`) with start / pause, skip, stop, focus lengths, breaks and
✓ toggles — merge it into `~/.config/omarchy/extensions/omarchy-menu.jsonc`.

## Idle and resume

With `pauseOnIdle` on (the default), a focus block pauses itself when there has
been no keyboard or pointer input for `idleAfter` minutes. When you move again
it resumes from where it stopped. A pause you made yourself is never resumed
for you. Breaks are not paused, so a break keeps counting down while you are
away.

Idle is detected with Quickshell's `IdleMonitor`. A playing video (an idle
inhibitor) counts as not idle. Locking the screen is not detected by the
plugin, so a manual lock without idle time does not pause the timer. Omarchy
locks after idle (`idle.lock` in `shell.json`, 300 s by default), so a lock
that follows idle pauses the timer as long as `idleAfter` is not longer than
that lock timeout.

If the shell was away for a while (suspend, a frozen session), a block that
ended more than 2 minutes before the shell noticed still counts as finished,
but the next step waits for you ("Focus complete" or "Break over" with a
Start button) instead of starting a full-length countdown from now.

## IPC

```bash
omarchy-shell pomodoro status                # JSON status
omarchy-shell pomodoro toggle                # start / pause / resume
omarchy-shell pomodoro focus 50              # also: shortBreak, longBreak, extend <min>
omarchy-shell pomodoro skip | stop | pause | resume
omarchy-shell pomodoro hideBreak | showBreak # break screen
omarchy-shell shell toggle techywilbur.pomodoro   # open / close the popup
```

## How it works, and what it touches

- `Service.qml` is the engine: one instance per shell keeps the phase, an
  absolute end time, the set counter and today's stats, and draws the optional
  break screen on every monitor. `BarWidget.qml` (one per monitor) renders the bar
  label and the popup. `PomoModel.js` is the pure logic.
- Time is stored as a wall-clock end, so a block keeps counting correctly
  through suspend and shell restarts. State is written to
  `~/.local/state/uni-pomo/state.json` on every transition (atomically, via a
  temp file and rename). It is read back only through the bundled
  `pomo-state-read` helper, which opens the directory and file with
  `O_NOFOLLOW` (the file also `O_NONBLOCK`), checks the *open* descriptor is a
  regular file owned by you and at most 16 KiB, caps the read, and hands the
  shell a whitelisted, range-checked object. A planted FIFO, symlink or
  oversized file cannot block or bloat the shell at startup; the timer just
  starts fresh.
- Do Not Disturb goes through the shell's own notifications service; the state
  you had before the focus block is restored when it ends.
- The chime is played with `pw-play` (falling back to `paplay`); notifications
  use `omarchy-notification-send`.
- The plugin writes to `~/.config/omarchy/shell.json` only when you change a
  setting from the popup, and only its own widget entry.
- No sudo or pkexec is required. Nothing is installed outside the plugin folder
  unless you copy the optional CLI yourself.

## Files

```
manifest.json        plugin manifest (kinds: service + bar-widget, settings schema)
Service.qml          engine, persistence, DND, break screen; IPC target `pomodoro`
BarWidget.qml        bar label + popup; IPC target `techywilbur.pomodoro`
PomoModel.js         pure logic: settings parsing, phases, formatting
tests/               unit tests for PomoModel.js (node:test, no dependencies)
pomo-state-read      bounded, non-following state reader (python3, stdlib only)
uni-pomo             optional bash CLI
extras/bindings.lua  optional Hyprland keybinds
extras/omarchy-menu.jsonc  optional Omarchy menu entries
screenshots/         popup.png, break.png
preview.png          marketplace preview
```

## License

[MIT](LICENSE) © 2026 Wilbur Lindqvist
