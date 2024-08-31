const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const prompt = require('prompt-sync')();

const exportType = 'mp4';

const inputFilePath = './input/to-compress.mp4'; // Replace with your input file path
const outputFilePath = `./output/new_res_movie.${exportType}`; // Replace with your output file path


const width = prompt('Enter the width for the new resolution: ');
const height = prompt('Enter the height for the new resolution: ');


if (!width || !height) {
    console.error("Both width and height must be provided.");
    process.exit(1);
}

function SetResolution() {
    const newRes = `${width}x${height}`;

    const ffmpegProcess = ffmpeg(inputFilePath)
        .setFfmpegPath(ffmpegPath)
        .output(outputFilePath)
        .videoCodec('libx264')
        // .audioCodec('copy')
        .size(newRes);


    ffmpegProcess.on('error', (err) => {
        console.log('An error occured: ', err.message);
    });

    ffmpegProcess.on('progress', (progress) => {
        console.log('... frames: ' + progress.frames);
    });

    ffmpegProcess.on('end', () => {
        console.log('Finished processing');
    });


    ffmpegProcess.run();
}


SetResolution();