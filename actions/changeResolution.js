

function changeResolution(ffmpeg, actionParams) {
    return ffmpeg
        .videoCodec('libx264')
        .size(`${actionParams.width}x${actionParams.height}`)
}

module.exports = changeResolution;