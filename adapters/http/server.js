const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const {
    buildTrimRecipe,
    ensureRecipeIsRunnable,
    runRecipeOnInputs,
    listActions,
    listProfiles,
    resolveRecipeContextFromFlags,
} = require('../../services/videoJobs');

const app = express();
const port = Number(process.env.VIDTWEAK_PORT || 5050);
const outputDir = path.resolve(process.env.VIDTWEAK_OUTPUT_DIR || './output');
const uploadDir = path.join(outputDir, '_uploads');
const jobs = new Map();

fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, callback) => callback(null, uploadDir),
        filename: (req, file, callback) => {
            const ext = path.extname(file.originalname || '.mp4') || '.mp4';
            const safeBase = (path.basename(file.originalname || 'video', ext) || 'video').replace(/[^a-zA-Z0-9_-]/g, '_');
            callback(null, `${Date.now()}_${safeBase}${ext}`);
        },
    }),
});

function toTimecode(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const totalSeconds = Math.max(value, 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
    }

    if (typeof value === 'string' && value.trim() !== '') {
        return value.trim();
    }

    throw new Error('startTime/endTime is required');
}

function cleanupFile(filePath) {
    if (!filePath) {
        return;
    }

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.warn(`Failed to clean up temp file: ${filePath}. ${error.message}`);
    }
}

function sanitizeOutputName(fileName, fallbackExt) {
    const ext = path.extname(fileName || '') || fallbackExt || '.mp4';
    const baseName = path.basename(fileName || `output_${Date.now()}`, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${baseName}${ext}`;
}

function getJob(jobId) {
    return jobs.get(jobId);
}

function streamEvent(response, event, payload) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function appendJobEvent(job, event, payload) {
    const record = {
        event,
        payload,
        at: new Date().toISOString(),
    };

    job.events.push(record);
    if (job.events.length > 200) {
        job.events.shift();
    }

    for (const client of job.clients) {
        streamEvent(client, event, payload);
    }
}

function createJobRecord(type, meta = {}) {
    const id = crypto.randomUUID();
    const record = {
        id,
        type,
        status: 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        meta,
        results: [],
        events: [],
        clients: new Set(),
        error: null,
    };

    jobs.set(id, record);
    return record;
}

function serializeJob(job) {
    return {
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        meta: job.meta,
        results: job.results,
        error: job.error,
    };
}

function parseJsonField(value, label) {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        throw new Error(`Invalid JSON for ${label}`);
    }
}

function resolveRecipeForRunRequest(body = {}, uploadedFiles = []) {
    const recipeFromRequest = parseJsonField(body.recipe, 'recipe');
    if (recipeFromRequest) {
        return ensureRecipeIsRunnable({
            recipePath: null,
            profile: 'api-custom',
            recipe: recipeFromRequest,
        });
    }

    const actions = parseJsonField(body.actions, 'actions');
    if (actions) {
        if (!Array.isArray(actions) || actions.length === 0) {
            throw new Error('actions must be a non-empty JSON array');
        }

        const firstUpload = uploadedFiles[0];
        const fallbackExt = firstUpload ? (path.extname(firstUpload.originalname) || '.mp4') : '.mp4';
        const outputName = sanitizeOutputName(body.outputName, fallbackExt);

        const recipe = {
            version: 1,
            pipeline: body.pipeline || 'api.jobs.v1',
            output: path.resolve(outputDir, outputName),
            outputPolicy: {
                mode: body.outputMode || 'autoSuffix',
            },
            actions,
        };

        return ensureRecipeIsRunnable({
            recipePath: null,
            profile: 'api-actions',
            recipe,
        });
    }

    const profile = body.profile || body.bind;
    if (profile) {
        const flags = {
            '--bind': profile,
        };

        if (body.env) {
            flags['--env'] = body.env;
        }
        if (body.outputMode) {
            flags['--output-mode'] = body.outputMode;
        }

        return ensureRecipeIsRunnable(resolveRecipeContextFromFlags(flags));
    }

    throw new Error('Missing run config. Provide recipe JSON, actions JSON, or profile.');
}

function collectInputFiles(body = {}, uploadedFiles = []) {
    const uploadPaths = uploadedFiles.map(file => path.resolve(file.path));
    if (uploadPaths.length > 0) {
        return uploadPaths;
    }

    const inputPaths = parseJsonField(body.inputPaths, 'inputPaths');
    if (inputPaths) {
        if (!Array.isArray(inputPaths) || inputPaths.length === 0) {
            throw new Error('inputPaths must be a non-empty JSON array');
        }

        return inputPaths.map(item => path.resolve(String(item)));
    }

    throw new Error('No inputs provided. Upload videos or pass inputPaths JSON array.');
}

function cleanupFiles(paths) {
    for (const filePath of paths || []) {
        cleanupFile(filePath);
    }
}

function startBackgroundJob(job, resolved, inputFiles, cleanupPaths = []) {
    job.status = 'running';
    job.updatedAt = new Date().toISOString();
    appendJobEvent(job, 'status', { status: job.status });

    runRecipeOnInputs(resolved, inputFiles, {
        onPlan: ({ plan, index, totalCount }) => {
            appendJobEvent(job, 'plan', {
                index,
                totalCount,
                input: plan.input,
                output: plan.output,
                pipeline: plan.pipeline,
            });
        },
        onProgress: ({ progress, index, totalCount }) => {
            appendJobEvent(job, 'progress', {
                index,
                totalCount,
                percent: typeof progress.percent === 'number' ? Number(progress.percent.toFixed(2)) : null,
                frames: progress.frames || null,
            });
        },
        onSuccess: ({ index, input, output }) => {
            appendJobEvent(job, 'file-complete', {
                index,
                input,
                output,
            });
        },
        onError: ({ index, input, error }) => {
            appendJobEvent(job, 'file-error', {
                index,
                input,
                error,
            });
        },
    })
        .then(results => {
            job.results = results;
            const failed = results.filter(item => !item.ok);
            job.status = failed.length > 0 ? 'failed' : 'completed';
            job.updatedAt = new Date().toISOString();
            appendJobEvent(job, 'completed', {
                status: job.status,
                failed: failed.length,
                total: results.length,
                results,
            });
        })
        .catch(error => {
            job.status = 'failed';
            job.error = error.message;
            job.updatedAt = new Date().toISOString();
            appendJobEvent(job, 'error', {
                error: error.message,
            });
        })
        .finally(() => {
            cleanupFiles(cleanupPaths);

            for (const client of job.clients) {
                streamEvent(client, 'end', { status: job.status });
                client.end();
            }
            job.clients.clear();
        });
}

app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'quick-ffmpeg-http-adapter' });
});

app.get('/api/actions', (req, res) => {
    res.json({ actions: listActions() });
});

app.get('/api/profiles', (req, res) => {
    res.json({ profiles: listProfiles() });
});

app.get('/api/jobs/:jobId', (req, res) => {
    const job = getJob(req.params.jobId);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }

    res.json({ job: serializeJob(job) });
});

app.get('/api/jobs/:jobId/stream', (req, res) => {
    const job = getJob(req.params.jobId);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    streamEvent(res, 'snapshot', {
        job: serializeJob(job),
    });

    for (const event of job.events) {
        streamEvent(res, event.event, event.payload);
    }

    if (job.status === 'completed' || job.status === 'failed') {
        streamEvent(res, 'end', { status: job.status });
        res.end();
        return;
    }

    job.clients.add(res);
    req.on('close', () => {
        job.clients.delete(res);
    });
});

app.post('/api/jobs/run', upload.array('videos'), (req, res) => {
    try {
        const uploadedFiles = req.files || [];
        const inputFiles = collectInputFiles(req.body, uploadedFiles);
        const resolved = resolveRecipeForRunRequest(req.body, uploadedFiles);

        const job = createJobRecord('run', {
            profile: resolved.profile || null,
            recipePath: resolved.recipePath || null,
            inputCount: inputFiles.length,
        });

        startBackgroundJob(job, resolved, inputFiles, uploadedFiles.map(file => path.resolve(file.path)));

        res.status(202).json({
            ok: true,
            jobId: job.id,
            statusUrl: `/api/jobs/${job.id}`,
            streamUrl: `/api/jobs/${job.id}/stream`,
        });
    } catch (error) {
        cleanupFiles((req.files || []).map(file => path.resolve(file.path)));
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/trim', upload.single('video'), (req, res) => {
    let inputFilePath = null;
    try {
        if (!req.file?.path) {
            res.status(400).json({ error: 'Missing video file. Expected multipart field: video' });
            return;
        }

        inputFilePath = path.resolve(req.file.path);
        const startTime = toTimecode(Number(req.body.startTime));
        const endTime = toTimecode(Number(req.body.endTime));

        const outputName = req.body.outputName && String(req.body.outputName).trim() !== ''
            ? sanitizeOutputName(String(req.body.outputName).trim(), path.extname(req.file.originalname || '.mp4') || '.mp4')
            : `trimmed_${Date.now()}${path.extname(req.file.originalname || '.mp4') || '.mp4'}`;

        const outputPath = path.resolve(outputDir, outputName);
        const resolved = ensureRecipeIsRunnable({
            recipePath: null,
            profile: 'api-trim',
            recipe: buildTrimRecipe(startTime, endTime, outputPath),
        });

        const job = createJobRecord('trim', {
            inputCount: 1,
            output: outputPath,
        });

        startBackgroundJob(job, resolved, [inputFilePath], [inputFilePath]);

        res.status(202).json({
            ok: true,
            jobId: job.id,
            statusUrl: `/api/jobs/${job.id}`,
            streamUrl: `/api/jobs/${job.id}/stream`,
        });
    } catch (error) {
        cleanupFile(inputFilePath);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/outputs', (req, res) => {
    const files = fs.readdirSync(outputDir, { withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .filter(name => !name.startsWith('_uploads'))
        .map(name => ({
            name,
            size: fs.statSync(path.join(outputDir, name)).size,
            url: `/api/outputs/${encodeURIComponent(name)}`,
        }));

    res.json({ files });
});

app.get('/api/outputs/:fileName', (req, res) => {
    const rawName = req.params.fileName;
    const safeName = path.basename(rawName);
    if (rawName !== safeName) {
        res.status(400).json({ error: 'Invalid output file name' });
        return;
    }

    const filePath = path.resolve(outputDir, safeName);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Output not found' });
        return;
    }

    res.download(filePath, safeName);
});

app.listen(port, () => {
    console.log(`quick-ffmpeg HTTP adapter listening on http://localhost:${port}`);
});
