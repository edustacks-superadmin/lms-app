// Simple in-memory job tracking for Testpress imports
// In production, you'd use Redis or database

// Use global to persist across hot reloads in development
const globalForJobs = global;
if (!globalForJobs.jobs) {
    globalForJobs.jobs = new Map();
}
const jobs = globalForJobs.jobs;

export function createJob(type) {
    const jobId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    jobs.set(jobId, {
        id: jobId,
        type,
        status: 'pending', // pending, running, completed, failed
        progress: {
            current: 0,
            total: 0,
            message: 'Initializing...'
        },
        results: null,
        error: null,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    console.log('Job created:', jobId, 'Total jobs:', jobs.size);
    return jobId;
}

export function getJob(jobId) {
    const job = jobs.get(jobId);
    console.log('Getting job:', jobId, 'Found:', !!job, 'Total jobs:', jobs.size);
    return job;
}

export function updateJob(jobId, updates) {
    const job = jobs.get(jobId);
    if (job) {
        Object.assign(job, updates, { updatedAt: new Date() });
        jobs.set(jobId, job);
    }
    return job;
}

export function updateProgress(jobId, current, total, message) {
    const job = jobs.get(jobId);
    if (job) {
        job.progress = { current, total, message };
        job.updatedAt = new Date();
        jobs.set(jobId, job);
    }
}

export function completeJob(jobId, results) {
    updateJob(jobId, {
        status: 'completed',
        results
    });
}

export function failJob(jobId, error) {
    updateJob(jobId, {
        status: 'failed',
        error: error.message || String(error)
    });
}

// Cleanup old jobs (older than 1 hour)
setInterval(() => {
    const oneHourAgo = Date.now() - 3600000;
    for (const [jobId, job] of jobs.entries()) {
        if (job.createdAt.getTime() < oneHourAgo) {
            jobs.delete(jobId);
        }
    }
}, 600000); // Every 10 minutes
