const { CronJob, CronTime } = require('cron');

const { LOG, SANDBOX } = require('../constants');
const { getMessageDetails, sendMessage } = require('../io');
const { handshake } = require('../handshake');

const MINUTE = 60000
const HALF_MINUTE = 30000;

let interval = null;
const jobs = {};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = function(message, update, client) {
  return function(cli, options) {
    cli
      .command('info')
      .option('-r, --raw', 'output raw JSON')
      .option('-k, --key <value>', 'get specific JSON property')
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

    cli
      .command('job <minute>')
      .action(async function(args, cb = () => {}) {
        const minute = args.minute;
        const stdin = args.stdin.join(' ');
        jobs[minute] = jobs[minute] || [];
        jobs[minute].push(stdin);
        this.log(`Added :${minute} job.`);
        this.log(`> ${stdin}`);

        if (!interval) {
          interval = setInterval(async () => {
            const minute = new Date().getMinutes();
            const work = jobs[minute];
            if (!work) {
              return;
            }
            for (const command of work) {
              await sleep(Math.floor(Math.random() * 10000) + 1000);
              await sendMessage(client, LOG, undefined, command);
            }
          }, MINUTE);
          this.log('started.');
        }
        return cb();
      });

    cli
      .command('delay <seconds>')
      .action(async function(args, cb = () => {}) {
        const seconds = (args.seconds || 30);
        const stdin = args.stdin.join(' ');

        if (!stdin) {
          this.log('nothing to delay.');
          return cb();
        }

        const timeout = setTimeout(() => {
          sendMessage(client, LOG, undefined, stdin);
        }, seconds * 1000);

        this.log(`Delay set for ${seconds}s.`);
        this.log(`> ${stdin}`);
        return cb();
      });
  };
};
