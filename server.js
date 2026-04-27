import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

app.use(express.json());

function logError(context, error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${context}] ${message}`);
}

function sendError(res, status = 500, message = 'Internal server error') {
    return res.status(status).json({ success: false, error: message });
}

app.get('/health', (_req, res) => {
    try {
        return res.status(200).json({ status: 'ok' });
    } catch (error) {
        logError('GET /health', error);
        return sendError(res);
    }
});

app.get('/', (_req, res) => {
    try {
        return res.status(200).json({ message: 'Service is running' });
    } catch (error) {
        logError('GET /', error);
        return sendError(res);
    }
});

app.post('/generate-plan', (req, res) => {
    try {
        const requiredFields = ['age', 'weight', 'height', 'goal', 'diet', 'budget', 'language'];
        const missingFields = requiredFields.filter((field) => {
            const value = req.body?.[field];
            return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
        });

        if (missingFields.length > 0) {
            return sendError(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
        }

        const numericFields = ['age', 'weight', 'budget'];
        const invalidNumericFields = numericFields.filter((field) => {
            const num = Number(req.body[field]);
            return !Number.isFinite(num) || num <= 0;
        });

        if (invalidNumericFields.length > 0) {
            return sendError(res, 400, `Invalid numeric values for: ${invalidNumericFields.join(', ')}`);
        }

        return res.status(200).json({
            success: true,
            generatedPlan: 'Minimal backend is running. Plan generation is temporarily disabled.'
        });
    } catch (error) {
        logError('POST /generate-plan', error);
        return sendError(res);
    }
});

app.use((error, _req, res, _next) => {
    logError('Express middleware', error);
    return sendError(res);
});

app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});
