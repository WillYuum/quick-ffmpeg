const { getMultipleFiles } = require('./system_dialog_prompter');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const readline = require('node:readline');


promptFrameRate().then((selectedFrameAmount) => {

    getMultipleFiles((inputFilePaths) => {
        for (let i = 0; i < inputFilePaths.length; i++) {
            const inputFilePath = inputFilePaths[i];
            handleDecreasingFrameAmount(inputFilePath, selectedFrameAmount);
        }
    });
});

function handleDecreasingFrameAmount(inputFilePath, selectedFrameAmount) {
    const ffmpegProcess = ffmpeg();

    const outputFilePath = path.join(
        path.dirname(inputFilePath),
        `decreased_frame_amount_${selectedFrameAmount}_${path.basename(inputFilePath)}`
    );

    try {
        ffmpegProcess
            .input(inputFilePath)
            .setFfmpegPath(ffmpegPath)
            .on('end', function () {
                console.log('Frame amount decrease finished.');
            })
            .on('error', function (err) {
                console.log('Error: ' + err.message);
            })
            .on('progress', function (progress) {
                console.log('Processing...');
                console.log(progress.frames + ' frames done');
                console.log(progress.timemark + ' seconds done');
                console.log('---------------------------------');
            })
            .output(outputFilePath)
            .videoCodec('libx264')
            .outputOptions([
                `-r ${selectedFrameAmount}`
            ])
            .run();
    } catch (err) {
        console.log('Error: ' + err.message);
    }
}


function promptFrameRate() {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        let selectedFrameAmount = 0;

        rl.question('Enter the frame rate you want to set: ', (frameAmount) => {
            selectedFrameAmount = frameAmount;
            rl.close();
            resolve(selectedFrameAmount);
        });
    });
}