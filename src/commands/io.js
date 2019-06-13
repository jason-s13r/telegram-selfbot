const { JASON, TANNER, DOMOTHY, HORSESHOE, SANDBOX, WARBOT } = require('../constants');
const { sendMessage, getMessageDetails } = require('../io');

module.exports = function(message, update, client) {
  const forward = async args => {
    const stdin = args.stdin.join(' ');
    let chat_id = args.chat_id;
    if (args.options.horseshoe) {
      chat_id = HORSESHOE;
    }
    if (args.options.jason) {
      chat_id = JASON;
    }
    if (args.options.tanner) {
      chat_id = TANNER;
    }
    if (args.options.domothy) {
      chat_id = DOMOTHY;
    }
    if (args.options.sandbox) {
      chat_id = SANDBOX;
    }
    if (args.options.war) {
      chat_id = WARBOT;
    }
    await sendMessage(client, chat_id, undefined, stdin);
  };

  return function(vorpal, options) {
    vorpal
      .command('echo <words...>')
      .alias('say')
      .action(function(args, cb = () => {}) {
        this.log(args.words.join(' '));
        cb();
      });

    vorpal.command('ping').action(function(args, cb = () => {}) {
      this.log('pong');
      cb();
    });

    vorpal.command('cat').action(async function(args, cb = () => {}) {
      const lookupId = message.reply_to_message_id || message.id;
      const lookup = await getMessageDetails(client, message.chat_id, lookupId);
      try {
        this.log(lookup.content.text.text);
      } catch (e) {
        this.log('');
      }
      return cb();
    });

    vorpal
      .command('forward [chat_id]')
      .option('-d, --domothy', 'redirect to domothy')
      .option('-h, --horseshoe', 'redirect to horseshoe')
      .option('-j, --jason', 'redirect to jason')
      .option('-t, --tanner', 'redirect to tanner')
      .option('-s, --sandbox', 'redirect to sandbox')
      .option('-w, --war')
      .alias('>')
      .action(async function(args, cb = () => {}) {
        this.log('');
        await forward(args);
        cb();
      });

    vorpal
      .command('tee [chat_id]')
      .option('-d, --domothy', 'copy to domothy')
      .option('-h, --horseshoe', 'copy to horseshoe')
      .option('-j, --jason', 'copy to jason')
      .option('-t, --tanner', 'copy to tanner')
      .option('-s, --sandbox', 'redirect to sandbox')
      .option('-w, --war')
      .action(async function(args, cb = () => {}) {
        this.log(args.stdin.join(' '));
        await forward(args);
        cb();
      });
  };
};
