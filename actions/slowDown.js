// Note for future fixing: The 'atempo' filter in FFmpeg only supports specific values like 0.5, 1.0, and 2.0.
// For slower or faster speeds, we need to chain multiple 'atempo' filters. 
// Example: To achieve 0.25 speed, use atempo=0.5,atempo=0.5.
// Example: To achieve 4x speed, use atempo=2.0,atempo=2.0.
// This limitation exists to prevent audio artifacts and ensure smoother time-stretching.

const ffprobePath = require('ffprobe-static').path;

function slowDown(command, actionParams, inputFilePath) {
    command.setFfprobePath(ffprobePath);
    console.log("Processing slowDown action with params:", actionParams);
    const slowDownSpeed = 0.5;  // Speed ratio: 0.5 means slow down to half speed

    console.log("Inputed file path:", inputFilePath);


    return new Promise((resolve, reject) => {
        getVideoDuration(command, inputFilePath)
            .then((duration) => {
                const newDuration = duration * (1 / slowDownSpeed);

                console.log(`Original duration: ${duration}s`);
                console.log(`New duration: ${newDuration}s (speed ratio: ${slowDownSpeed})`);

                const with_minterpolate = actionParams.with_minterpolate || false;

                const newCommand = SetPresentationStamp(command, slowDownSpeed, with_minterpolate);
                resolve(newCommand);
            })
            .catch((err) => {
                console.error("Error getting video duration:", err);
                resolve(command);
            });
    });
}

module.exports = slowDown;



function SetPresentationStamp(command, slowDownSpeed, withMinterpolate) {

    let videoFilters = `setpts=${1 / slowDownSpeed}*PTS`;

    if (withMinterpolate) {
        videoFilters = `minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1,${videoFilters}`;


        console.log("Using motion interpolation for smoother playback.");
    } else {
        console.log("No motion interpolation applied.");
    }

    command
        .videoFilters(videoFilters)
        .noAudio()
        .outputOptions([
            '-crf 23',
            '-preset medium',
            '-movflags +faststart'
        ])

    return command;
}


function getVideoDuration(ffmpegProcess, inputFilePath) {
    return new Promise((resolve, reject) => {
        ffmpegProcess
            .input(inputFilePath)
            .ffprobe((err, metadata) => {
                if (err) {
                    console.error("Error in ffprobe:", err);
                    reject(err);
                } else {
                    const duration = metadata.format.duration;
                    resolve(duration);
                }
            });
    });
}
