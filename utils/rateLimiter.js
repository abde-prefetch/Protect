const TIME_WINDOW_MS = 30 * 1000; // 30 seconds
const MAX_ACTIONS = 5;

// Map to track moderation actions. Key: executorId, Value: Array of timestamps
const modActions = new Map();

/**
 * Registers a moderation action and checks if the executor has exceeded the rate limit.
 * @param {string} executorId The ID of the user performing the action.
 * @returns {boolean} true if the limit is exceeded, false otherwise.
 */
function checkAndRegisterAction(executorId) {
  const now = Date.now();
  
  if (!modActions.has(executorId)) {
    modActions.set(executorId, []);
  }

  const timestamps = modActions.get(executorId);
  timestamps.push(now);

  // Clean up old timestamps outside the window
  while (timestamps.length > 0 && timestamps[0] < now - TIME_WINDOW_MS) {
    timestamps.shift();
  }

  return timestamps.length > MAX_ACTIONS;
}

/**
 * Clears the history for an executor (useful after they've been punished).
 * @param {string} executorId 
 */
function clearHistory(executorId) {
  modActions.delete(executorId);
}

module.exports = {
  checkAndRegisterAction,
  clearHistory
};
