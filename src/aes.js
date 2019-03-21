const bs58 = require('bs58');
const crypto = require('crypto');

/*
def enc(text):
    key = SHA256.new(OTP_SECRET.encode()).digest()
    iv = get_random_bytes(4)
    cipher = AES.new(key, AES.MODE_CBC, iv * 4)
    ct = cipher.encrypt(pad(text.encode(), AES.block_size))
    return 'I' + b58encode(iv + ct).decode()
*/
module.exports.encrypt = (text, secret) => {
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = crypto.randomBytes(4);
    const iv4 = Buffer.concat([iv, iv, iv, iv]);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv4);
    const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

    const message = bs58.encode(Buffer.concat([iv, ct]));
    return message;
};

/*
def dec(ciphertext):
    ciphertext = b58decode(ciphertext)
    key = SHA256.new(OTP_SECRET.encode()).digest()
    iv = ciphertext[:4]
    ct = ciphertext[4:]
    cipher = AES.new(key, AES.MODE_CBC, iv * 4)
    pt = unpad(cipher.decrypt(ct), AES.block_size)
    return pt.decode()
*/
module.exports.decrypt = (encoded, secret) => {
    const key = crypto.createHash('sha256').update(secret).digest();
    const buffer = bs58.decode(encoded);
    const iv = buffer.slice(0, 4);
    const message = buffer.slice(4);
    const iv4 = Buffer.concat([iv, iv, iv, iv]);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv4);
    decipher.setAutoPadding(true);
    const plain = Buffer.concat([decipher.update(message), decipher.final()]);
    const plaintext = plain.toString('ascii');
    return plaintext;
};