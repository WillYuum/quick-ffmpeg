// Note for future fixing: The 'atempo' filter in FFmpeg only supports specific values like 0.5, 1.0, and 2.0.
// For slower or faster speeds, we need to chain multiple 'atempo' filters. 
// Example: To achieve 0.25 speed, use atempo=0.5,atempo=0.5.
// Example: To achieve 4x speed, use atempo=2.0,atempo=2.0.
// This limitation exists to prevent audio artifacts and ensure smoother time-stretching.



const { getMultipleFiles, getSaveDir } = require("./system_dialog_prompter");
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

// That will make sure fluent-ffmpeg can find and use the correct ffprobe binary no matter the OS.
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const OUTPUT_PATH = './output/'; // Default output path


getMultipleFiles((filePaths) => {
    processFilesSequentially(filePaths);
});


function processFilesSequentially(filePaths, index = 0) {
    if (index >= filePaths.length) {
        console.log("All files processed successfully.");
        return;
    }

    SlowDownVideo(filePaths[index]).then(() => {
        processFilesSequentially(filePaths, index + 1);
    }).catch((err) => {
        console.error("Error processing file:", err);
    });
}
async function SlowDownVideo(inputFilePath) {
    console.log("Processing...", inputFilePath);

    const slowDownSpeed = 0.5;  // Speed ratio: 0.5 means slow down to half speed

    const originalDuration = await getVideoDuration(inputFilePath);  // Get the original video duration

    // Calculate the new duration based on the speed ratio
    const newDuration = originalDuration * (1 / slowDownSpeed);  // Slow down by doubling the duration

    console.log(`Original duration: ${originalDuration}s`);
    console.log(`New duration: ${newDuration}s (speed ratio: ${slowDownSpeed})`);

    return new Promise((resolve, reject) => {
        SetPresentationStamp(inputFilePath, slowDownSpeed, () => {
            console.log("Finished processing...", inputFilePath);
            resolve();
        });
    });
}

function SetPresentationStamp(inputFilePath, speedRatio, onDone = () => { }) {
    const newOutputFilePath = `${OUTPUT_PATH}${inputFilePath.split('/').pop().split('.').slice(0, -1).join('.')}_slow.mp4`;

    // Modify video playback speed and audio tempo according to the speed ratio
    const ffmpegProcess = ffmpeg(inputFilePath)
        .setFfmpegPath(ffmpegPath)
        .videoFilters(`setpts=${1 / speedRatio}*PTS`)  // Slow down video: PTS should be scaled by the inverse of the speed ratio
        // .audioFilters([`atempo=${1 / speedRatio}`])  // Slow down audio: atempo should be scaled by the inverse of the speed ratio
        .noAudio()
        .outputOptions([
            '-crf 23',
            '-preset medium',
            '-movflags +faststart'
        ])
        .output(newOutputFilePath)
        .on('progress', (progress) => {
            console.log('... frames: ' + progress.frames);
        })
        .on('end', () => {
            console.log(`Finished processing ${inputFilePath}`);
            onDone();
        })
        .on('error', (err) => {
            console.error('An error occurred: ', err.message);
        });

    ffmpegProcess.run();
}


function getVideoDuration(inputFilePath) {
    const ffmpegProcess = ffmpeg();

    return new Promise((resolve, reject) => {
        ffmpegProcess
            .input(inputFilePath)
            .ffprobe((err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    const duration = metadata.format.duration;
                    resolve(duration);
                }
            });
    });
}
