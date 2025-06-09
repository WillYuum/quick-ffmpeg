// actions/trim.js
function trim(command, action) {
    if (!action.startTime || !action.endTime) {
        console.warn('⚠ Missing startTime or endTime for trim action');
        return command;
    }

    command.setStartTime(action.startTime);
    if (action.endTime.trim() !== '') {
        const durationDiff = getDurationDifference(action.startTime, action.endTime);
        if (durationDiff <= 0) {
            console.warn('⚠ Invalid time range: endTime must be after startTime');
            return command;
        }
        command.duration(durationDiff);
    }

    return command;
}

module.exports = trim;




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
