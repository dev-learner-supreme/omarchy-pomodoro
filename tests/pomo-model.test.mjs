// Unit tests for PomoModel.js, the pure logic behind the pomodoro plugin.
// Run from the repo root with: mise x -- node --test tests/
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import vm from "node:vm"

// PomoModel.js is a QML JS library: its first line is `.pragma library`, which
// is QML-only syntax. Strip it and evaluate the rest in a fresh context so the
// top-level functions and vars become properties of `Pomo`.
const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "PomoModel.js"), "utf8").replace(/^\.pragma.*$/gm, "")
const Pomo = vm.createContext({})
vm.runInContext(source, Pomo, { filename: "PomoModel.js" })

// Objects and arrays made inside the vm context have another realm's
// prototypes, which breaks strict deep equality. Copy them to plain JSON.
const plain = (value) => JSON.parse(JSON.stringify(value))

// ---------------------------------------------------------------- config

test("config(null) and config(undefined) return the defaults", () => {
  const fromNull = plain(Pomo.config(null))
  const fromUndefined = plain(Pomo.config(undefined))
  assert.deepEqual(fromNull, fromUndefined)
  assert.equal(fromNull.focus, 25)
  assert.equal(fromNull.shortBreak, 5)
  assert.equal(fromNull.longBreak, 15)
  assert.equal(fromNull.longEvery, 4)
  assert.equal(fromNull.dnd, true)
  assert.equal(fromNull.overlay, false)
  assert.equal(fromNull.sound, true)
  assert.equal(fromNull.notify, true)
  assert.equal(fromNull.autoStartBreak, true)
  assert.equal(fromNull.autoStartFocus, false)
  assert.equal(fromNull.pauseOnIdle, true)
  assert.equal(fromNull.idleAfter, 5)
  assert.equal(fromNull.staleAfter, 30)
  assert.deepEqual(fromNull.presets, [15, 25, 50, 90])
})

test("manifest.json defaults match the config defaults in PomoModel.js", () => {
  const manifest = JSON.parse(readFileSync(join(here, "..", "manifest.json"), "utf8"))
  const defaults = manifest.barWidget.defaults
  const config = plain(Pomo.config(null))
  for (const key of Object.keys(defaults)) assert.deepEqual(config[key], defaults[key], key)
})

test("config({}) returns the defaults", () => {
  assert.equal(Pomo.config({}).focus, 25)
  assert.equal(Pomo.config({}).longEvery, 4)
})

test("config keeps valid values", () => {
  const c = Pomo.config({ focus: 50, shortBreak: 10, longBreak: 20, longEvery: 3 })
  assert.equal(c.focus, 50)
  assert.equal(c.shortBreak, 10)
  assert.equal(c.longBreak, 20)
  assert.equal(c.longEvery, 3)
})

test("config falls back to the default for bad numbers", () => {
  const c = Pomo.config({ focus: "abc", shortBreak: null, longBreak: "", longEvery: undefined })
  assert.equal(c.focus, 25)
  assert.equal(c.shortBreak, 5)
  assert.equal(c.longBreak, 15)
  assert.equal(c.longEvery, 4)
})

test("config clamps numbers to their ranges", () => {
  const low = Pomo.config({ focus: 0, shortBreak: -3, longEvery: -1, overlayDim: 0 })
  assert.equal(low.focus, 1)
  assert.equal(low.shortBreak, 1)
  assert.equal(low.longEvery, 0)
  assert.equal(low.overlayDim, 0.3)

  const high = Pomo.config({ focus: 999, longBreak: 500, longEvery: 99, overlayDim: 5, staleAfter: 1e9 })
  assert.equal(high.focus, 180)
  assert.equal(high.longBreak, 120)
  assert.equal(high.longEvery, 12)
  assert.equal(high.overlayDim, 1)
  assert.equal(high.staleAfter, 24 * 60)
})

test("config clamps idleAfter to whole minutes between 1 and 60", () => {
  assert.equal(Pomo.config({ idleAfter: 0 }).idleAfter, 1)
  assert.equal(Pomo.config({ idleAfter: 1000 }).idleAfter, 60)
  assert.equal(Pomo.config({ idleAfter: 7.6 }).idleAfter, 8)
  assert.equal(Pomo.config({ idleAfter: "abc" }).idleAfter, 5)
  assert.equal(Pomo.config({ idleAfter: "12" }).idleAfter, 12)
})

test("config reads pauseOnIdle as a boolean with default true", () => {
  assert.equal(Pomo.config({}).pauseOnIdle, true)
  assert.equal(Pomo.config({ pauseOnIdle: false }).pauseOnIdle, false)
  assert.equal(Pomo.config({ pauseOnIdle: "false" }).pauseOnIdle, false)
})

test("config accepts numeric strings", () => {
  assert.equal(Pomo.config({ focus: "50" }).focus, 50)
})

test("config reads boolean strings the way the settings file may store them", () => {
  assert.equal(Pomo.config({ dnd: "false" }).dnd, false)
  assert.equal(Pomo.config({ dnd: "0" }).dnd, false)
  assert.equal(Pomo.config({ dnd: "off" }).dnd, false)
  assert.equal(Pomo.config({ dnd: "true" }).dnd, true)
  assert.equal(Pomo.config({ dnd: false }).dnd, false)
  assert.equal(Pomo.config({ dnd: null }).dnd, true)
  assert.equal(Pomo.config({ overlay: false }).overlay, false)
})

test("config falls back to default presets when the list is not an array or is empty", () => {
  assert.deepEqual(plain(Pomo.config({ presets: "15,25" }).presets), [15, 25, 50, 90])
  assert.deepEqual(plain(Pomo.config({ presets: [] }).presets), [15, 25, 50, 90])
})

test("config clamps preset values to 1..180 and reads numeric strings", () => {
  assert.deepEqual(plain(Pomo.config({ presets: [10, 500, "30"] }).presets), [10, 180, 30])
})

// Known quirk, kept as-is on purpose: num() clamps a bad or zero preset to the
// minimum (1), so the later `filter(p > 0)` never drops anything. A preset of
// 0 or "x" becomes a 1-minute preset. See the report for this change.
test("config turns zero and non-numeric presets into 1 minute (current behaviour)", () => {
  assert.deepEqual(plain(Pomo.config({ presets: [0, -5, "x"] }).presets), [1, 1, 1])
})

test("config returns a fresh presets array, not the shared default", () => {
  const a = Pomo.config(null).presets
  a.push(999)
  assert.deepEqual(plain(Pomo.config(null).presets), [15, 25, 50, 90])
})

test("config uses the default sound paths for empty strings", () => {
  const c = Pomo.config({ soundFocusEnd: "", soundBreakEnd: null })
  assert.equal(c.soundFocusEnd, "/usr/share/sounds/freedesktop/stereo/complete.oga")
  assert.equal(c.soundBreakEnd, "/usr/share/sounds/freedesktop/stereo/message.oga")
})

// ---------------------------------------------------------------- findEntry

test("findEntry returns null for a null or empty shell config", () => {
  assert.equal(Pomo.findEntry(null, "techywilbur.pomodoro"), null)
  assert.equal(Pomo.findEntry(undefined, "techywilbur.pomodoro"), null)
  assert.equal(Pomo.findEntry({}, "techywilbur.pomodoro"), null)
})

test("findEntry searches the bar layout sections", () => {
  const entry = { id: "techywilbur.pomodoro", focus: 50 }
  const shellConfig = { bar: { layout: { left: [{ id: "other" }], center: [entry], right: null } } }
  assert.equal(Pomo.findEntry(shellConfig, "techywilbur.pomodoro"), entry)
})

test("findEntry falls back to the plugins list", () => {
  const entry = { id: "techywilbur.pomodoro", dnd: false }
  assert.equal(Pomo.findEntry({ plugins: [null, entry] }, "techywilbur.pomodoro"), entry)
})

test("findEntry returns null when the id is missing or the list is malformed", () => {
  const shellConfig = { bar: { layout: { center: "not-a-list" } }, plugins: "nope" }
  assert.equal(Pomo.findEntry(shellConfig, "techywilbur.pomodoro"), null)
  assert.equal(Pomo.findEntry({ bar: { layout: { center: [{ id: "x" }] } } }, "techywilbur.pomodoro"), null)
})

// ---------------------------------------------------------------- mmss

test("mmss formats zero as 00:00", () => {
  assert.equal(Pomo.mmss(0), "00:00")
})

test("mmss clamps negative values to 00:00", () => {
  assert.equal(Pomo.mmss(-1), "00:00")
  assert.equal(Pomo.mmss(-60000), "00:00")
})

test("mmss rounds partial seconds up", () => {
  assert.equal(Pomo.mmss(1), "00:01")
  assert.equal(Pomo.mmss(1000), "00:01")
  assert.equal(Pomo.mmss(1001), "00:02")
  assert.equal(Pomo.mmss(59999), "01:00")
})

test("mmss pads single digits and keeps minutes above 59", () => {
  assert.equal(Pomo.mmss(5 * 1000), "00:05")
  assert.equal(Pomo.mmss(25 * 60000), "25:00")
  assert.equal(Pomo.mmss(90 * 60000), "90:00")
  assert.equal(Pomo.mmss(3600000), "60:00")
  assert.equal(Pomo.mmss(3661000), "61:01")
})

// ---------------------------------------------------------------- nextBreakKind

test("nextBreakKind is always short when longEvery is 0", () => {
  for (const done of [0, 1, 4, 8, 100]) assert.equal(Pomo.nextBreakKind(done, 0), "short")
})

test("nextBreakKind is short before the first focus block ends", () => {
  assert.equal(Pomo.nextBreakKind(0, 4), "short")
})

test("nextBreakKind changes to long exactly on every Nth block", () => {
  assert.equal(Pomo.nextBreakKind(1, 4), "short")
  assert.equal(Pomo.nextBreakKind(3, 4), "short")
  assert.equal(Pomo.nextBreakKind(4, 4), "long")
  assert.equal(Pomo.nextBreakKind(5, 4), "short")
  assert.equal(Pomo.nextBreakKind(8, 4), "long")
})

test("nextBreakKind with longEvery 1 gives a long break after every block", () => {
  assert.equal(Pomo.nextBreakKind(0, 1), "short")
  assert.equal(Pomo.nextBreakKind(1, 1), "long")
  assert.equal(Pomo.nextBreakKind(2, 1), "long")
})

// ---------------------------------------------------------------- sessionDots

test("sessionDots is empty when longEvery is 0", () => {
  assert.deepEqual(plain(Pomo.sessionDots(0, 0, "focus")), [])
  assert.deepEqual(plain(Pomo.sessionDots(3, 0, "idle")), [])
})

test("sessionDots marks the current block only during focus", () => {
  assert.deepEqual(plain(Pomo.sessionDots(2, 4, "focus")), ["done", "done", "current", "empty"])
  assert.deepEqual(plain(Pomo.sessionDots(2, 4, "short")), ["done", "done", "empty", "empty"])
  assert.deepEqual(plain(Pomo.sessionDots(2, 4, "ready")), ["done", "done", "empty", "empty"])
})

test("sessionDots at the start and end of a set", () => {
  assert.deepEqual(plain(Pomo.sessionDots(0, 4, "focus")), ["current", "empty", "empty", "empty"])
  assert.deepEqual(plain(Pomo.sessionDots(4, 4, "focus")), ["done", "done", "done", "done"])
  assert.deepEqual(plain(Pomo.sessionDots(4, 4, "short")), ["done", "done", "done", "done"])
})

test("sessionDots does not crash or add dots when cyclesDone is past the set", () => {
  assert.deepEqual(plain(Pomo.sessionDots(7, 4, "focus")), ["done", "done", "done", "done"])
})

// ---------------------------------------------------------------- phase helpers

test("isBreak is true only for short and long", () => {
  assert.equal(Pomo.isBreak("short"), true)
  assert.equal(Pomo.isBreak("long"), true)
  assert.equal(Pomo.isBreak("focus"), false)
  assert.equal(Pomo.isBreak("ready"), false)
  assert.equal(Pomo.isBreak("idle"), false)
  assert.equal(Pomo.isBreak(undefined), false)
})

test("phaseLabel names each phase and the ready state's next step", () => {
  assert.equal(Pomo.phaseLabel("focus"), "Focus")
  assert.equal(Pomo.phaseLabel("short"), "Short break")
  assert.equal(Pomo.phaseLabel("long"), "Long break")
  assert.equal(Pomo.phaseLabel("ready", "break"), "Focus complete")
  assert.equal(Pomo.phaseLabel("ready", "focus"), "Break over")
  assert.equal(Pomo.phaseLabel("ready"), "Break over")
  assert.equal(Pomo.phaseLabel("idle"), "Pomodoro")
  assert.equal(Pomo.phaseLabel("garbage"), "Pomodoro")
})

test("phaseIcon changes between running and paused for focus and breaks", () => {
  assert.notEqual(Pomo.phaseIcon("focus", true), Pomo.phaseIcon("focus", false))
  assert.notEqual(Pomo.phaseIcon("short", true), Pomo.phaseIcon("short", false))
  assert.equal(Pomo.phaseIcon("idle", false), Pomo.phaseIcon("idle", true))
})

// ---------------------------------------------------------------- todaySummary

test("todaySummary is empty when nothing finished today", () => {
  assert.equal(Pomo.todaySummary(0, 0), "")
  assert.equal(Pomo.todaySummary(0, 75), "")
  assert.equal(Pomo.todaySummary(undefined, undefined), "")
  assert.equal(Pomo.todaySummary(-1, 10), "")
})

test("todaySummary uses singular for one session", () => {
  assert.equal(Pomo.todaySummary(1, 25), "today 1 session, 25 min")
})

test("todaySummary uses plural for several sessions", () => {
  assert.equal(Pomo.todaySummary(3, 75), "today 3 sessions, 75 min")
  assert.equal(Pomo.todaySummary(2, 0), "today 2 sessions, 0 min")
})

// ---------------------------------------------------------------- tipFor

test("tipFor wraps the index around the tip list", () => {
  assert.equal(Pomo.tipFor(0), Pomo.tipFor(8))
  assert.equal(Pomo.tipFor(1), Pomo.tipFor(9))
  assert.notEqual(Pomo.tipFor(0), Pomo.tipFor(1))
})

test("tipFor accepts negative and fractional indexes", () => {
  assert.equal(typeof Pomo.tipFor(-3), "string")
  assert.equal(Pomo.tipFor(2.4), Pomo.tipFor(2))
})

// ---------------------------------------------------------------- todayKey

test("todayKey formats the local date as YYYY-MM-DD", () => {
  assert.equal(Pomo.todayKey(new Date(2026, 0, 5, 12)), "2026-01-05")
  assert.equal(Pomo.todayKey(new Date(2026, 10, 24, 23, 59)), "2026-11-24")
})

test("todayKey with no argument returns a date-shaped string", () => {
  assert.match(Pomo.todayKey(), /^\d{4}-\d{2}-\d{2}$/)
})

// ---------------------------------------------------------------- parseState

test("parseState returns null for empty input", () => {
  assert.equal(Pomo.parseState(""), null)
  assert.equal(Pomo.parseState(null), null)
  assert.equal(Pomo.parseState(undefined), null)
})

test("parseState returns null for garbage", () => {
  assert.equal(Pomo.parseState("{not json"), null)
  assert.equal(Pomo.parseState("hello"), null)
})

test("parseState returns null for JSON that is not an object", () => {
  assert.equal(Pomo.parseState("null"), null)
  assert.equal(Pomo.parseState("42"), null)
  assert.equal(Pomo.parseState('"text"'), null)
  assert.equal(Pomo.parseState("true"), null)
})

test("parseState returns a valid state object unchanged", () => {
  const raw = JSON.stringify({ version: 1, phase: "focus", running: true, endsAt: 123, plannedMs: 1500000 })
  assert.deepEqual(plain(Pomo.parseState(raw)), { version: 1, phase: "focus", running: true, endsAt: 123, plannedMs: 1500000 })
})

test("parseState passes out-of-range values through; clamping is done by the caller", () => {
  // parseState only checks the JSON shape. Range checks happen in
  // Service.qml hydrate() and in the pomo-state-read helper.
  const parsed = Pomo.parseState(JSON.stringify({ cyclesDone: -5, plannedMs: 1e15, phase: "bogus" }))
  assert.equal(parsed.cyclesDone, -5)
  assert.equal(parsed.plannedMs, 1e15)
  assert.equal(parsed.phase, "bogus")
})

test("parseState accepts an array because it is typeof object (documented quirk)", () => {
  assert.deepEqual(plain(Pomo.parseState("[1,2]")), [1, 2])
})

// ---------------------------------------------------------------- sleepGap

test("sleepGap: normal tick is not a sleep", () => {
  assert.equal(Pomo.sleepGap(1000, 1500, 500, 10000), 0)
})

test("sleepGap: exactly the threshold is not a sleep, one ms more is", () => {
  assert.equal(Pomo.sleepGap(1000, 11000, 500, 10000), 0)
  assert.equal(Pomo.sleepGap(1000, 11001, 500, 10000), 10001 - 500)
})

test("sleepGap: a long sleep returns the gap minus one normal tick", () => {
  assert.equal(Pomo.sleepGap(0 + 1000, 1000 + 3600000, 500, 10000), 3600000 - 500)
})

test("sleepGap: no previous tick, clock going backwards, bad input give 0", () => {
  assert.equal(Pomo.sleepGap(0, 99999, 500, 10000), 0)
  assert.equal(Pomo.sleepGap(5000, 4000, 500, 10000), 0)
  assert.equal(Pomo.sleepGap(5000, 5000, 500, 10000), 0)
  assert.equal(Pomo.sleepGap(undefined, 5000, 500, 10000), 0)
  assert.equal(Pomo.sleepGap(1000, NaN, 500, 10000), 0)
})
