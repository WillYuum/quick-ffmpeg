

const ffprobePath = require('ffprobe-static').path;


function reduceVideoBitrate(command, action) {

    command.setFfprobePath(ffprobePath);

    command.ffprobe(action.input, (err, metadata) => {
        if (err) {
            console.log('Error reading metadata:', err.message);
            return;
        }

        const originalBitrate = metadata.format.bit_rate;
        console.log(`Original bitrate: ${originalBitrate}`);
        if (!originalBitrate) {
            console.log('Could not determine original bitrate.');
            return;
        }

        const kbps = parseInt(originalBitrate) / 1000;
        console.log(`Original bitrate: ${Math.round(kbps)} kbps`);


        const reductionInput = action.reductionPercentage; // Assuming action has a property 'reductionPercentage'
        console.log(`Reducing bitrate by: ${reductionInput}`);
        const validOptions = [25, 50, 75];
        if (!validOptions.includes(reductionInput)) {
            console.log('Invalid input. Please enter 25, 50, or 75.');
            return;
        }

        const reductionFactor = 1 - reductionInput / 100;
        const newBitrateKbps = Math.round(kbps * reductionFactor);
        const targetBitrate = `${newBitrateKbps}k`;
        console.log(`Reducing to: ${targetBitrate}`);

        command
            .videoBitrate(targetBitrate)
            .outputOptions('-preset', 'fast')
    });

    return command;
}

module.exports = reduceVideoBitrate;