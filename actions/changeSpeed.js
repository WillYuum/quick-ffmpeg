const {
    parseSpeed,
    validateSpeed,
    getVideoMetadata,
    applySpeedFilters,
} = require('./speedUtils');

async function changeSpeed(command, actionParams) {
    const speed = parseSpeed(actionParams, 1);
    validateSpeed(speed, 0.25, 10, 'changeSpeed');

    try {
        const metadata = await getVideoMetadata(command);
        return applySpeedFilters(command, speed, Boolean(actionParams.with_minterpolate), metadata);
    } catch (err) {
        console.error('Error applying changeSpeed:', err.message);
        throw err;
    }
}

module.exports = changeSpeed;
