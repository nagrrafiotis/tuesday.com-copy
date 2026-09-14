// Global undo history for data actions (create/update/delete) across entities.
const MAX = 5;
let stack = [];
const listeners = new Set();
const afterUndoListeners = new Set();
let suspended = false;

function notify() {
  listeners.forEach((l) => l(stack.length));
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(stack.length);
  return () => listeners.delete(listener);
}

export function getSize() {
  return stack.length;
}

export function peek() {
  return stack[stack.length - 1];
}

export function push(action) {
  stack.push(action);
  if (stack.length > MAX) stack = stack.slice(-MAX);
  notify();
}

export function isSuspended() {
  return suspended;
}

export function runSuspended(fn) {
  const prev = suspended;
  suspended = true;
  try {
    return fn();
  } finally {
    suspended = prev;
  }
}

export async function undo() {
  const action = stack.pop();
  notify();
  if (!action) return;
  try {
    await runSuspended(() => action.undo());
  } catch (e) {
    console.warn("undo failed", e);
  }
  afterUndoListeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

export function onAfterUndo(listener) {
  afterUndoListeners.add(listener);
  return () => afterUndoListeners.delete(listener);
}

export function clear() {
  stack = [];
  notify();
}