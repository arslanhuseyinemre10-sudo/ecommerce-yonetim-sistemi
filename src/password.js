const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  if (storedHash.startsWith('scrypt$')) {
    const [, saltHex, hashHex] = storedHash.split('$');
    if (!saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }

  if (storedHash.startsWith('$2')) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(password, storedHash);
  }

  return false;
}

module.exports = { hashPassword, verifyPassword };
