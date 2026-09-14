// Wraps base44.entities mutating operations to record undoable actions.
import * as undoHistory from "@/lib/undoHistory";

const MUTATING = new Set([
  "create",
  "bulkCreate",
  "update",
  "delete",
  "deleteMany",
  "bulkUpdate",
  "updateMany",
]);

const BUILTINS = new Set(["id", "created_date", "updated_date", "created_by_id"]);

function withoutBuiltins(r) {
  if (!r || typeof r !== "object") return r;
  const o = {};
  for (const k of Object.keys(r)) if (!BUILTINS.has(k)) o[k] = r[k];
  return o;
}

function withId(r) {
  if (!r || typeof r !== "object") return r;
  return { id: r.id, ...withoutBuiltins(r) };
}

function wrapEntity(entities, name, entity) {
  return new Proxy(entity, {
    get(target, prop) {
      const orig = target[prop];
      if (typeof orig !== "function" || !MUTATING.has(prop)) return orig;
      return function (...args) {
        if (undoHistory.isSuspended()) return orig.apply(target, args);
        return runWithUndo(entity, name, prop, orig, args, target);
      };
    },
  });
}

async function runWithUndo(entity, name, op, orig, args, thisArg) {
  switch (op) {
    case "create": {
      const res = await orig.apply(thisArg, args);
      undoHistory.push({
        label: `Δημιουργία ${name}`,
        undo: async () => {
          try {
            await entity.delete(res.id);
          } catch {}
        },
      });
      return res;
    }
    case "bulkCreate": {
      const res = await orig.apply(thisArg, args);
      const ids = (res || []).map((r) => r?.id).filter(Boolean);
      undoHistory.push({
        label: `Δημιουργία ${name} (${ids.length})`,
        undo: async () => {
          for (const id of ids) {
            try {
              await entity.delete(id);
            } catch {}
          }
        },
      });
      return res;
    }
    case "update": {
      const [id] = args;
      let prev = null;
      try {
        prev = await entity.get(id);
      } catch {}
      const res = await orig.apply(thisArg, args);
      if (prev)
        undoHistory.push({
          label: `Επεξεργασία ${name}`,
          undo: async () => {
            try {
              await entity.update(id, withoutBuiltins(prev));
            } catch {}
          },
        });
      return res;
    }
    case "delete": {
      const [id] = args;
      let prev = null;
      try {
        prev = await entity.get(id);
      } catch {}
      await orig.apply(thisArg, args);
      if (prev)
        undoHistory.push({
          label: `Διαγραφή ${name}`,
          undo: async () => {
            try {
              await entity.create(withoutBuiltins(prev));
            } catch {}
          },
        });
      return;
    }
    case "deleteMany": {
      const [query] = args;
      let prev = [];
      try {
        prev = await entity.filter(query);
      } catch {}
      await orig.apply(thisArg, args);
      undoHistory.push({
        label: `Διαγραφή ${name} (${prev.length})`,
        undo: async () => {
          try {
            await entity.bulkCreate(prev.map(withoutBuiltins));
          } catch {}
        },
      });
      return;
    }
    case "bulkUpdate": {
      const [records] = args;
      const ids = (records || []).map((r) => r?.id).filter(Boolean);
      let prev = [];
      try {
        prev = ids.length ? await entity.filter({ id: { $in: ids } }) : [];
      } catch {}
      const res = await orig.apply(thisArg, args);
      undoHistory.push({
        label: `Επεξεργασία ${name} (${prev.length})`,
        undo: async () => {
          try {
            await entity.bulkUpdate(prev.map(withId));
          } catch {}
        },
      });
      return res;
    }
    case "updateMany": {
      const [query] = args;
      let prev = [];
      try {
        prev = await entity.filter(query);
      } catch {}
      const res = await orig.apply(thisArg, args);
      undoHistory.push({
        label: `Επεξεργασία ${name} (${prev.length})`,
        undo: async () => {
          try {
            await entity.bulkUpdate(prev.map(withId));
          } catch {}
        },
      });
      return res;
    }
    default:
      return await orig.apply(thisArg, args);
  }
}

export function attachUndo(base) {
  const original = base?.entities;
  if (!original) return;
  const cache = new Map();
  const proxy = new Proxy(original, {
    get(target, name) {
      if (cache.has(name)) return cache.get(name);
      const entity = target[name];
      if (!entity || typeof entity !== "object") return entity;
      const w = wrapEntity(original, name, entity);
      cache.set(name, w);
      return w;
    },
  });
  try {
    Object.defineProperty(base, "entities", {
      value: proxy,
      configurable: true,
      writable: true,
    });
  } catch (e) {
    console.warn("Could not attach undo to base44.entities", e);
  }
}