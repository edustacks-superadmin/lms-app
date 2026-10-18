import { NextResponse } from 'next/server';
import { getJob } from '../../../../lib/jobTracker';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    console.log('Job status request for:', jobId);

    if (!jobId) {
        return NextResponse.json(
            { error: 'Job ID required' },
            { status: 400 }
        );
    }

    const job = getJob(jobId);

    console.log('Job found:', job ? 'Yes' : 'No', job?.status);

    if (!job) {
        return NextResponse.json(
            { error: 'Job not found', jobId },
            { status: 404 }
        );
    }

    return NextResponse.json(job);
}
