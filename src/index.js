const { Client } = require('tdl');
const args = require('minimist')(process.argv.slice(2));

const action = require('./action');
const { HANDSHAKE } = require('./constants');
const { sendMessage } = require('./io');

const STARTUP_TIME = new Date().getTime() / 1000;

const { id: apiId, hash: apiHash, phone: phoneNumber } = args;

const main = async () => {
  const client = new Client({ apiId, apiHash, skipOldUpdates: true });
  await client.connect();
  await client.login(() => ({ phoneNumber }));
  await sendMessage(client, HANDSHAKE, undefined, '!handshake');

  await client.on('update', update => {
    switch (update._) {
      case 'updateNewMessage':
        if (update.message.date <= STARTUP_TIME) {
          break;
        }
        action.updateNewMessage(update, client);
        break;
      default:
        console.error(`[${update._}]`);
        break;
    }
  });
};

main();
