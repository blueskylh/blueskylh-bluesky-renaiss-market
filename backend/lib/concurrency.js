// Controlled concurrency runner
async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  const errors = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchPromises = batch.map(async (item, index) => {
      try {
        const result = await worker(item);
        results[i + index] = result;
      } catch (e) {
        errors.push(e);
        results[i + index] = undefined;
      }
    });

    await Promise.all(batchPromises);
  }

  if (errors.length > 0) {
    const err = new Error(`${errors.length} of ${items.length} tasks failed`);
    err.errors = errors;
    console.error(err.message);
  }

  return results;
}

// Clamp concurrency to safe bounds
function clampConcurrency(value, defaultValue) {
  const num = typeof value === 'number' ? value : parseInt(String(value || defaultValue), 10);
  return Math.max(1, Math.min(10, num || defaultValue));
}

exports.runWithConcurrency = runWithConcurrency;
exports.clampConcurrency = clampConcurrency;
