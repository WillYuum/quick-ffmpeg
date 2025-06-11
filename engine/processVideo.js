const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const actionHandlers = require('../actions');
const errorHandler = require('../utils/errorHandler');

async function processVideo(instruction) {
    let command = ffmpeg(instruction.input);

    const inputFilePath = instruction.input;

    //get current input
    console.log('NANI:', inputFilePath);

    let crashed = false;
    for (const action of instruction.actions) {
        // const objectValues = Object.values(instruction);
        // console.log('Action values:', objectValues);
        const handler = actionHandlers[action.type];
        if (!handler) {
            crashed = true;
            errorHandler.handleUnknownAction(action);
            break;
        }

        try {
            command = await handler(command, action, inputFilePath);
        } catch (err) {
            crashed = true;
            errorHandler.handleActionError?.(action, err);
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

    command
        .setFfmpegPath(ffmpegPath)
        .output(instruction.output)
        .on('end', () => console.log('✅ Done processing.'))
        .on('progress', progress => {
            if (progress.percent) {
                console.log(`📊 Progress: ${progress.percent.toFixed(2)}%`);
            } else {
                console.log(`📊 Processing: ${progress.frames} frames processed`);
            }
        })
        .on('error', err => console.error('❌ FFmpeg Error:', err.message))
        .run();
}

module.exports = processVideo;
