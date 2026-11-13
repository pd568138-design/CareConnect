
import crypto from 'node:crypto';

export const hashOTP = (code) => {
  return crypto
    .createHash('sha256')
    .update(String(code))
    .digest('hex');
};

export async function deliverOTP(phone, code) {
  console.log('CARECONNECT DEMO OTP:', code);
  return true;
}
