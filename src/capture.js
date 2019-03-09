var capcon = require('capture-console');
 
module.exports.capture = async (work) => {
    let output = '';
    capcon.startCapture(process.stdout, function (stdout) {
        output += stdout;
    });

    await work();
 
    capcon.stopCapture(process.stdout);
    return output;
};