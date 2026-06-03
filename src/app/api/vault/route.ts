import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const IS_TEST_MODE = true
const TIMEOUT_DURATION = IS_TEST_MODE ? 60 * 1000 : 24 * 60 * 60 * 1000

// Simple internal helper to validate the secret query token
function validateToken(request: Request) {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    return token && token === process.env.VAULT_ADMIN_TOKEN
}

// GET: Handles the countdown triggering and evaluation lifecycle
export async function GET(request: Request) {
    if (!validateToken(request)) {
        return NextResponse.json(
            { error: 'Unauthorized access profile' },
            { status: 401 }
        )
    }

    try {
        const status = await redis.get<string>('lock_status')
        const releaseTime = await redis.get<number>('release_timestamp')
        const now = Date.now()

        if (!status || status === 'LOCKED') {
            const targetTime = now + TIMEOUT_DURATION
            await redis.set('lock_status', 'COUNTDOWN')
            await redis.set('release_timestamp', targetTime)

            const timeString = IS_TEST_MODE ? '1 minute' : '24 hours'
            return NextResponse.json({
                status: 'COUNTDOWN_INITIATED',
                message: `Timeout sequence activated. The vault is locked down. Set your calendar timer for ${timeString}. Return inside this interface with your token parameter later to capture the plain text.`,
            })
        }

        if (status === 'COUNTDOWN' && now < (releaseTime || 0)) {
            const timeLeft = (releaseTime || 0) - now
            const hoursLeft = (timeLeft / (1000 * 60 * 60)).toFixed(2)
            const secondsLeft = Math.ceil(timeLeft / 1000)

            return NextResponse.json({
                status: 'ACCESS_DENIED',
                details: IS_TEST_MODE
                    ? `Lockout loop active. Remaining time: ${secondsLeft} seconds.`
                    : `Access Denied. Cooling off phase working as intended. Gate clears in ${hoursLeft} hours.`,
            })
        }

        if (status === 'COUNTDOWN' && now >= (releaseTime || 0)) {
            const storedPasscode =
                (await redis.get<string>('screen_time_passcode')) ||
                'NO_PASSCODE_SET'

            await redis.set('lock_status', 'LOCKED')
            await redis.del('release_timestamp')

            return NextResponse.json({
                status: 'VAULT_OPEN',
                passcode: storedPasscode,
                message:
                    'Passcode successfully verified once. System reset to safe LOCKED mode.',
            })
        }

        return NextResponse.json(
            { error: 'Malformed State Matrix' },
            { status: 500 }
        )
    } catch (error) {
        return NextResponse.json(
            { error: 'Database Communication Error' },
            { status: 500 }
        )
    }
}

// POST: Changes the underlying payload and drops states back to base lockdown
export async function POST(request: Request) {
    if (!validateToken(request)) {
        return NextResponse.json(
            { error: 'Unauthorized access profile' },
            { status: 401 }
        )
    }

    try {
        const body = await request.json()
        const { passcode } = body

        if (!passcode || passcode.length !== 4 || isNaN(Number(passcode))) {
            return NextResponse.json(
                { error: 'Invalid payload formatting structure' },
                { status: 400 }
            )
        }

        // Update the record and systematically kill any ongoing cooldowns to lock the gate
        await redis.set('screen_time_passcode', passcode)
        await redis.set('lock_status', 'LOCKED')
        await redis.del('release_timestamp')

        return NextResponse.json({
            status: 'SUCCESS',
            message: 'Passcode recorded successfully.',
        })
    } catch (error) {
        return NextResponse.json(
            { error: 'Database Mutation Failure' },
            { status: 500 }
        )
    }
}
