const fs = require('fs');
const path = require('path');

const binderPath = path.resolve(__dirname, '../data/action_binder.json');

function deepMerge(baseValue, overrideValue) {
    if (!overrideValue || typeof overrideValue !== 'object' || Array.isArray(overrideValue)) {
        return overrideValue !== undefined ? overrideValue : baseValue;
    }

    const baseObject = baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue) ? baseValue : {};
    const merged = { ...baseObject };

    for (const key of Object.keys(overrideValue)) {
        merged[key] = deepMerge(baseObject[key], overrideValue[key]);
    }

    return merged;
}

function readJson(absolutePath) {
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
    }

    return JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
}

function readBinderFile(filePath = binderPath) {
    return readJson(filePath);
}

function getAvailableProfiles(filePath) {
    const binder = readBinderFile(filePath);
    return Object.keys(binder.profiles || {});
}

function resolveProfile(options = {}) {
    const binder = readBinderFile(options.binderFilePath);
    const requestedProfile = options.profile || binder.defaultProfile;

    if (!requestedProfile) {
        throw new Error('No profile was provided and binder defaultProfile is missing.');
    }

    const profileConfig = binder.profiles?.[requestedProfile];
    if (!profileConfig) {
        const available = Object.keys(binder.profiles || {}).join(', ');
        throw new Error(`Unknown profile: ${requestedProfile}. Available profiles: ${available}`);
    }

    const recipePath = path.resolve(profileConfig.recipe);
    const recipe = readJson(recipePath);

    let resolvedRecipe = deepMerge(recipe, profileConfig.overrides || {});

    if (options.environment) {
        const environmentConfig = binder.environments?.[options.environment];
        if (!environmentConfig) {
            throw new Error(`Unknown environment: ${options.environment}`);
        }

        const profileOverride = environmentConfig.profileOverrides?.[requestedProfile] || {};
        const globalOverride = environmentConfig.globalOverrides || {};
        resolvedRecipe = deepMerge(resolvedRecipe, globalOverride);
        resolvedRecipe = deepMerge(resolvedRecipe, profileOverride);
    }

    if (options.cliOverrides) {
        resolvedRecipe = deepMerge(resolvedRecipe, options.cliOverrides);
    }

    return {
        profile: requestedProfile,
        recipePath,
        recipe: resolvedRecipe,
    };
}

module.exports = {
    binderPath,
    deepMerge,
    readBinderFile,
    getAvailableProfiles,
    resolveProfile,
};