const ffprobePath = require('ffprobe-static').path;

function parseSpeed(actionParams, fallback = 1) {
    return Number(actionParams.speed ?? actionParams.speedRatio ?? actionParams.factor ?? fallback);
}

function validateSpeed(speed, min, max, actionName) {
    if (Number.isNaN(speed) || speed < min || speed > max) {
        throw new Error(`Invalid speed value for ${actionName}. Supported range is ${min} to ${max}.`);
    }
}

function getVideoMetadata(command) {
    command.setFfprobePath(ffprobePath);
    return new Promise((resolve, reject) => {
        command.ffprobe((err, metadata) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(metadata);
        });
    });
}

function buildATempoChain(speed) {
    const filters = [];
    let remaining = speed;

    while (remaining > 2.0) {
        filters.push('atempo=2.0');
        remaining /= 2.0;
    }

    while (remaining < 0.5) {
        filters.push('atempo=0.5');
        remaining /= 0.5;
    }

    filters.push(`atempo=${remaining.toFixed(5)}`);
    return filters;
}

function applySpeedFilters(command, speed, withMinterpolate, metadata) {
    const videoStreams = metadata?.streams?.filter((stream) => stream.codec_type === 'video') || [];
    const audioStreams = metadata?.streams?.filter((stream) => stream.codec_type === 'audio') || [];
    const videoStream = videoStreams[0] || null;
    const audioStream = audioStreams[0] || null;

    let videoFilters = `setpts=${1 / speed}*PTS`;
    if (withMinterpolate) {
        videoFilters = `minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1,${videoFilters}`;
    }

    command.videoFilters(videoFilters);

    if (audioStream) {
        command.audioFilters(buildATempoChain(speed).join(','));
    } else {
        command.noAudio();
    }

    const outputOptions = [
        '-preset medium',
        '-movflags +faststart'
    ];

    const sourceVideoBitrate = Number(videoStream?.bit_rate || metadata?.format?.bit_rate || 0);
    if (sourceVideoBitrate > 0) {
        outputOptions.push('-b:v', `${Math.round(sourceVideoBitrate / 1000)}k`);
    }

    const sourceAudioBitrate = Number(audioStream?.bit_rate || 0);
    if (sourceAudioBitrate > 0) {
        outputOptions.push('-b:a', `${Math.round(sourceAudioBitrate / 1000)}k`);
    }

    command.outputOptions(outputOptions);
    return command;
}

module.exports = {
    parseSpeed,
    validateSpeed,
    getVideoMetadata,
    applySpeedFilters,
};
