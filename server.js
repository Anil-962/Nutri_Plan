import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

app.use(express.json());

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/', (_req, res) => {
    res.status(200).json({ message: 'Service is running' });
});

app.post('/generate-plan', (_req, res) => {
    res.status(200).json({
        success: true,
        generatedPlan: 'Minimal backend is running. Plan generation is temporarily disabled.'
    });
});

app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});
