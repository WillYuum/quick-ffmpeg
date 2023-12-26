const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

try {
    const exportType = process.argv[4] || 'mp4';


    const inputFilePath = './input/to-compress.mp4'; // Replace with your input file path
    const outputFilePath = `./output/cropped_movie.${exportType}`; // Replace with your output file path
    const startTime = process.argv[2] || '00:00:00'; // Default to 00:00:00 if not provided
    const endTime = process.argv[3] || ''; // Default to empty string if not provided

    const ffmpegProcess = ffmpeg(inputFilePath)
        .setFfmpegPath(ffmpegPath)
        .setStartTime(startTime);

    if (endTime !== '') {
        const durationDiff = getDurationDifference(startTime, endTime);
        ffmpegProcess.setDuration(durationDiff);
    }

    ffmpegProcess
        .on('end', function () {
            console.log('Cropping finished without re-encoding.');
        })
        .on('error', function (err) {
            console.log('Error: ' + err);
        })
        .output(outputFilePath)
        .videoCodec('copy')
        .audioCodec('copy')
        .run();
} catch (e) {
    console.log("Try Catch Error", e);
}


function getDurationDifference(startTime, endTime) {
    const startTimeInSeconds = getSecondsFromTimeString(startTime);
    const endTimeInSeconds = getSecondsFromTimeString(endTime);

    return endTimeInSeconds - startTimeInSeconds;
}

function getSecondsFromTimeString(timeString) {
    const timeParts = timeString.split(':');
    const minutes = parseInt(timeParts[0]);
    const seconds = parseInt(timeParts[1]);

    return (minutes * 60) + seconds;
}