const bs58 = require('bs58');
const Vorpal = require('vorpal');
const { capture } = require('./capture');

const { JASON } = require('./constants');
const { sendMessage } = require('./io');
const { handshake } = require('./handshake');
const aes = require('./aes');
const cliModules = {
  adminFactory: require('./commands/admin'),
  encodingFactory: require('./commands/encoding'),
  ioFactory: require('./commands/io'),
  funFactory: require('./commands/fun'),
  utilFactory: require('./commands/utils')
};

const jason = {
  aliases: {},
  remoteEnabled: true,
  isUser: user_id => user_id === JASON,
  getCommandLineString(value) {
    if (value[0] === '.') {
      return value.substring(1);
    }
    return undefined;
  },
  commands(message, update, client) {
    const self = this;
    return function(cli, options) {
      cli.use(handshake.commands(message, update, client));
      cli.use(cliModules.adminFactory(message, update, client));
      cli.use(cliModules.ioFactory(message, update, client));
      cli.use(cliModules.encodingFactory(message, update, client));
      cli.use(cliModules.funFactory(message, update, client));
      cli.use(cliModules.utilFactory(message, update, client));

      cli
        .command('revoke')
        .option('-a, --allow')
        .action(function(args, cb = () => {}) {
          self.remoteEnabled = !!args.options.allow;
          this.log(`Remote ${self.remoteEnabled ? 'enabled' : 'disabled'}.`);
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

    let decoded = value;

    try {
      switch (decoded[0]) {
        case 'I':
          decoded = aes.decrypt(value.substring(1));
          break;
        case 'l':
          decoded = bs58.decodeUnsafe(value.substring(1)).toString('ascii') || value;
          break;
      }
    } catch {}

    const match = decoded.match(/^([01])([0-9]{6})(.+)$/);
    if (!match) {
      return undefined;
    }
    const [full, id, token, remainder] = match;
    const prefix = handshake.initiator === JASON ? '0' : '1';
    const verified = handshake.verifyToken(token);
    if (!verified || id !== prefix) {
      return undefined;
    }

    return remainder;
  },
  commands(message, update, client) {
    return function(cli, options) {
      cli.use(handshake.commands(message, update, client));

      if (!jason.remoteEnabled) {
        return undefined;
      }

      cli.use(cliModules.ioFactory(message, update, client, handshake));
      cli.use(cliModules.encodingFactory(message, update, client, handshake));
      cli.use(cliModules.funFactory(message, update, client, handshake));
      cli.use(cliModules.utilFactory(message, update, client));
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
  cli.use(user.commands(message, update, client));

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
  switch (update.message.content._) {
    case 'messageAnimation':
    case 'messagePhoto':
    case 'messageVideo':
      update.message.content.text = update.message.content.caption;
      break;
    case 'messageText':
      break;
    default:
      console.error(`[act.updateNewMessage(${update.message.content._})]`);
      return;
  }

  runCli(jason, update, client);
  runCli(tanner, update, client);
};
