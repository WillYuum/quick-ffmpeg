const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

const exportType = 'mp4';

const inputFilePath = './input/to-compress.mp4'; // Replace with your input file path
const outputFilePath = `./output/new_res_movie.${exportType}`; // Replace with your output file path
const newRes = "1920x1080";


function SetResolution() {
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