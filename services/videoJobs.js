const fs = require('fs');
const path = require('path');

const processVideo = require('../engine/processVideo');
const { compilePlan } = require('../engine/planCompiler');
const { binderPath, getAvailableProfiles, readBinderFile, resolveProfile, deepMerge } = require('../cli/binder');
const { validateBinder, validateRecipe } = require('../cli/validator');
const { createActionRegistry } = require('../actions/registry');

function getFlag(flags, keys, defaultValue = null) {
    for (const key of keys) {
        if (flags[key] !== undefined) {
            return flags[key];
        }
    }
    return defaultValue;
}

function parseInputFiles(inputArg) {
    if (!inputArg) {
        return [];
    }

    const paths = String(inputArg)
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => path.resolve(item));

    const missing = paths.filter(item => !fs.existsSync(item));
    if (missing.length > 0) {
        throw new Error(`Input file(s) not found: ${missing.join(', ')}`);
    }

    return paths;
}

function readRecipeFromPath(recipePath) {
    const fullPath = path.resolve(recipePath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Recipe file not found: ${fullPath}`);
    }

    return {
        recipePath: fullPath,
        recipe: JSON.parse(fs.readFileSync(fullPath, 'utf-8')),
        profile: null,
    };
}

function resolveRecipeContextFromFlags(flags = {}) {
    const outputMode = getFlag(flags, ['--output-mode']);
    const cliOverrides = outputMode ? { outputPolicy: { mode: outputMode } } : null;

    const directConfigPath = getFlag(flags, ['--config', '-c']);
    if (directConfigPath) {
        const resolved = readRecipeFromPath(directConfigPath);
        return {
            ...resolved,
            recipe: cliOverrides ? deepMerge(resolved.recipe, cliOverrides) : resolved.recipe,
        };
    }

    const binderData = readBinderFile();
    validateBinder(binderData);

    const profile = getFlag(flags, ['--bind', '-b', '--profile']);
    const environment = getFlag(flags, ['--env']);

    return resolveProfile({
        profile,
        environment,
        cliOverrides,
    });
}

function validateRecipeActions(recipe) {
    const actionRegistry = createActionRegistry();
    for (const action of recipe.actions || []) {
        actionRegistry.validateAction(action);
    }
}

function ensureRecipeIsRunnable(resolved) {
    validateRecipe(resolved.recipe);
    validateRecipeActions(resolved.recipe);
    return resolved;
}

async function runRecipeOnInputs(resolved, inputFiles, callbacks = {}) {
    const results = [];
    const totalCount = inputFiles.length;

    for (let index = 0; index < totalCount; index++) {
        const inputFilePath = inputFiles[index];
        const plan = compilePlan(resolved.recipe, inputFilePath, index, totalCount);

        callbacks.onPlan?.({ plan, index, totalCount, resolved });

        try {
            await processVideo({
                ...plan,
                onProgress: (progress) => {
                    callbacks.onProgress?.({
                        progress,
                        plan,
                        index,
                        totalCount,
                    });
                },
            });
            const result = {
                index,
                input: plan.input,
                output: plan.output,
                ok: true,
            };
            callbacks.onSuccess?.(result);
            results.push(result);
        } catch (error) {
            const result = {
                index,
                input: plan.input,
                output: plan.output,
                ok: false,
                error: error.message,
            };
            callbacks.onError?.(result, error);
            results.push(result);
        }
    }

    return results;
}

function buildTrimRecipe(startTime, endTime, outputPath) {
    return {
        version: 1,
        pipeline: 'trim.api.v1',
        output: path.resolve(outputPath),
        outputPolicy: {
            mode: 'fixed',
        },
        actions: [
            {
                type: 'trim',
                startTime,
                endTime,
            },
        ],
    };
}

function listProfiles() {
    const binderData = readBinderFile();
    validateBinder(binderData);
    return getAvailableProfiles(binderPath);
}

function listActions() {
    const actionRegistry = createActionRegistry();
    return actionRegistry.listActions();
}

module.exports = {
    binderPath,
    getFlag,
    parseInputFiles,
    resolveRecipeContextFromFlags,
    ensureRecipeIsRunnable,
    runRecipeOnInputs,
    buildTrimRecipe,
    listProfiles,
    listActions,
};
