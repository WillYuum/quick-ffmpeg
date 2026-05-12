const { createActionRegistry } = require('../actions/registry');


function handleUnknownAction(action) {
    const actionRegistry = createActionRegistry();
    const availableActions = actionRegistry.listActions().map(item => item.id);

    console.error(`❌ Unknown action type: ${action.type}`);
    console.error('Available actions:', availableActions.join(', '));

    return null; // Return null to indicate that this action was not handled
}


module.exports = {
    handleUnknownAction,
};