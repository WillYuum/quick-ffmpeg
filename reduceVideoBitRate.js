const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const { getFileDirectory } = require('./utils/system_dialog_prompter');
const prompt = require('prompt-sync')();

const ffprobePath = require('ffprobe-static').path;

// That will make sure fluent-ffmpeg can find and use the correct ffprobe binary no matter the OS.
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

getFileDirectory((filePath) => {
    reduceVideoBitrate(filePath);
});

function reduceVideoBitrate(filePath) {
    try {
        const fileName = filePath.split('/').pop();
        const inputFilePath = filePath;
        const outputFilePath = `./output/reduced_${fileName}`;

        // Step 1: Get the current bitrate using ffprobe
        ffmpeg.ffprobe(inputFilePath, (err, metadata) => {
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

            // Step 2: Ask user for percentage reduction
            const reductionInput = prompt('Reduce bitrate by (25 / 50 / 75): ').trim();
            const validOptions = ['25', '50', '75'];
            if (!validOptions.includes(reductionInput)) {
                console.log('Invalid input. Please enter 25, 50, or 75.');
                return;
            }

            const reductionFactor = 1 - parseInt(reductionInput) / 100;
            const newBitrateKbps = Math.round(kbps * reductionFactor);
            const targetBitrate = `${newBitrateKbps}k`;

            console.log(`Reducing to: ${targetBitrate}`);

            // Step 3: Run ffmpeg with new bitrate
            ffmpeg(inputFilePath)
                .setFfmpegPath(ffmpegPath)
                .videoBitrate(targetBitrate)
                .outputOptions('-preset', 'fast')
                .on('end', () => {
                    console.log('Bitrate reduction finished successfully.');
                })
                .on('error', (err) => {
                    console.log('Error during bitrate reduction: ' + err.message);
                })
                .on('progress', (progress) => {
                    const value = progress.percent || 0;
                    console.log(`Processing: ${value.toFixed(2)}% done`);
                })
                .output(outputFilePath)
                .run();
        });
    } catch (e) {
        console.log("Try Catch Error", e.message);
    }
}
