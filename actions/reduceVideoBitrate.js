const ffprobePath = require('ffprobe-static').path;

function reduceVideoBitrate(command, action) {
    return new Promise((resolve, reject) => {
        command.setFfprobePath(ffprobePath);

        command.ffprobe(action.input, (err, metadata) => {
            if (err) {
                console.log('Error reading metadata:', err.message);
                return reject(err);
            }

            const originalBitrate = metadata.format && metadata.format.bit_rate ? metadata.format.bit_rate : null;
            console.log(`Original bitrate: ${originalBitrate}`);
            if (!originalBitrate) {
                console.log('Could not determine original bitrate.');
                return reject(new Error('Could not determine original bitrate.'));
            }

            const bitrateNumber = Number(originalBitrate);
            if (isNaN(bitrateNumber)) {
                console.log('Original bitrate is not a valid number.');
                return reject(new Error('Original bitrate is not a valid number.'));
            }
            const kbps = bitrateNumber / 1000;
            console.log(`Original bitrate: ${Math.round(kbps)} kbps`);

            const reductionInput = action.reductionPercentage;
            console.log(`Reducing bitrate by: ${reductionInput}`);
            const validOptions = [25, 50, 75];
            if (!validOptions.includes(reductionInput)) {
                console.log('Invalid input. Please enter 25, 50, or 75.');
                return reject(new Error('Invalid reduction percentage.'));
            }

            const reductionFactor = 1 - reductionInput / 100;
            const newBitrateKbps = Math.round(kbps * reductionFactor);
            const targetBitrate = `${newBitrateKbps}k`;
            console.log(`Reducing to: ${targetBitrate}`);

            command
                .videoBitrate(targetBitrate)
                .outputOptions('-preset', 'fast');

            resolve(command);
        });
    });
}

module.exports = reduceVideoBitrate;