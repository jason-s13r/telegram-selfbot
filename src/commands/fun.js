const bs58 = require('bs58');

const { JASON, TANNER, DOMOTHY, HORSESHOE, SANDBOX } = require('../constants');
const { sendMessage, getMessageDetails } = require('../io');
const { handshake } = require('../handshake');


module.exports = function(message, update, client) {
  return function(cli, options) {
    cli
      .command('countdown [counter]')
      .option('-e')
      .action(function(args, cb = () => {}) {
        const counter = Number(args.counter);
        if (counter <= 0) {
          this.log('🚀');
          return cb();
        }
        if (!counter) {
          return cb();
        }
        const e = args.options.e ? '58' : '';
        const command = `countdown${e} ${counter - 1}`;
        if (e) {
          const encoded = bs58.encode(Buffer.from(command));
          this.log(`${handshake.prefix()}0${encoded}`);
          return cb();
        }
        this.log(`${handshake.prefix()}${command}`);
        cb();
      });
  };
};
