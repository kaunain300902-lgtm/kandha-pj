import { env } from './env.js';
import { log } from './log.js';

/**
 * One place to send an SMS. Dev mode prints the code so you can build the whole
 * flow without spending a rupee. MSG91 is the usual choice in India; Twilio is
 * here because people already have accounts.
 */
export async function sendSms(phone: string, text: string): Promise<void> {
  if (env.SMS_PROVIDER === 'none' || env.OTP_DEV_MODE) {
    log.info({ phone, text }, 'SMS (dev mode — not actually sent)');
    return;
  }
  if (env.SMS_PROVIDER === 'msg91') {
    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: env.MSG91_AUTH_KEY ?? '' },
      body: JSON.stringify({
        template_id: env.MSG91_TEMPLATE_ID,
        sender: env.MSG91_SENDER_ID,
        recipients: [{ mobiles: phone, OTP: text }],
      }),
    });
    if (!res.ok) log.error({ status: res.status, body: await res.text() }, 'MSG91 send failed');
    return;
  }
  if (env.SMS_PROVIDER === 'twilio') {
    const sid = env.TWILIO_ACCOUNT_SID ?? '';
    const body = new URLSearchParams({ To: `+${phone}`, From: env.TWILIO_FROM ?? '', Body: text });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) log.error({ status: res.status, body: await res.text() }, 'Twilio send failed');
  }
}
