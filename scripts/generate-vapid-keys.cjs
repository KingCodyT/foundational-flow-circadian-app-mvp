const { createECDH } = require('node:crypto');

function base64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const ecdh = createECDH('prime256v1');
const publicKey = ecdh.generateKeys();
const privateKey = ecdh.getPrivateKey();

console.log(`WEB_PUSH_VAPID_PUBLIC_KEY=${base64Url(publicKey)}`);
console.log(`WEB_PUSH_VAPID_PRIVATE_KEY=${base64Url(privateKey)}`);
console.log('WEB_PUSH_VAPID_SUBJECT=mailto:notifications@codyoakland.com');
