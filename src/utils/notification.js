const axios = require('axios');

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

/**
 * Send a push notification to one or more OneSignal player IDs (tokens).
 * @param {string[]} tokens - Array of OneSignal player IDs
 * @param {string} title
 * @param {string} body
 * @param {object} data - Extra data payload
 */
async function sendPushNotification(tokens, title, body, data = {}) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.warn('[Notification] OneSignal credentials not set — skipping push.');
    return;
  }
  if (!tokens || tokens.length === 0) return;

  try {
    await axios.post(
      'https://onesignal.com/api/v1/notifications',
      {
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: tokens,
        headings: { en: title },
        contents: { en: body },
        data,
      },
      {
        headers: {
          Authorization: `Basic ${ONESIGNAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('[Notification] OneSignal error:', err?.response?.data || err.message);
  }
}

module.exports = { sendPushNotification };
