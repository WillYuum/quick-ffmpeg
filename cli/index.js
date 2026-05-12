#!/usr/bin/env node

const systemDialog = require('../utils/system_dialog_prompter');
const processVideo = require('../engine/processVideo');
const fs = require('fs');
const path = require('path');
const { binderPath, getAvailableProfiles, readBinderFile, resolveProfile, deepMerge } = require('./binder');
const { validateBinder, validateRecipe } = require('./validator');
const { createActionRegistry } = require('../actions/registry');
const { compilePlan } = require('../engine/planCompiler');

const rawArgs = process.argv.slice(2);

function parseCli(argv) {
    let command = 'run';
    let startIndex = 0;

    if (argv[0] && !argv[0].startsWith('-')) {
        command = argv[0];
        startIndex = 1;
    }

    const flags = {};
    for (let index = startIndex; index < argv.length; index++) {
        const token = argv[index];
        if (!token.startsWith('-')) {
            continue;
        }

        if (token.includes('=')) {
            const [key, value] = token.split('=');
            flags[key] = value;
            continue;
        }

        const next = argv[index + 1];
        if (!next || next.startsWith('-')) {
            flags[token] = true;
            continue;
        }

        flags[token] = next;
        index++;
    }

    return { command, flags };
}

function getFlag(flags, keys, defaultValue = null) {
    for (const key of keys) {
        if (flags[key] !== undefined) {
            return flags[key];
        }
    }
    return defaultValue;
}

function printHelp() {
    console.log('Usage: vidtweak <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  run       Run processing pipeline (default command)');
    console.log('  validate  Validate profile/recipe and action payloads');
    console.log('  list      List profiles or actions');
    console.log('  explain   Show fully resolved recipe data');
    console.log('');
    console.log('Options:');
    console.log('  --bind, -b <name>       Profile name from data/action_binder.json');
    console.log('  --config, -c <path>     Direct recipe JSON path');
    console.log('  --env <name>            Environment override key from binder');
    console.log('  --input <path[,path]>   Skip file dialog and provide input path(s)');
    console.log('  --output-mode <mode>    Output policy override (autoSuffix|fixed)');
    console.log('  --list-bindings         Backward-compatible alias for list profiles');
    console.log('  --help, -h              Show this help');
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

function getSelectedFilesFromDialog() {
    return new Promise(resolve => {
        systemDialog.getMultipleFiles(files => {
            resolve(files || []);
        });
    });
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

function resolveRecipeContext(flags) {
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

async function runCommand(flags) {
    const resolved = resolveRecipeContext(flags);
    validateRecipe(resolved.recipe);
    validateRecipeActions(resolved.recipe);

    const directInputs = parseInputFiles(getFlag(flags, ['--input']));
    const selectedFiles = directInputs.length > 0 ? directInputs : await getSelectedFilesFromDialog();

    if (!selectedFiles || selectedFiles.length === 0) {
        console.log('No files selected.');
        return;
    }

    console.log('Using recipe:', resolved.recipePath || '(resolved from profile data)');
    if (resolved.profile) {
        console.log('Using profile:', resolved.profile);
    }

    for (let index = 0; index < selectedFiles.length; index++) {
        const inputFilePath = selectedFiles[index];
        const plan = compilePlan(resolved.recipe, inputFilePath, index, selectedFiles.length);

        console.log(`\n=== Processing Video ${index + 1} of ${selectedFiles.length} ===`);
        console.log(`Pipeline: ${plan.pipeline}`);
        console.log(`Input: ${plan.input}`);
        console.log(`Output: ${plan.output}`);

        try {
            await processVideo(plan);
            console.log(`✅ Video ${index + 1} processed successfully.\n`);
        } catch (err) {
            console.log(`❌ Video ${index + 1} failed: ${err.message}\n`);
        }
    }

    console.log('🎉 All videos processed.');
}

function validateCommand(flags) {
    const resolved = resolveRecipeContext(flags);
    validateRecipe(resolved.recipe);
    validateRecipeActions(resolved.recipe);
    console.log('✅ Recipe and actions are valid.');
}

function explainCommand(flags) {
    const resolved = resolveRecipeContext(flags);
    validateRecipe(resolved.recipe);
    validateRecipeActions(resolved.recipe);
    console.log(JSON.stringify(resolved, null, 2));
}

function listCommand(flags) {
    const listTarget = getFlag(flags, ['--target', '-t']);
    const listBindingsAlias = getFlag(flags, ['--list-bindings']);
    const shouldListProfiles = listTarget === 'profiles' || listBindingsAlias;
    const shouldListActions = listTarget === 'actions';

    if (!listTarget && !listBindingsAlias) {
        console.log('Use: vidtweak list --target profiles');
        console.log('Use: vidtweak list --target actions');
        return;
    }

    if (shouldListProfiles) {
        const binderData = readBinderFile();
        validateBinder(binderData);
        console.log('Available profiles:');
        for (const profileName of getAvailableProfiles(binderPath)) {
            console.log(`- ${profileName}`);
        }
    }

    if (shouldListActions) {
        const actionRegistry = createActionRegistry();
        console.log('Available actions:');
        for (const action of actionRegistry.listActions()) {
            const aliasesText = action.aliases.length > 0 ? ` aliases: [${action.aliases.join(', ')}]` : '';
            console.log(`- ${action.id}${aliasesText}`);
        }
    }
}

async function main() {
    const { command, flags } = parseCli(rawArgs);
    const wantsHelp = getFlag(flags, ['--help', '-h']);

    if (wantsHelp) {
        printHelp();
        return;
    }

    if (getFlag(flags, ['--list-bindings'])) {
        listCommand({ '--list-bindings': true });
        return;
    }

    if (command === 'list') {
        listCommand(flags);
        return;
    }

    if (command === 'validate') {
        validateCommand(flags);
        return;
    }

    if (command === 'explain') {
        explainCommand(flags);
        return;
    }

    if (command === 'run') {
        await runCommand(flags);
        return;
    }

    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
