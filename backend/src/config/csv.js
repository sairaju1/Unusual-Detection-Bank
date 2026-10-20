const { parse } = require('csv-parse/sync');

const REQUIRED = ['transaction_id', 'date', 'description', 'amount', 'type'];

// Returns { rows, errors }. Rows are normalized; errors are capped at 20 for display.
function parseStatement(buffer) {
  let records;
  try {
    records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (e) {
    return { rows: [], errors: [`CSV could not be parsed: ${e.message}`] };
  }
  if (records.length === 0) return { rows: [], errors: ['The file has no transaction rows.'] };

  const headers = Object.keys(records[0]);
  const missing = REQUIRED.filter((h) => !headers.includes(h));
  if (missing.length) return { rows: [], errors: [`Missing required columns: ${missing.join(', ')}`] };

  const errors = [];
  const rows = [];
  records.forEach((r, i) => {
    const line = i + 2;
    const amount = Number(r.amount);
    const date = new Date(r.date);
    const type = String(r.type).toLowerCase();
    if (!r.transaction_id) errors.push(`Row ${line}: transaction_id is empty`);
    if (!Number.isFinite(amount)) errors.push(`Row ${line}: amount "${r.amount}" is not a number`);
    if (Number.isNaN(date.getTime())) errors.push(`Row ${line}: date "${r.date}" is not valid`);
    if (!['debit', 'credit'].includes(type)) errors.push(`Row ${line}: type must be debit or credit`);
    rows.push({
      transactionId: String(r.transaction_id),
      date,
      description: r.description || '',
      amount,
      type,
    });
  });
  return { rows, errors: errors.slice(0, 20), totalErrors: errors.length };
}

module.exports = { parseStatement, REQUIRED };
