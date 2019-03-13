const bs58 = require('bs58');

const { JASON, TANNER, DOMOTHY, HORSESHOE, SANDBOX } = require('../constants');
const { sendMessage, getMessageDetails } = require('../io');
const { handshake } = require('../handshake');

module.exports = function(message, update, client) {
  return function(cli, options) {
    cli.command('prepend [words...]').action(function(args, cb = () => {}) {
      const stdin = (args.stdin || []).join(' ');
      const words = (args.words || []).join(' ');
      this.log(words + stdin);
      cb();
    });

    cli.command('append [words...]').action(function(args, cb = () => {}) {
      const stdin = (args.stdin || []).join(' ');
      const words = (args.words || []).join(' ');
      this.log(stdin + words);
      cb();
    });
  };
};
