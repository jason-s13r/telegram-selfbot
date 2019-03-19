const { getMessageDetails } = require('../io');
const { handshake } = require('../handshake');

module.exports = function(message, update, client) {
  return function(cli, options) {
    cli
      .command('info', 'get information about a message')
      .option('-r, --raw', 'output raw JSON')
      .option('-k, --key [value]', 'get specific JSON property')
      .action(async function(args, cb = () => {}) {
        const lookupId = message.reply_to_message_id || message.id;
        const lookup = await getMessageDetails(client, message.chat_id, lookupId);

        if (args.options.raw) {
          const json = JSON.stringify(lookup, null, '  ');
          this.log(json);
          return cb();
        }
        if (args.options.key) {
          try {
            const partial = args.options.key.split('.').reduce((current, key) => current[key], lookup);
            this.log(partial === undefined ? 'undefined' : JSON.stringify(partial, null, '  '));
            return cb();
          } catch (e) {
            this.log(e.message);
            return cb();
          }
        }
        this.log(
          [
            `id: ${BigInt(lookup.id) >> BigInt(20)} (${lookup.id})`,
            `user_id: ${lookup.sender_user_id}`,
            `chat_id: ${lookup.chat_id}`
          ].join('\n')
        );
        return cb();
      });
  };
};
