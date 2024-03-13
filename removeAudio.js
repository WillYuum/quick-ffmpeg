const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const getFileDirectory = require('./system_dialog_prompter');

// const inputFilePath = './input/video_with_audio.mp4'; // Replace with your input file path
getFileDirectory((inputFilePath) => {
    const outputFilePath = './output/video_without_audio.mp4'; // Replace with your output file path

    handleRemovingAudio(inputFilePath, outputFilePath);
});

function handleRemovingAudio(inputFilePath, outputFilePath) {
    const ffmpegProcess = ffmpeg(inputFilePath)
        .setFfmpegPath(ffmpegPath)
        .noAudio(); // Remove audio

    ffmpegProcess
        .on('end', function () {
            console.log('Audio removal finished.');
        })
        .on('error', function (err) {
            console.log('Error: ' + err);
        })
        .output(outputFilePath)
        .videoCodec('copy')
        .run();
}