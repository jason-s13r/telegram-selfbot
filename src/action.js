const parseArgs = require('minimist');
const otplib = require('otplib');
const bs58 = require('bs58');
const Vorpal = require('vorpal');
const { capture } = require('./capture');

const { JASON, TANNER, SANDBOX, HANDSHAKE } = require('./constants');
const { sendMessage } = require('./io');

const cliModules = {
  adminFactory: require('./commands/admin'),
  encodingFactory: require('./commands/encoding'),
  ioFactory: require('./commands/io'),
  funFactory: require('./commands/fun')
};

const handshake = {
  secret: otplib.authenticator.generateSecret().substring(0, 8),
  initiator: JASON,
  nonce: 0,
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
  },
  getToken() {
    const token = otplib.hotp.generate(this.secret, this.nonce++);
    return token;
  },
  verifyToken(token) {
    const verification = otplib.hotp.check(token, this.secret, this.nonce);
    if (verification) {
      this.nonce += 1;
    }
    return verification;
  },
  prefix() {
    const prefix = this.initiator === TANNER ? '0' : '1';
    const token = this.getToken();
    return `${prefix}${token}`;
  },
  vorpal(message, update, client) {
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

const jason = {
  aliases: {},
  isUser: user_id => user_id === JASON,
  getCommandLineString(value) {
    const match = value.match(/^\.(.*)$/);
    if (!match) {
      return undefined;
    }
    const [full, remainder] = match;
    return remainder;
  },
  vorpal(message, update, client) {
    const self = this;
    return function(cli, options) {
      cli.use(handshake.vorpal(message, update, client));
      cli.use(cliModules.adminFactory(message, update, client, handshake));
      cli.use(cliModules.ioFactory(message, update, client, handshake));
      cli.use(cliModules.encodingFactory(message, update, client, handshake));
      cli.use(cliModules.funFactory(message, update, client, handshake));

      Object.keys(self.aliases).forEach(alias => {
        const command = cli.find(self.aliases[alias]);
        if (command) {
          command.alias(alias);
        } else {
          self.aliases[alias] = undefined;
        }
      });

      cli.command('alias [name] [command]').action(function(args, cb = () => {}) {
        if (!args.command || !args.name) {
          return cb();
        }
        const command = cli.find(args.command);
        const name = cli.find(args.name);

        if (command && !name) {
          self.aliases[args.name] = args.command;
          this.log('ok.');
        } else {
          this.log(`Can't do that.`);
        }
        cb();
      });
    };
  }
};

const tanner = {
  isUser: user_id => user_id !== JASON,
  getCommandLineString(value) {
    if (/^\.handshake.*$/.test(value)) {
      return value.substring(1);
    }
    const match = value.match(/^([01])([0-9]{6})(.+)$/);
    if (!match) {
      return undefined;
    }
    const [full, id, token, remainder] = match;
    const prefix = handshake.initiator === JASON ? '0' : '1';
    const verified = handshake.verifyToken(token);
    if (!verified || id !== prefix) {
      return undefined;
    }

    try {
      if (remainder[0] === '0') {
        return bs58.decode(remainder.substring(1)).toString('ascii');
      }
      return remainder;
    } catch (e) {
      return remainder;
    }
  },
  vorpal(message, update, client) {
    return function(cli, options) {
      cli.use(handshake.vorpal(message, update, client));
      cli.use(cliModules.ioFactory(message, update, client, handshake));
      cli.use(cliModules.encodingFactory(message, update, client, handshake));
      cli.use(cliModules.funFactory(message, update, client, handshake));
    };
  }
};

const qot = {
  isUser: user_id => user_id === JASON,
  getCommandLineString(value) {
    if (/qot([^\.]|$)/.test(value)) {
      return 'qot';
    }
    return undefined;
  },
  vorpal(message, update, client) {
    const self = this;
    return function(cli, options) {
      cli.command('qot').action(function(args, cb = () => {}) {
        this.log('qot.');
        cb();
      });
    };
  }
};

const runCli = async (user, update, client) => {
  const { message } = update;
  if (!user.isUser(message.sender_user_id)) {
    return;
  }
  const commandString = user.getCommandLineString(message.content.text.text);

  if (!commandString) {
    return;
  }

  const cli = Vorpal();

  cli.catch('[words...]').action(() => {});
  cli.use(user.vorpal(message, update, client));

  const exit = cli.find('exit');
  if (!user.isUser(JASON) && exit) {
    exit.remove();
  }

  const stdout = await capture(async () => await cli.exec(commandString));

  if (stdout && stdout.length) {
    await sendMessage(client, message.chat_id, message.id, stdout);
  }
};

module.exports.updateNewMessage = (update, client) => {
  const { message } = update;
  switch (message.content._) {
    case 'messageText':
      runCli(jason, update, client);
      runCli(tanner, update, client);
      break;
    default:
      console.error(`[act.updateNewMessage(${message.content._})]`, message);
      break;
  }
};
