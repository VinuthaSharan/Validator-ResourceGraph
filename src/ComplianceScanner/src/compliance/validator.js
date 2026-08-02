/**
 * @param {Record<string, unknown>} obj
 * @param {string} dotPath
 * @returns {unknown}
 */
function getByPath(obj, dotPath) {
  let current = obj;
  for (const part of dotPath.split(".")) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = /** @type {Record<string, unknown>} */ (current)[part];
  }
  return current;
}

/**
 * @param {Record<string, unknown>} resource
 * @param {Record<string, unknown>} check
 * @returns {[boolean, string]}
 */
function evaluateCheck(resource, check) {
  const path = /** @type {string} */ (check.path);
  const operator = /** @type {string} */ (check.operator ?? "equals");
  const expected = check.expected;

  if (operator === "exists") {
    const value = getByPath(resource, path);
    const ok = value !== undefined && value !== null && value !== "";
    return [ok, ok ? `${path} present` : `${path} missing`];
  }

  const value = getByPath(resource, path);
  if (operator === "equals") {
    const ok = value === expected;
    return [ok, `${path}=${JSON.stringify(value)}, expected=${JSON.stringify(expected)}`];
  }
  if (operator === "not_equals") {
    const ok = value !== expected;
    return [ok, `${path}=${JSON.stringify(value)}, must not equal ${JSON.stringify(expected)}`];
  }
  if (operator === "in") {
    const ok = Array.isArray(expected) && expected.includes(value);
    return [ok, `${path}=${JSON.stringify(value)}, expected one of ${JSON.stringify(expected)}`];
  }
  return [false, `Unknown operator: ${operator}`];
}

/**
 * @param {Record<string, unknown>} resource
 * @param {object[]} checks
 * @returns {[boolean, string[]]}
 */
function validateResource(resource, checks) {
  const messages = [];
  let compliant = true;
  for (const check of checks) {
    const [ok, msg] = evaluateCheck(resource, check);
    if (!ok) {
      compliant = false;
    }
    messages.push(msg);
  }
  return [compliant, messages];
}

module.exports = { validateResource, getByPath };
