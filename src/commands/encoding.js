const bs58 = require('bs58');

const tr = (input, set1, set2) => {
  return input.replace(new RegExp(`([${set1}])`, 'ig'), function(value) {
    var index = set1.indexOf(value.toLowerCase());
    var c = set2[index] || value;
    return /[A-Z]/.test(value) ? c.toUpperCase() : c;
  });
};

module.exports = function(vorpal, options) {
  vorpal.command('tr [set1] [set2]').action(function(args, cb = (() => {})) {
    const { set1, set2 } = args;
    const output = tr(args.stdin.join(' '), '' + set1, '' + set2);
    this.log(output);
    cb();
  });

  vorpal.command('rot13 [words...]').action(function(args, cb = (() => {})) {
    const input = (args.stdin || args.words).join(' ');
    const output = tr(input, 'abcdefghijklmnopqrstuvwxyz', 'nopqrstuvwxyzabcdefghijklm');
    this.log(output);
    cb();
  });

  vorpal
    .command('lolcryption', 'enlolcrypt or delolcrypt stdin')
    .option('-d, --delolcrypt')
    .action(function(args, cb = (() => {})) {
      const set1 = 'aeioubcdfghjklmnpqrstvwxyz';
      const set2 = 'iouaenpqrstvwxyzbcdfghjklm';
      let output = '';
      if (args.options.delolcrypt) {
        output = tr(args.stdin.join(' '), set2, set1);
      } else {
        output = tr(args.stdin.join(' '), set1, set2);
      }
      this.log(output);
      cb();
    });

  vorpal
    .command('base64', 'encode stdin to base64')
    .option('-d', '--decode')
    .action(function(args, cb = (() => {})) {
      const stdin = args.stdin.join(' ');
      if (args.options.decode) {
        const decoded = Buffer.from(stdin, 'base64').toString('ascii');
        this.log(decoded);
      } else {
        const encoded = Buffer.from(stdin).toString('base64');
        this.log(encoded);
      }
      cb();
    });

    vorpal
    .command('base58', 'encode stdin to base58')
    .option('-d', '--decode')
    .action(function(args, cb = (() => {})) {
      const stdin = args.stdin.join(' ');
      if (args.options.decode) {
        this.log(bs58.decode(stdin).toString('ascii'));
      } else {
        this.log(bs58.encode(Buffer.from(stdin)));
      }
      cb();
    });

    vorpal
    .command('reverse', 'reverse text of stdin')
    .action(function(args, cb = (() => {})) {
        this.log(args.stdin.join(' ').split('').reverse().join(''));
        cb();
    });
};
