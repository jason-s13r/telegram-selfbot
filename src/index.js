const { Client } = require('tdl')
const args = require('minimist')(process.argv.slice(2));

const action = require('./action');

const {
  id: apiId,
  hash: apiHash,
  phone: phoneNumber
} = args;

const main = async () => {
  const client = new Client({ apiId, apiHash, skipOldUpdates: true });
  await client.connect();
  await client.login(() => ({ phoneNumber }));

  await client.on('update', update => {
    switch (update._) {
      case 'updateNewMessage':
        action.updateNewMessage(update, client);
        break;
      default:
        console.error(`[${update._}]`); 
        break;
    }
  });
};

main();