const parseArgs = require('minimist');
const otplib = require('otplib');
const bs58 = require('bs58');
const Vorpal = require('vorpal');
const { capture } = require('./capture');

const { JASON, TANNER, DOMOTHY, HORSESHOE, HORSESHOE_BOT } = require('./constants');
const { sendMessage } = require('./io');

const cliModules = {
  ioFactory: require('./commands/io'),
  encoding: require('./commands/encoding'),
  adminFactory: require('./commands/admin')
};

const jason = {
  key: otplib.authenticator.generateSecret(),
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
      cli.use(cliModules.adminFactory(message, update, client));
      cli.use(cliModules.ioFactory(message, update, client));
      cli.use(cliModules.encoding);

      cli.command('generate', 'generate a new key for tanner').action(function(args, cb = () => {}) {
        tanner.key = otplib.authenticator.generateSecret();
        this.log(tanner.key);
        cb();
      });

      cli.command('tanner', 'run a command as tanner can').action(function(args, cb = () => {}) {
        const token = otplib.authenticator.generate(tanner.key);
        this.log(token + args.stdin.join(' '));
        cb();
      });

      cli.command('tannerboy', 'run a command on tannerboy').action(function(args, cb = () => {}) {
        const token = otplib.authenticator.generate(self.key);
        this.log(token + args.stdin.join(' '));
        cb();
      });

      cli.command('key [key]', 'set a key for tannerboy').action(function(args, cb = () => {}) {
        self.key = args.key;
        this.log('Ok.');
        cb();
      });
    };
  }
};

const tanner = {
  key: otplib.authenticator.generateSecret(),
  isUser: user_id => user_id === TANNER || user_id === JASON,
  getCommandLineString(value) {
    const match = value.match(/^([0-9]{6})(.*)$/);
    if (!match) {
      return undefined;
    }
    const [full, token, remainder] = match;
    const verified = otplib.authenticator.check(token, this.key);
    if (!verified) {
      return undefined;
    }
    try {
      return bs58.decode(remainder).toString('ascii');
    } catch (e) {
      return remainder;
    }
  },
  vorpal(message, update, client) {
    const self = this;
    return function(cli, options) {
      cli.use(cliModules.ioFactory(message, update, client));
      cli.use(cliModules.encoding);

      cli.command('key [key]', 'provide a key for jason to use on tannerboy').action(function(args, cb = () => {}) {
        jason.key = args.key;
        this.log('Ok.');
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

  const cli = Vorpal().use(user.vorpal(message, update, client));

  cli.catch('[words...]').action(() => {});

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
