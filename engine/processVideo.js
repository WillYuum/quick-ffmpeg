const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { createActionRegistry } = require('../actions/registry');
const errorHandler = require('../utils/errorHandler');

async function processVideo(instruction) {
    const actionRegistry = createActionRegistry();
    let command = ffmpeg(instruction.input);
    const onProgress = typeof instruction.onProgress === 'function' ? instruction.onProgress : null;
    const onCompleted = typeof instruction.onCompleted === 'function' ? instruction.onCompleted : null;
    const onFailed = typeof instruction.onFailed === 'function' ? instruction.onFailed : null;

    // Use GPU acceleration if available (for NVIDIA GPUs)
    command = command.addOption('-c:v', 'h264_nvenc');
    const inputFilePath = instruction.input;

    let crashed = false;
    for (const action of instruction.actions) {
        let normalizedAction;
        try {
            normalizedAction = actionRegistry.validateAction(action);
        } catch (err) {
            crashed = true;
            console.error(err.message);
            break;
        }

        const handler = actionRegistry.getHandler(action.type);
        if (!handler) {
            crashed = true;
            errorHandler.handleUnknownAction(action);
            break;
        }

        try {
            command = await handler(command, normalizedAction, inputFilePath);
        } catch (err) {
            crashed = true;
            errorHandler.handleActionError?.(normalizedAction, err);
            console.error(`Logging error ${err}`);
            break;
        }
    }

    const noActions = instruction.actions.length === 0;
    if (noActions) {
        return;
    }

    const errorHappened = crashed || !command;
    if (errorHappened) {
        console.error('❌ Error occurred while processing the video. Resolve issues and try again.');
        return;
    }


    return new Promise((resolve, reject) => {
        command
            .setFfmpegPath(ffmpegPath)
            .output(instruction.output)
            .on('end', () => {
                console.log('✅ Done processing.');
                onCompleted?.({
                    input: instruction.input,
                    output: instruction.output,
                });
                resolve();
            })
            .on('progress', progress => {
                onProgress?.(progress);
                if (progress.percent) {
                    console.log(`📊 Progress: ${progress.percent.toFixed(2)}%`);
                } else {
                    console.log(`📊 Processing: ${progress.frames} frames processed`);
                }
            })
            .on('error', err => {
                console.error('❌ FFmpeg Error:', err.message);
                onFailed?.(err);
                reject(err);
            })
            .run();
    });
}
module.exports = processVideo;
