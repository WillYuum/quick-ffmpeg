const actions = require('../actions');


function handleUnknownAction(action) {
    console.error(`❌ Unknown action type: ${action.type}`);
    console.error('Available actions:', Object.keys(actions).join(', '));

    return null; // Return null to indicate that this action was not handled
}


module.exports = {
    handleUnknownAction,
};