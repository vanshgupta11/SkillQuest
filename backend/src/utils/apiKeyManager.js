/**
 * Utility for managing and rotating multiple API keys for external services (Gemini, YouTube, etc.)
 * Supports:
 * - Array of keys via GEMINI_API_KEYS (comma-separated or JSON string)
 * - Single fallback key via GEMINI_API_KEY
 * - Seamless automatic rotation to the next key when a quota limit / rate limit / error is encountered
 */

/**
 * Extract an array of cleaned API keys from plural or singular environment variables.
 * @param {string} envKeyPlural - e.g. 'GEMINI_API_KEYS'
 * @param {string} envKeySingle - e.g. 'GEMINI_API_KEY'
 * @returns {string[]}
 */
function getApiKeys(envKeyPlural, envKeySingle) {
  const raw = process.env[envKeyPlural] || process.env[envKeySingle] || '';
  if (!raw || typeof raw !== 'string') return [];

  const trimmed = raw.trim();

  // Support JSON array format, e.g. ["key1", "key2"]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((k) => String(k).trim()).filter(Boolean);
      }
    } catch (_) {}
  }

  // Support comma-separated format, e.g. key1,key2,key3
  return trimmed
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

class KeyRotator {
  constructor(serviceName, envKeyPlural, envKeySingle) {
    this.serviceName = serviceName;
    this.envKeyPlural = envKeyPlural;
    this.envKeySingle = envKeySingle;
    this.currentIndex = 0;
  }

  /**
   * Get all currently available keys from environment.
   * @returns {string[]}
   */
  getKeys() {
    return getApiKeys(this.envKeyPlural, this.envKeySingle);
  }

  /**
   * Check if at least one key is configured.
   * @returns {boolean}
   */
  hasKeys() {
    return this.getKeys().length > 0;
  }

  /**
   * Mask an API key for safe logging (e.g., "AIza...eyM").
   * @param {string} key
   * @returns {string}
   */
  maskKey(key) {
    if (!key || typeof key !== 'string') return '****';
    if (key.length <= 8) return '****';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }

  /**
   * Execute an async callback with automatic API key rotation on failure.
   * Cycles through all available keys one by one when rate limit/quota or errors occur.
   *
   * @param {Function} action - Async function (apiKey, index) => Promise<any>
   * @returns {Promise<any>}
   */
  async execute(action) {
    const keys = this.getKeys();
    if (keys.length === 0) {
      throw new Error(
        `${this.envKeySingle} is not set in environment variables. Please add ${this.envKeySingle} (or ${this.envKeyPlural}) to your .env file.`
      );
    }

    let lastError = null;
    const totalKeys = keys.length;

    for (let attempts = 0; attempts < totalKeys; attempts++) {
      const activeIndex = this.currentIndex % totalKeys;
      const currentKey = keys[activeIndex];
      const masked = this.maskKey(currentKey);

      try {
        const result = await action(currentKey, activeIndex);
        return result;
      } catch (err) {
        lastError = err;
        const errMsg = err?.message || String(err);

        console.warn(
          `[${this.serviceName}] Key #${activeIndex + 1}/${totalKeys} (${masked}) encountered limit/error: ${errMsg}`
        );

        // Advance index for subsequent requests
        this.currentIndex = (activeIndex + 1) % totalKeys;

        if (attempts < totalKeys - 1) {
          const nextIndex = this.currentIndex;
          const nextMasked = this.maskKey(keys[nextIndex]);
          console.log(
            `[${this.serviceName}] Rotating to Key #${nextIndex + 1}/${totalKeys} (${nextMasked}) and retrying...`
          );
        }
      }
    }

    console.error(`[${this.serviceName}] All ${totalKeys} configured API key(s) failed or hit quota limits.`);
    throw lastError;
  }
}

module.exports = { KeyRotator, getApiKeys };
