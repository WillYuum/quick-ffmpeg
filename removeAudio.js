const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

try {
    const inputFilePath = './input/video_with_audio.mp4'; // Replace with your input file path
    const outputFilePath = './output/video_without_audio.mp4'; // Replace with your output file path

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
} catch (e) {
    console.log("Try Catch Error", e);
}
