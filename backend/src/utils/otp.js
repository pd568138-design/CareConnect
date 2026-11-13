import crypto from 'node:crypto';
import twilio from 'twilio';

export const hashOTP = (code) => crypto.createHash('sha256').update(code).digest('hex');

export async function deliverOTP(phone, code) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, NODE_ENV } = process.env;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({ body: `Your CareConnect verification code is ${code}. It expires in 5 minutes.`, from: TWILIO_FROM_NUMBER, to: phone });
    return;
  }
  if (NODE_ENV !== 'production') {
    console.log(`[CareConnect DEV OTP] ${phone}: ${code}`);
    return;
  }
  throw new Error('SMS OTP is not configured. Add Twilio credentials in the backend environment.');
}
