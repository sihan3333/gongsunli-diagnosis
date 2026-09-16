// Store only the current task and the player quotes supporting it.
// Inject Storage so the same code works in the browser and in offline tests.
export const TRAINING_STORAGE_KEY = 'hero-breakthrough.current-training.v1';

const MAX_STORED_LENGTH = 65_536;
const MAX_EVIDENCE = 64;
const RESULT_LIMITS = { title: 200, reason: 3_000, action: 3_000, measure: 3_000 };

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isText(value, limit, allowEmpty = false) {
  return typeof value === 'string' && value.length <= limit && (allowEmpty || value.trim().length > 0);
}

function projectDiagnosis(diagnosis) {
  if (!isObject(diagnosis) || !['training', 'collect'].includes(diagnosis.status) || !isObject(diagnosis.result)) return null;
  const result = {};
  for (const [field, limit] of Object.entries(RESULT_LIMITS)) {
    const value = diagnosis.result[field];
    // Reject long text rather than truncating a condition or a negation.
    if (!isText(value, limit)) return null;
    result[field] = value;
  }
  if (!Array.isArray(diagnosis.evidence) || diagnosis.evidence.length > MAX_EVIDENCE) return null;
  const evidence = [];
  for (const item of diagnosis.evidence) {
    if (!isObject(item) || !isText(item.label, 160) || !isText(item.quote, 600)) return null;
    evidence.push({ label: item.label, quote: item.quote });
  }
  return { status: diagnosis.status, result, evidence };
}

function projectTask(task) {
  if (!isObject(task) || task.version !== 1 || !isText(task.id, 120) || !['live', 'demo'].includes(task.source) || !isText(task.caseTitle, 200, true)) return null;
  if (typeof task.createdAt !== 'string' || task.createdAt.length > 30) return null;
  const date = new Date(task.createdAt);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== task.createdAt) return null;
  const diagnosis = projectDiagnosis(task);
  if (!diagnosis) return null;
  return {
    version: 1,
    id: task.id,
    createdAt: task.createdAt,
    source: task.source,
    caseTitle: task.caseTitle,
    ...diagnosis,
  };
}

/** Returns a new task, or null for an unfinished, malformed or oversized result. */
export function createTrainingTask(diagnosis, { source = 'live', caseTitle = '', now = Date.now() } = {}) {
  try {
    if (!Number.isFinite(now) || !['live', 'demo'].includes(source) || !isText(caseTitle, 200, true)) return null;
    const projected = projectDiagnosis(diagnosis);
    if (!projected) return null;
    const task = {
      version: 1,
      id: globalThis.crypto?.randomUUID?.() ?? `task-${now.toString(36)}-${Math.random().toString(36).slice(2).padEnd(12, '0')}`,
      createdAt: new Date(now).toISOString(),
      source,
      caseTitle,
      ...projected,
    };
    return JSON.stringify(task).length <= MAX_STORED_LENGTH ? task : null;
  } catch {
    return null;
  }
}

export function loadTrainingTask(storage) {
  let raw;
  try {
    // Property access belongs inside try: browsers can deny Storage methods.
    raw = storage.getItem(TRAINING_STORAGE_KEY);
  } catch {
    return { task: null, error: 'unavailable' };
  }
  if (raw === null) return { task: null, error: null };
  if (typeof raw !== 'string' || raw.length > MAX_STORED_LENGTH) return { task: null, error: 'invalid' };
  try {
    const task = projectTask(JSON.parse(raw));
    return { task, error: task ? null : 'invalid' };
  } catch {
    return { task: null, error: 'invalid' };
  }
}

export function saveTrainingTask(storage, task) {
  let serialized;
  try {
    const projected = projectTask(task);
    if (!projected) return { ok: false, error: 'invalid' };
    serialized = JSON.stringify(projected);
    if (serialized.length > MAX_STORED_LENGTH) return { ok: false, error: 'invalid' };
  } catch {
    return { ok: false, error: 'invalid' };
  }
  try {
    // A single setItem is atomic in Web Storage; never delete the old task first.
    storage.setItem(TRAINING_STORAGE_KEY, serialized);
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

export function clearTrainingTask(storage) {
  try {
    storage.removeItem(TRAINING_STORAGE_KEY);
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}
