/**
 * Rupiah amounts as people type them in invoice forms.
 *
 *   13k, 13K, 13rb   -> 13000
 *   10.5k, 10,5k     -> 10500
 *   10.000, 1.250.000, 10,000 -> thousands separators -> 10000 / 1250000
 *   15000            -> 15000
 *
 * Anything else (10.5 with no suffix, 1.2.3) is rejected rather than guessed,
 * because a wrong guess lands on someone's bill.
 */
function parseAmount(raw) {
  const s = String(raw || '').toLowerCase().replace(/\s+/g, '').replace(/^rp\.?/, '');
  const m = /^(\d[\d.,]*)(k|rb|ribu)?$/.exec(s);
  if (!m) return null;
  const [, num, suffix] = m;

  let value;
  if (suffix) {
    // 10.5k / 10,5k: one decimal mark allowed.
    if (!/^\d+([.,]\d+)?$/.test(num)) return null;
    value = parseFloat(num.replace(',', '.')) * 1000;
  } else if (/[.,]/.test(num)) {
    // Only proper thousands grouping: 10.000, 1.250.000, 10,000.
    if (!/^\d{1,3}([.,]\d{3})+$/.test(num)) return null;
    value = Number(num.replace(/[.,]/g, ''));
  } else {
    value = Number(num);
  }

  value = Math.round(value);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Split one form line into name, amount and notes.
 * "Eric 11k sambel pisah" -> { name: 'Eric', userId: null, amount: 11000, notes: 'sambel pisah' }
 */
function parsePersonLine(line) {
  const m = /^(<@!?(\d+)>|[\w\d.]+)\s+(\d[\d.,]*\s*(?:k|rb|ribu)?)(?=\s|$)\s*(.*)$/i.exec(String(line || '').trim());
  if (!m) return null;
  const amount = parseAmount(m[3]);
  if (!amount) return null;
  return { name: m[1], userId: m[2] || null, amount, notes: (m[4] || '').trim() };
}

/**
 * Same person on several lines (Eric 11k ... Eric 5k) becomes one entry with
 * the amounts added up and the notes kept. Matched by Discord id when
 * mentioned, otherwise by name ignoring case. First occurrence keeps its place.
 */
function mergeSamePerson(entries) {
  const byKey = new Map();
  const merged = [];
  for (const e of entries) {
    const key = e.userId ? `id:${e.userId}` : `name:${String(e.name).toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing) {
      const copy = { ...e, count: 1 };
      byKey.set(key, copy);
      merged.push(copy);
      continue;
    }
    existing.amount += e.amount;
    existing.count += 1;
    if (e.notes) existing.notes = existing.notes ? `${existing.notes}; ${e.notes}` : e.notes;
  }
  return merged;
}

module.exports = { parseAmount, parsePersonLine, mergeSamePerson };
