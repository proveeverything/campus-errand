import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, creditFor, loadState, profiles, publishTask, rateTask, STORAGE_KEY, switchUser, transition } from '../src/model.ts';
import type { AppState, Task } from '../src/model.ts';

const now = 1_800_000_000_000;
const demoId = 'demo-express';

function delivered(): AppState {
  return transition(transition(createInitialState(now), demoId, 'accept', now), demoId, 'deliver', now + 1000);
}

function completed(): AppState {
  return transition(switchUser(delivered(), 'zhou'), demoId, 'confirm', now + 2000);
}

function draft(): Omit<Task, 'id' | 'ownerId' | 'runnerId' | 'status' | 'createdAt' | 'deliveredAt' | 'completedAt' | 'rating' | 'review'> {
  return { title: '帮我取一本参考书', category: '快递代取', from: '东门驿站', to: '图书馆', region: '东校区', reward: 0, deadline: now + 60_000, description: '一本参考书，请在门口交接。', weight: '一本书', contactNote: '' };
}

test('initial state offers eight open tasks including the stable demo and both role owners', () => {
  const state = createInitialState(now);
  assert.equal(state.currentUserId, 'lin');
  assert.equal(state.tasks.length, 8);
  assert.equal(state.ledger.length, 0);
  assert.ok(state.tasks.every(task => task.status === 'open' && task.deadline > now));
  assert.ok(state.tasks.some(task => task.ownerId === 'lin'));
  assert.ok(state.tasks.some(task => task.ownerId === 'zhou'));
  const task = state.tasks.find(task => task.id === demoId)!;
  assert.equal(task.title, '帮取一件小快递，送到三号宿舍');
  assert.equal(task.ownerId, 'zhou');
  assert.equal(task.deadline, now + 90 * 60_000);
});

test('runner delivery and owner confirmation award credit only at confirmation without mutating the prior state', () => {
  const initial = createInitialState(now);
  const snapshot = JSON.stringify(initial);
  const active = transition(initial, demoId, 'accept', now);
  assert.equal(JSON.stringify(initial), snapshot);
  assert.equal(active.tasks.find(task => task.id === demoId)?.runnerId, 'lin');
  const arrived = transition(active, demoId, 'deliver', now + 1000);
  assert.equal(arrived.ledger.length, 0);
  const owner = switchUser(arrived, 'zhou');
  const done = transition(owner, demoId, 'confirm', now + 2000);
  assert.equal(done.tasks.find(task => task.id === demoId)?.status, 'completed');
  assert.equal(done.tasks.find(task => task.id === demoId)?.completedAt, now + 2000);
  assert.equal(creditFor(done, 'lin'), profiles.find(profile => profile.id === 'lin')!.baseCredit + 2);
  assert.equal(done.ledger[0].userId, 'lin');
  assert.throws(() => transition(done, demoId, 'confirm', now + 3000), /等待接单者/);
  assert.equal(done.ledger.length, 1);
});

test('ownership, runner permissions and the sequential status flow are enforced', () => {
  const initial = createInitialState(now);
  assert.throws(() => transition(switchUser(initial, 'zhou'), demoId, 'accept', now), /不能接自己/);
  assert.throws(() => transition(initial, demoId, 'deliver', now), /只有接单者/);
  assert.throws(() => transition(switchUser(initial, 'zhou'), demoId, 'confirm', now), /等待接单者/);
  const active = transition(initial, demoId, 'accept', now);
  assert.throws(() => transition(active, demoId, 'accept', now), /不可接单/);
  assert.throws(() => transition(switchUser(active, 'chen'), demoId, 'deliver', now), /只有接单者/);
  assert.throws(() => transition(delivered(), demoId, 'confirm', now), /只有发布者/);
});

test('expired tasks reject acceptance at the exact deadline', () => {
  const initial = createInitialState(now);
  const deadline = initial.tasks.find(task => task.id === demoId)!.deadline;
  assert.throws(() => transition(initial, demoId, 'accept', deadline), /截止时间/);
  assert.equal(transition(initial, demoId, 'accept', deadline - 1).tasks.find(task => task.id === demoId)?.status, 'active');
});

test('only the owner can cancel an open task, and cancelled or active tasks cannot be cancelled again', () => {
  const initial = createInitialState(now);
  assert.throws(() => transition(initial, demoId, 'cancel', now), /只有发布者/);
  const cancelled = transition(switchUser(initial, 'zhou'), demoId, 'cancel', now);
  assert.equal(cancelled.tasks.find(task => task.id === demoId)?.status, 'cancelled');
  assert.throws(() => transition(switchUser(cancelled, 'lin'), demoId, 'accept', now), /不可接单/);
  assert.throws(() => transition(cancelled, demoId, 'cancel', now), /只有待接单/);
  assert.throws(() => transition(switchUser(transition(initial, demoId, 'accept', now), 'zhou'), demoId, 'cancel', now), /只有待接单/);
});

test('a positive review adds one point once and preserves the completed status', () => {
  const done = completed();
  const rated = rateTask(done, demoId, 4, '  准时送到，谢谢！  ', now + 3000);
  assert.equal(rated.tasks.find(task => task.id === demoId)?.review, '准时送到，谢谢！');
  assert.equal(rated.tasks.find(task => task.id === demoId)?.status, 'completed');
  assert.equal(creditFor(rated, 'lin'), creditFor(done, 'lin') + 1);
  assert.equal(done.tasks.find(task => task.id === demoId)?.rating, undefined);
  assert.throws(() => rateTask(rated, demoId, 5, '', now), /已经评价/);
  assert.equal(rated.ledger.length, 2);
});

test('one to three stars record feedback without adding good-review points', () => {
  const done = completed();
  const rated = rateTask(done, demoId, 3, '', now);
  assert.equal(rated.tasks.find(task => task.id === demoId)?.rating, 3);
  assert.equal(creditFor(rated, 'lin'), creditFor(done, 'lin'));
  assert.equal(rated.ledger.length, 1);
});

test('reviews require the owner, a completed task and an integer star rating', () => {
  assert.throws(() => rateTask(switchUser(delivered(), 'zhou'), demoId, 5, '', now), /确认完成后/);
  assert.throws(() => rateTask(switchUser(completed(), 'lin'), demoId, 5, '', now), /只有发布者/);
  for (const rating of [0, 6, 2.5, NaN]) assert.throws(() => rateTask(completed(), demoId, rating, '', now), /1到5星/);
  assert.throws(() => rateTask(completed(), demoId, 5, '字'.repeat(201), now), /200字/);
});

test('publishing accepts free help, trims text, owns the new task and leaves existing state untouched', () => {
  const initial = createInitialState(now);
  const published = publishTask(initial, { ...draft(), title: '  帮我取一本参考书  ' }, now);
  assert.equal(published.tasks.length, 9);
  assert.equal(initial.tasks.length, 8);
  assert.equal(published.tasks[0].title, '帮我取一本参考书');
  assert.equal(published.tasks[0].reward, 0);
  assert.equal(published.tasks[0].ownerId, 'lin');
  assert.equal(published.tasks[0].status, 'open');
  assert.equal(published.tasks[0].runnerId, undefined);
  assert.equal(published.ledger.length, 0);
});

test('publishing rejects invalid amounts, past deadlines, repeated places and missing required text', () => {
  const initial = createInitialState(now);
  for (const reward of [-1, 100.01, NaN, Infinity, 1.234]) assert.throws(() => publishTask(initial, { ...draft(), reward }, now), /报酬/);
  assert.throws(() => publishTask(initial, { ...draft(), deadline: now }, now), /截止时间/);
  assert.throws(() => publishTask(initial, { ...draft(), to: '东门驿站' }, now), /不能相同/);
  assert.throws(() => publishTask(initial, { ...draft(), from: ' ' }, now), /地点/);
  assert.throws(() => publishTask(initial, { ...draft(), title: '短' }, now), /标题/);
  assert.throws(() => publishTask(initial, { ...draft(), description: ' ' }, now), /任务说明/);
  assert.throws(() => publishTask(initial, { ...draft(), weight: '' }, now), /重量说明/);
});

test('unknown tasks and unknown demo identities return Chinese errors', () => {
  const initial = createInitialState(now);
  assert.throws(() => transition(initial, 'missing', 'accept', now), /任务不存在/);
  assert.throws(() => switchUser(initial, 'missing'), /身份不存在/);
  assert.equal(switchUser(initial, 'zhou').currentUserId, 'zhou');
  assert.equal(initial.currentUserId, 'lin');
});

function withStorage(value: string | null, run: () => void): void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => { assert.equal(key, STORAGE_KEY); return value; } } });
  try { run(); } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

test('loadState restores the exact valid completed and reviewed state', () => {
  const state = rateTask(completed(), demoId, 5, '谢谢', now + 3000);
  withStorage(JSON.stringify(state), () => assert.deepEqual(loadState(), state));
});

test('loadState safely resets broken JSON, wrong versions, invalid profiles and malformed task/ledger data', () => {
  const initial = createInitialState(now);
  const cases = [
    null, '{broken', 'null', JSON.stringify({ ...initial, version: 2 }),
    JSON.stringify({ ...initial, currentUserId: 'missing' }),
    JSON.stringify({ ...initial, tasks: [null] }),
    JSON.stringify({ ...initial, tasks: [{ ...initial.tasks[0], status: 'completed' }] }),
    JSON.stringify({ ...initial, ledger: [{ id: 'bad', userId: 'lin', points: '2' }] }),
    JSON.stringify({ ...initial, tasks: [initial.tasks[0], initial.tasks[0]] }),
  ];
  for (const value of cases) withStorage(value, () => {
    const loaded = loadState();
    assert.equal(loaded.currentUserId, 'lin');
    assert.equal(loaded.tasks.length, 8);
    assert.equal(loaded.tasks[0].status, 'open');
    assert.equal(loaded.ledger.length, 0);
  });
});

test('loadState remains safe when browser storage is unavailable or throws', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Reflect.deleteProperty(globalThis, 'localStorage');
    assert.equal(loadState().tasks.length, 8);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
    assert.equal(loadState().tasks.length, 8);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
