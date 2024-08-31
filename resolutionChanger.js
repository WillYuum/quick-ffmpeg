const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const prompt = require('prompt-sync')();
const { getMultipleFiles } = require('./system_dialog_prompter');
const path = require('node:path');

const exportType = 'mp4';

const width = prompt('Enter the width for the new resolution: ');
const height = prompt('Enter the height for the new resolution: ');

if (!width || !height) {
    console.error("Both width and height must be provided.");
    process.exit(1);
}

// Function to set the resolution for a single file
async function SetResolution(inputFilePath) {
    console.log("Processing...", inputFilePath);


    const fileName = path.basename(inputFilePath, path.extname(inputFilePath)) + `_${width}x${height}.${exportType}`;
    const outputFilePath = `./output/${fileName}`;
    const newRes = `${width}x${height}`;

    return new Promise((resolve, reject) => {
        const ffmpegProcess = ffmpeg(inputFilePath)
            .setFfmpegPath(ffmpegPath)
            .output(outputFilePath)
            .videoCodec('libx264')
            // .audioCodec('copy')
            .size(newRes);


        ffmpegProcess.on('error', (err) => {
            console.log('An error occurred: ', err.message);
            reject(err);
        });

        ffmpegProcess.on('progress', (progress) => {
            console.log('... frames: ' + progress.frames);
        });

        ffmpegProcess.on('end', () => {
            console.log(`Finished processing ${inputFilePath}`);
            resolve();
        });

        ffmpegProcess.run();
    });
}

// Function to process files sequentially
function processFilesSequentially(filePaths, index = 0) {
    if (index >= filePaths.length) {
        console.log('All files processed successfully.');
        return;
    }

    SetResolution(filePaths[index]).then(() => {
        processFilesSequentially(filePaths, index + 1);
    }).catch((err) => {
        console.error('Error during processing on video index:', index, 'with', err);
    });
}


getMultipleFiles((filePaths) => {
    processFilesSequentially(filePaths);
});
