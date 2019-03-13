const bs58 = require('bs58');
const Vorpal = require('vorpal');
const { capture } = require('./capture');

const { JASON } = require('./constants');
const { sendMessage } = require('./io');
const { handshake } = require('./handshake');
const cliModules = {
  adminFactory: require('./commands/admin'),
  encodingFactory: require('./commands/encoding'),
  ioFactory: require('./commands/io'),
  funFactory: require('./commands/fun'),
  utilFactory: require('./commands/utils')
};

const jason = {
  aliases: {},
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

    let decoded = value;

    if (value[0] === 'l') {
      decoded = bs58.decodeUnsafe(value.substring(1)).toString('ascii') || value;
    }

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
