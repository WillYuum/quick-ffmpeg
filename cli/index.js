#!/usr/bin/env node

const systemDialog = require('../utils/system_dialog_prompter');
const {
    getFlag,
    parseInputFiles,
    resolveRecipeContextFromFlags,
    ensureRecipeIsRunnable,
    runRecipeOnInputs,
    listProfiles,
    listActions,
} = require('../services/videoJobs');

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

function getSelectedFilesFromDialog() {
    return new Promise(resolve => {
        systemDialog.getMultipleFiles(files => {
            resolve(files || []);
        });
    });
}

async function runCommand(flags) {
    const resolved = ensureRecipeIsRunnable(resolveRecipeContextFromFlags(flags));

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

    await runRecipeOnInputs(resolved, selectedFiles, {
        onPlan: ({ plan, index, totalCount }) => {
            console.log(`\n=== Processing Video ${index + 1} of ${totalCount} ===`);
            console.log(`Pipeline: ${plan.pipeline}`);
            console.log(`Input: ${plan.input}`);
            console.log(`Output: ${plan.output}`);
        },
        onSuccess: ({ index }) => {
            console.log(`✅ Video ${index + 1} processed successfully.\n`);
        },
        onError: ({ index, error }) => {
            console.log(`❌ Video ${index + 1} failed: ${error}\n`);
        },
    });

    console.log('🎉 All videos processed.');
}

function validateCommand(flags) {
    ensureRecipeIsRunnable(resolveRecipeContextFromFlags(flags));
    console.log('✅ Recipe and actions are valid.');
}

function explainCommand(flags) {
    const resolved = ensureRecipeIsRunnable(resolveRecipeContextFromFlags(flags));
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
        console.log('Available profiles:');
        for (const profileName of listProfiles()) {
            console.log(`- ${profileName}`);
        }
    }

    if (shouldListActions) {
        console.log('Available actions:');
        for (const action of listActions()) {
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
