import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as classifier from '../lib/pull-to-close.ts';

test('a deliberate downward pull closes at the threshold with a resisted translation', () => {
  const start = classifier.beginPull({x: 100, y: 100}, {atTop: true})!;
  assert.equal(classifier.movePull(start, {x: 101, y: 105}, {atTop: true}).phase, 'pending');
  assert.equal(classifier.movePull(start, {x: 101, y: 98}, {atTop: true}).phase, 'pending');
  const pulling = classifier.movePull(start, {x: 102, y: 184}, {atTop: true});
  assert.equal(pulling.phase, 'pulling'); assert.equal(classifier.shouldClosePull(pulling), true);
  assert.equal(classifier.pullTranslation(pulling), 63);
  assert.equal(classifier.pullTranslation(classifier.movePull(start, {x: 100, y: 1000}, {atTop: true})), 140);
});

test('short pulls, upward reversals, non-top starts, multitouch and ineligible controls cannot close', () => {
  assert.equal(classifier.beginPull({x: 0, y: 0}, {atTop: false}), null);
  assert.equal(classifier.beginPull({x: 0, y: 0}, {atTop: true, eligible: false}), null);
  assert.equal(classifier.beginPull({x: 0, y: 0}, {atTop: true, touches: 2}), null);
  const start = classifier.beginPull({x: 0, y: 100}, {atTop: true})!;
  const long = classifier.movePull(start, {x: 0, y: 220}, {atTop: true});
  const short = classifier.movePull(long, {x: 0, y: 130}, {atTop: true});
  assert.equal(classifier.shouldClosePull(short), false);
  for (const cancelled of [classifier.movePull(long, {x: 0, y: 90}, {atTop: true}), classifier.movePull(long, {x: 0, y: 220}, {atTop: false}), classifier.movePull(long, {x: 0, y: 220}, {atTop: true, touches: 2})]) {
    assert.equal(classifier.shouldClosePull(cancelled), false); assert.equal(classifier.pullTranslation(cancelled), 0);
  }
});

test('horizontal chart intent stays native even after the finger turns downward', () => {
  const start = classifier.beginPull({x: 0, y: 0}, {atTop: true})!;
  const horizontal = classifier.movePull(start, {x: 40, y: 10}, {atTop: true});
  assert.equal(horizontal.phase, 'cancelled');
  assert.equal(classifier.movePull(horizontal, {x: 40, y: 200}, {atTop: true}).phase, 'cancelled');
});

// Run the real hook's event adapter with minimal hook/DOM bindings; no browser,
// timers, CSS or implementation copy is needed to test event ownership/cleanup.
const hookSource = readFileSync(new URL('../components/use-pull-to-close.ts', import.meta.url), 'utf8');
const hookCode = ts.transpileModule(hookSource, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
function hookHarness({enabled = true, kind = 'body', scrollTop = 0, dialog = false}: {enabled?: boolean; kind?: string; scrollTop?: number; dialog?: boolean} = {}) {
  const listeners = new Map<string, {callback: (event: any) => void; options: any}>(), cleanups: (() => void)[] = [], states: any[] = [], removed: string[] = [];
  let closed = 0;
  class FakeNode {parentElement: FakeElement | null = null;}
  class FakeElement extends FakeNode {
    tagName = kind === 'chart' ? 'rect' : ['handle', 'header', 'button'].includes(kind) ? 'button' : kind === 'input' ? 'input' : 'div';
    scrollTop = 0;
    contains(element: unknown) {return element === target;}
    matches(selector: string) {return selector.split(',').some(value => value.trim() === '.sheet-handle' && kind === 'handle' || value.trim() === '.location-title' && kind === 'header');}
    getAttribute(name: string) {return name === 'role' && kind === 'chart' ? 'button' : null;}
    closest(selector: string): FakeElement | null {
      if (selector === '.forecast-chart') return kind === 'chart' ? this : null;
      if (selector === '[data-pull-ignore]') return kind === 'ignored' ? this : null;
      if (selector.includes('input')) return ['button', 'input', 'handle', 'header', 'chart'].includes(kind) ? this : null;
      return null;
    }
  }
  const root = new FakeElement(), target = new FakeElement(); target.parentElement = root;
  const document = {scrollingElement: {scrollTop}, querySelector: () => dialog ? {} : null,
    addEventListener: (name: string, callback: (event: any) => void, options: unknown) => listeners.set(name, {callback, options}),
    removeEventListener: (name: string, callback: unknown) => {if (listeners.get(name)?.callback === callback) {listeners.delete(name); removed.push(name);}},
  };
  const context = {exports: {} as {usePullToClose?: (options: any) => unknown}, document, window: {scrollY: scrollTop}, Element: FakeElement, Node: FakeNode,
    setTimeout: () => 1, clearTimeout: () => {},
    require: (name: string) => name === 'react' ? {
      useEffect: (effect: () => void | (() => void)) => {const cleanup = effect(); if (cleanup) cleanups.push(cleanup);},
      useRef: (value: unknown) => ({current: value}),
      useState: (value: unknown) => {const index = states.push(value) - 1; return [value, (next: unknown) => {states[index] = next;}];},
    } : classifier,
  };
  vm.runInNewContext(hookCode, context);
  context.exports.usePullToClose!({enabled, onClose: () => closed++, rootRef: {current: root}});
  const send = (name: string, x: number, y: number, options: {touches?: number; cancelable?: boolean} = {}) => {
    const touch = {identifier: 1, clientX: x, clientY: y};
    const event = {target, touches: name === 'touchend' ? [] : Array.from({length: options.touches ?? 1}, () => touch), changedTouches: [touch], cancelable: options.cancelable !== false, prevented: false, preventDefault() {this.prevented = true;}};
    listeners.get(name)?.callback(event);return event;
  };
  return {listeners, states, removed, document, context, send, get closed() {return closed;}, cleanup: () => cleanups.forEach(cleanup => cleanup())};
}

test('hook claims a vertical move non-passively and prevents its release click after closing', () => {
  const hook = hookHarness({kind: 'handle'});
  assert.equal(hook.listeners.get('touchmove')?.options.passive, false);
  hook.send('touchstart', 100, 100);
  assert.equal(hook.send('touchmove', 102, 200).prevented, true);
  assert.equal(hook.states[0], 75); assert.equal(hook.states[1], true);
  hook.send('touchend', 102, 200);
  assert.equal(hook.closed, 1); assert.equal(hook.states[0], 0); assert.equal(hook.states[1], false);
  hook.cleanup();
  assert.equal(hook.listeners.has('touchmove'), false);
  const click = {detail: 1, clientX: 102, clientY: 200, prevented: false, stopped: false, preventDefault() {this.prevented = true;}, stopImmediatePropagation() {this.stopped = true;}};
  hook.listeners.get('click')!.callback(click);
  assert.equal(click.prevented, true); assert.equal(click.stopped, true); assert.equal(hook.listeners.has('click'), false);
});

test('hook excludes controls/dialogs and cannot close when scrolling or disabled', () => {
  for (const options of [{kind: 'button'}, {kind: 'input'}, {kind: 'ignored'}, {dialog: true}, {scrollTop: 100}, {enabled: false}]) {
    const hook = hookHarness(options);hook.send('touchstart', 0, 0);
    assert.equal(hook.send('touchmove', 0, 150).prevented, false);
    hook.send('touchend', 0, 150);assert.equal(hook.closed, 0);assert.equal(hook.states[0], 0);
    hook.cleanup();
  }
});

test('chart horizontal scrolling, cancelled/short pulls and uncancellable native scroll never close', () => {
  const horizontal = hookHarness({kind: 'chart'});horizontal.send('touchstart', 0, 0);
  assert.equal(horizontal.send('touchmove', 100, 10).prevented, false);
  horizontal.send('touchend', 100, 150);assert.equal(horizontal.closed, 0);
  const short = hookHarness({kind: 'handle'});short.send('touchstart', 0, 0);short.send('touchmove', 0, 30);short.send('touchend', 0, 30);
  assert.equal(short.closed, 0);assert.equal(short.states[0], 0);assert.equal(short.listeners.has('click'), true);
  const cancelled = hookHarness();cancelled.send('touchstart', 0, 0);cancelled.send('touchmove', 0, 120);cancelled.send('touchcancel', 0, 120);cancelled.send('touchend', 0, 120);
  assert.equal(cancelled.closed, 0);assert.equal(cancelled.states[0], 0);
  const native = hookHarness();native.send('touchstart', 0, 0);native.send('touchmove', 0, 120, {cancelable: false});native.send('touchend', 0, 120);
  assert.equal(native.closed, 0);assert.equal(native.states[0], 0);
  for (const hook of [horizontal, short, cancelled, native]) hook.cleanup();
});

test('a chart can close vertically at the top, but a document scroll change cancels ownership', () => {
  const chart = hookHarness({kind: 'chart'});chart.send('touchstart', 0, 0);
  assert.equal(chart.send('touchmove', 3, 120).prevented, true);chart.send('touchend', 3, 120);assert.equal(chart.closed, 1);
  const scroll = hookHarness();scroll.send('touchstart', 0, 0);scroll.send('touchmove', 0, 120);scroll.document.scrollingElement.scrollTop = 10;
  scroll.send('touchend', 0, 120);assert.equal(scroll.closed, 0);assert.equal(scroll.states[0], 0);
  chart.cleanup();scroll.cleanup();
});

test('repeated short pulls replace their click guard instead of stacking stale listeners', () => {
  const hook = hookHarness({kind: 'handle'});
  for (let index = 0; index < 2; index++) {hook.send('touchstart', 0, 0);hook.send('touchmove', 0, 30);hook.send('touchend', 0, 30);}
  assert.equal(hook.closed, 0);
  assert.equal(hook.removed.filter(name => name === 'click').length, 1);
  const keyboardClick = {detail: 0, clientX: 0, clientY: 30, preventDefault() {throw new Error('Keyboard fallback was blocked');}, stopImmediatePropagation() {}};
  hook.listeners.get('click')!.callback(keyboardClick);
  assert.equal(hook.listeners.has('click'), true);
  hook.cleanup();
});

test('the first small downward move is reserved before visual intent, while horizontal/up moves stay native', () => {
  const down = hookHarness({kind: 'chart'});down.send('touchstart', 100, 100);
  assert.equal(down.send('touchmove', 101, 103).prevented, true);
  assert.equal(down.states[0], 0);assert.equal(down.states[1], false);
  assert.equal(down.send('touchmove', 102, 200).prevented, true);
  down.send('touchend', 102, 200);assert.equal(down.closed, 1);
  const horizontal = hookHarness({kind: 'chart'});horizontal.send('touchstart', 100, 100);
  assert.equal(horizontal.send('touchmove', 103, 101).prevented, false);
  assert.equal(horizontal.send('touchmove', 200, 102).prevented, false);
  horizontal.send('touchend', 200, 102);assert.equal(horizontal.closed, 0);
  const up = hookHarness();up.send('touchstart', 100, 100);
  assert.equal(up.send('touchmove', 100, 97).prevented, false);
  assert.equal(up.send('touchmove', 100, 0).prevented, false);
  up.send('touchend', 100, 0);assert.equal(up.closed, 0);
  for (const hook of [down, horizontal, up]) hook.cleanup();
});

test('header taps remain native, header drags close, and a gesture starting scrolled never acquires later', () => {
  const tap = hookHarness({kind: 'header'});tap.send('touchstart', 100, 100);tap.send('touchend', 100, 100);
  assert.equal(tap.closed, 0);assert.equal(tap.listeners.has('click'), false);
  const pull = hookHarness({kind: 'header'});pull.send('touchstart', 100, 100);
  assert.equal(pull.send('touchmove', 100, 104).prevented, true);
  pull.send('touchmove', 100, 200);pull.send('touchend', 100, 200);
  assert.equal(pull.closed, 1);assert.equal(pull.listeners.has('click'), true);
  const scrolled = hookHarness({scrollTop: 100});scrolled.send('touchstart', 100, 100);
  scrolled.document.scrollingElement.scrollTop = 0;scrolled.context.window.scrollY = 0;
  assert.equal(scrolled.send('touchmove', 100, 104).prevented, false);
  scrolled.send('touchmove', 100, 220);scrolled.send('touchend', 100, 220);assert.equal(scrolled.closed, 0);
  for (const hook of [tap, pull, scrolled]) hook.cleanup();
});
