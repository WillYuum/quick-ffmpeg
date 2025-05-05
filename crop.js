const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const { getFileDirectory } = require('./system_dialog_prompter');
const prompt = require('prompt-sync')();

getFileDirectory((filePath) => {
    handleCrop(filePath);
});

function handleCrop(filePath) {
    try {
        const exportType = process.argv[4] || 'mp4';
        const inputFilePath = filePath;
        const outputFilePath = `./output/cropped_movie.${exportType}`;

        const startTime = prompt('Enter the start time (HH:MM:SS): ');
        const endTime = prompt('Enter the end time (HH:MM:SS) [Leave empty to cut till end]: ');

        const ffmpegProcess = ffmpeg(inputFilePath)
            .setFfmpegPath(ffmpegPath)
            .setStartTime(startTime);

        if (endTime.trim() !== '') {
            const durationDiff = getDurationDifference(startTime, endTime);
            if (durationDiff <= 0) {
                console.log('Invalid time range: endTime must be after startTime');
                return;
            }
            ffmpegProcess.setDuration(durationDiff);
        }

        ffmpegProcess
            .on('end', () => {
                console.log('Cropping finished successfully.');
            })
            .on('error', (err) => {
                console.log('Error during cropping: ' + err.message);
            })
            .output(outputFilePath)
            .videoCodec('copy')
            .audioCodec('copy')
            .run();
    } catch (e) {
        console.log("Try Catch Error", e.message);
    }
}

function getDurationDifference(startTime, endTime) {
    const start = getSecondsFromTimeString(startTime);
    const end = getSecondsFromTimeString(endTime);
    return end - start;
}

function getSecondsFromTimeString(timeString) {
    const parts = timeString.split(':').map(Number);
    let seconds = 0;

    if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
        seconds = parts[0];
    } else {
        throw new Error("Invalid time format. Use HH:MM:SS or MM:SS");
    }

    return seconds;
}
