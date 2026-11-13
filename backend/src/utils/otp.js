
import crypto from 'node:crypto';
import twilio from 'twilio';

export const hashOTP = (code) => {
  return crypto
    .createHash('sha256')
    .update(String(code))
    .digest('hex');
};

export async function deliverOTP(phone, code) {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER,
    NODE_ENV
  } = process.env;

  if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error('Invalid phone number. Use +91XXXXXXXXXX format.');
  }

  if (NODE_ENV !== 'production') {
    console.log('================================');
    console.log('CA​​RECONNECT DEVELOPMENT OTP');
    console.log('Phone:', phone);
    console.log('OTP:', code);
    console.log('================================');
    return true;
  }

  if (
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_AUTH_TOKEN ||
    !TWILIO_FROM_NUMBER
  ) {
    throw new Error(
      'Twilio credentials missing. Configure them in Render Environment.'
    );
  }

  try {
    const client = twilio(
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN
    );

    const message = await client.messages.create({
      body: `Your CareConnect verification code is ${code}. It expires in 5 minutes.`,
      from: TWILIO_FROM_NUMBER,
      to: phone
    });

    console.log('OTP SMS sent:', message.sid);

    return true;

  } catch (error) {
    console.error('Twilio SMS Error:', error.message);
    throw new Error('Unable to send OTP SMS. Please try again.');
  }
}
