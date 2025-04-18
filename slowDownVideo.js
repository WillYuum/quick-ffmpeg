const { getMultipleFiles } = require("./system_dialog_prompter");
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

// That will make sure fluent-ffmpeg can find and use the correct ffprobe binary no matter the OS.
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);


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


    // const fileName = path.basename(inputFilePath, path.extname(inputFilePath)) + `_${width}x${height}.${exportType}`;
    // const outputFilePath = `./output/${fileName}`;

    const slowDownSpeed = 0.5;


    const frameRate = await getVideoFrameRate(inputFilePath);
    const newFrameRate = frameRate * slowDownSpeed;

    console.log(`Original Frame Rate: ${frameRate}`);
    console.log(`New Frame Rate: ${newFrameRate}`);

}



function getVideoFrameRate(inputFilePath) {
    const ffmpegProcess = ffmpeg();

    return new Promise((resolve, reject) => {
        ffmpegProcess
            .input(inputFilePath)
            .ffprobe((err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    const frameRate = metadata.streams[0].r_frame_rate;
                    //convert to float
                    const floatFrameRate = parseFloat(frameRate.split('/')[0]) / parseFloat(frameRate.split('/')[1]);

                    resolve(floatFrameRate);
                }
            });
    });
}

