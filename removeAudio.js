const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const { getFileDirectory, getSaveDir } = require('./system_dialog_prompter');
const path = require('path');

// const inputFilePath = './input/video_with_audio.mp4'; // Replace with your input file path
getFileDirectory((inputFilePath) => {
    const outputFilePath = './output/video_without_audio.mp4'; // Replace with your output file path

    handleRemovingAudio(inputFilePath);
});

function handleRemovingAudio(inputFilePath) {
    const ffmpegProcess = ffmpeg(inputFilePath)
        .setFfmpegPath(ffmpegPath)
        .noAudio(); // Remove audio


    getSaveDir((outputFilePath) => {

        const outputFileName = path.basename(outputFilePath);
        const hasExtension = outputFileName.includes('.mp4');
        const updatedOutputFilePath = hasExtension ? outputFilePath : `${outputFilePath}.mp4`;


        ffmpegProcess
            .on('end', function () {
                console.log('Audio removal finished.');

            })
            .on('error', function (err) {
                console.log('Error: ' + err);
            })
            .output(updatedOutputFilePath)
            .videoCodec('copy')
            .run();
    });
}