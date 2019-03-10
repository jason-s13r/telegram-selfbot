const otplib = require('otplib');
const bs58 = require('bs58');

const { JASON, TANNER, SANDBOX, HANDSHAKE } = require('./constants');
const { sendMessage } = require('./io');

class Handshake {
    constructor() {
        this.secret = otplib.authenticator.generateSecret().substring(0, 8);
        this.initiator = JASON;
        this.nonce = 0;
    }

  execute(key) {
    this.secret = key;
    this.nonce = 0;
    if (!key) {
      this.secret = otplib.authenticator.generateSecret().substring(0, 8);
      this.initiator = JASON;
      return this.secret;
    }
    this.initiator = TANNER;
    return undefined;
  }
  
  getToken() {
    const token = otplib.hotp.generate(this.secret, this.nonce++);
    return token;
  }

  verifyToken(token) {
    const verification = otplib.hotp.check(token, this.secret, this.nonce);
    if (verification) {
      this.nonce += 1;
    }
    return verification;
  }

  prefix() {
    const prefix = this.initiator === TANNER ? '0' : '1';
    const token = this.getToken();
    return `${prefix}${token}`;
  }

  commands(message, update, client) {
    const self = this;
    return function(cli, options) {
      cli
        .command('handshake [key]', 'handshake with optional key parameter')
        .action(async function(args, cb = () => {}) {
          const secret = self.execute(args.key);
          if (secret) {
            await sendMessage(client, HANDSHAKE, undefined, `!handshake ${secret}`);
          } else {
            await sendMessage(client, HANDSHAKE, undefined, `0${self.getToken()}🤝`);
          }
          this.log('');
          message.id = undefined;
          update.message.id = undefined;
          cb();
        });

      cli
        .command('🤝')
        .hidden()
        .action(async function(args, cb = () => {}) {
          await sendMessage(client, HANDSHAKE, undefined, `🤝`);
          this.log('');
          cb();
        });

      cli
        .command('tannerboy', 'run a command on tannerboy')
        .option('-e, --encoded', 'base58 encode the command string')
        .action(function(args, cb = () => {}) {
          const prefix = self.prefix();
          let commandLine = args.stdin.join(' ');
          if (args.options.encoded) {
            commandLine = '0' + bs58.encode(Buffer.from(commandLine));
          }
          this.log(`${prefix}${commandLine}`);
          cb();
        });

      cli.command('handshake-debug').action(async function(args, cb = () => {}) {
        const initiator = self.initiator === JASON ? 'jason' : 'tanner';
        const tokens = [-1, 0, 1]
          .map(offset => `token ${offset}: ${otplib.hotp.generate(self.secret, self.nonce + offset)}`)
          .join('\n');
        const text = `secret: ${self.secret}\ncount: ${self.nonce}\ninitiator: ${initiator}\n${tokens}`;
        await sendMessage(client, SANDBOX, undefined, text);
        cb();
      });
    };
  }
};

module.exports.Handshake = Handshake;
module.exports.handshake = new Handshake();