const {
    parseSpeed,
    validateSpeed,
    getVideoMetadata,
    applySpeedFilters,
} = require('./speedUtils');

async function slowMotion(command, actionParams) {
    const speed = parseSpeed(actionParams, 0.5);
    validateSpeed(speed, 0.25, 1, 'slowMotion');

    try {
        const metadata = await getVideoMetadata(command);
        return applySpeedFilters(command, speed, Boolean(actionParams.with_minterpolate), metadata);
    } catch (err) {
        console.error('Error applying slowMotion:', err.message);
        throw err;
    }
}

module.exports = slowMotion;
