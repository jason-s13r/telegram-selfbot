const bs58 = require('bs58');

const { JASON, TANNER, DOMOTHY, HORSESHOE, SANDBOX } = require('../constants');
const { sendMessage, getMessageDetails } = require('../io');
const { handshake } = require('../handshake');
const aes = require('../aes');


module.exports = function(message, update, client) {
  return function(cli, options) {
    cli
      .command('countdown <counter>')
      .option('-e, --encoded')
      .option('-a, --aes')
      .option('-w, --words <words...>')
      .action(function(args, cb = () => {}) {
        const counter = Number(args.counter);
        const payload = args.options.words || '';
        if (counter <= 0) {
          this.log(payload || '🚀');
          return cb();
        }
        if (!counter) {
          return cb();
        }
        const prefix = handshake.prefix();
        let commandLine = `${prefix}countdown ${counter - 1} ${payload}`;
        if (args.options.encoded) {
          commandLine = 'l' + bs58.encode(Buffer.from(`${prefix}countdown-58 ${counter - 1} ${payload}`));
        }
        if (args.options.aes) {
          commandLine = 'I' + aes.encrypt(`${prefix}countdown-enc ${counter - 1} ${payload}`);
        }
        this.log(commandLine);
        cb();
      });

      cli
        .command('larp <words...>')
        .option('-c, --command <command>')
        .option('-e, --encoded')
        .option('-a, --aes')
        .option('-h, --horseshoe')
        .option('-s, --sandbox')
        .option('-b, --bwb')
        .option('-d, --dm')
        .option('-0, --null')
        .action(async function(args, cb = () => {}) {
          const words = []
            .concat(args.words || [])
            .concat(args.stdin || [])
            .join(' ');
          let destination = '';
          if (args.options.horseshoe) {
            destination = ' ~ HS';
          }
          if (args.options.sandbox) {
            destination = ' ~ SB';
          }
          if (args.options.bwb) {
            destination = ' ~ BWB';
          }
          if (args.options.dm) {
            destination = ' ~ DM';
          }
          if (args.options.null) {
            destination = ' ~ NULL';
          }
          const command = args.option.command || 'echo';
          let commandLine = `${handshake.prefix()}${command} ${words}${destination}`;
          if (args.options.encoded) {
            commandLine = 'l' + bs58.encode(Buffer.from(commandLine));
          }if (args.options.aes) {
            commandLine = 'I' + aes.encrypt(commandLine);
          }
          this.log(commandLine);
          cb();
        });
  };
};
