
import crypto from 'node:crypto';

export const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const hashOTP = (code) => {
  return crypto
    .createHash('sha256')
    .update(String(code))
    .digest('hex');
};

export async function deliverOTP(phone, code) {
  console.log('================================');
  console.log('CARECONNECT DEMO OTP');
  console.log('Phone:', phone);
  console.log('OTP:', code);
  console.log('================================');

  return true;
}
