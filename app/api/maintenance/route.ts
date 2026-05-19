/**
 * Maintenance mode status endpoint.
 *
 * Returns whether the site is in maintenance mode and an optional message.
 * Sam can toggle this by:
 *   1. Setting MAINTENANCE_MODE env var (requires container restart)
 *   2. Creating /tmp/maintenance.json with {"enabled":true,"message":"..."}
 *      (file is checked at runtime, no restart needed)
 */
import { NextResponse } from 'next/server';
import fs from 'fs';

interface MaintenanceStatus {
    enabled: boolean;
    message: string;
}

function readFileStatus(): MaintenanceStatus | null {
    try {
        const raw = fs.readFileSync('/tmp/maintenance.json', 'utf-8');
        const data = JSON.parse(raw);
        if (data && typeof data.enabled === 'boolean') {
            return {
                enabled: data.enabled,
                message: typeof data.message === 'string' ? data.message : '',
            };
        }
    } catch {
        // File doesn't exist or invalid — ignore
    }
    return null;
}

export async function GET(): Promise<NextResponse> {
    // 1. Check file-based toggle first (runtime toggle, no restart needed)
    const fileStatus = readFileStatus();
    if (fileStatus) {
        return NextResponse.json(fileStatus);
    }

    // 2. Fall back to env var (requires container restart)
    const envEnabled = process.env.MAINTENANCE_MODE === 'true' || process.env.MAINTENANCE_MODE === '1';
    if (envEnabled) {
        return NextResponse.json({
            enabled: true,
            message: process.env.MAINTENANCE_MESSAGE || 'Site is undergoing maintenance. Please check back shortly.',
        });
    }

    // 3. Default: not in maintenance
    return NextResponse.json({ enabled: false, message: '' });
}
