const bs58 = require('bs58');

const { JASON, TANNER, DOMOTHY, HORSESHOE, SANDBOX } = require('../constants');
const { sendMessage, getMessageDetails } = require('../io');
const { handshake } = require('../handshake');

const reverse = s => s.split('').reverse().join('');

module.exports = function(message, update, client) {
  return function(cli, options) {
    cli
      .command('prepend [words...]')
      .option('-u, --undo')
      .action(function(args, cb = () => {}) {
        const stdin = (args.stdin || []).join(' ');
        const words = (args.words || []).join(' ');
        if (args.options.undo) {
          this.log(stdin.replace(words, ''));
        } else {
          this.log(words + stdin);
        }
        cb();
      });

    cli
      .command('append [words...]')
      .option('-u, --undo')
      .action(function(args, cb = () => {}) {
        const stdin = (args.stdin || []).join(' ');
        const words = (args.words || []).join(' ');
        if (args.options.undo) {

          this.log(reverse(reverse(stdin).replace(reverse(words), '')));
        } else {
          this.log(stdin + words);
        }
        cb();
      });
  };
};
