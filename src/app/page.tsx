'use client'

import { useEffect, useState } from 'react'

import { useSearchParams } from 'next/navigation'

export default function VaultDashboard() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token') || ''

    const [vaultStatus, setVaultStatus] = useState<any>(null)
    const [newPasscode, setNewPasscode] = useState('')
    const [uiMessage, setUiMessage] = useState({ text: '', isError: false })
    const [loading, setLoading] = useState(true)

    // Fetch current vault state on load
    const checkVault = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/vault?token=${token}`)
            const data = await res.json()
            setVaultStatus(data)
        } catch (err) {
            setUiMessage({
                text: 'Failed to connect to vault API.',
                isError: true,
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        checkVault()
    }, [token])

    // Handle setting a new passcode
    const handleUpdatePasscode = async (e: React.FormEvent) => {
        e.preventDefault()
        if (
            !newPasscode ||
            newPasscode.length !== 4 ||
            isNaN(Number(newPasscode))
        ) {
            setUiMessage({
                text: 'Passcode must be exactly 4 digits.',
                isError: true,
            })
            return
        }

        try {
            const res = await fetch(`/api/vault?token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode: newPasscode }),
            })

            const data = await res.json()
            if (res.ok) {
                setUiMessage({
                    text: 'Passcode updated successfully! Vault status reset to LOCKED.',
                    isError: false,
                })
                setNewPasscode('')
                checkVault() // Refresh status
            } else {
                setUiMessage({
                    text: data.error || 'Update failed.',
                    isError: true,
                })
            }
        } catch (err) {
            setUiMessage({
                text: 'Network error trying to update passcode.',
                isError: true,
            })
        }
    }

    if (!token) {
        return (
            <div
                style={{
                    padding: '40px',
                    fontFamily: 'sans-serif',
                    textAlign: 'center',
                }}
            >
                <h1 style={{ color: '#d9534f' }}>Access Denied</h1>
                <p>
                    A secure token parameter is required to access this system.
                </p>
            </div>
        )
    }

    return (
        <div
            style={{
                maxWidth: '500px',
                margin: '50px auto',
                padding: '20px',
                fontFamily: 'sans-serif',
                border: '1px solid #ccc',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
        >
            <h2
                style={{
                    textAlign: 'center',
                    borderBottom: '2px solid #333',
                    paddingBottom: '10px',
                }}
            >
                🛡️ Time-Lock Vault Dashboard
            </h2>

            {uiMessage.text && (
                <div
                    style={{
                        padding: '10px',
                        margin: '15px 0',
                        borderRadius: '4px',
                        backgroundColor: uiMessage.isError
                            ? '#f2dede'
                            : '#dff0d8',
                        color: uiMessage.isError ? '#a94442' : '#3c763d',
                    }}
                >
                    {uiMessage.text}
                </div>
            )}

            {loading ? (
                <p style={{ textAlign: 'center' }}>
                    Querying secure database layers...
                </p>
            ) : (
                <div
                    style={{
                        margin: '20px 0',
                        padding: '15px',
                        background: '#f9f9f9',
                        borderRadius: '6px',
                    }}
                >
                    <h3>
                        Vault Status:{' '}
                        <span
                            style={{
                                color:
                                    vaultStatus?.status === 'VAULT_OPEN'
                                        ? '#5cb85c'
                                        : '#f0ad4e',
                            }}
                        >
                            {vaultStatus?.status || 'UNKNOWN'}
                        </span>
                    </h3>
                    <p>
                        {vaultStatus?.message ||
                            vaultStatus?.details ||
                            'No details provided.'}
                    </p>

                    {vaultStatus?.passcode && (
                        <div
                            style={{
                                background: '#333',
                                color: '#fff',
                                padding: '15px',
                                textAlign: 'center',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                borderRadius: '4px',
                                letterSpacing: '5px',
                                margin: '15px 0',
                            }}
                        >
                            {vaultStatus.passcode}
                        </div>
                    )}
                </div>
            )}

            <hr
                style={{
                    margin: '30px 0',
                    border: '0',
                    borderTop: '1px solid #eee',
                }}
            />

            <div
                style={{
                    background: '#fff3cd',
                    border: '1px solid #ffeeba',
                    color: '#856404',
                    padding: '15px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                }}
            >
                <strong>⚠️ CRITICAL WARNING:</strong> Updating the passcode will
                overwrite your existing active configuration in the database and
                immediately force the database state back to{' '}
                <strong>LOCKED</strong>. Ensure you have memorized or properly
                staged your new restriction targets before submitting.
            </div>

            <form
                onSubmit={handleUpdatePasscode}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                }}
            >
                <label style={{ fontWeight: 'bold' }}>
                    Set New 4-Digit Passcode:
                </label>
                <input
                    type="password"
                    maxLength={4}
                    placeholder="e.g. 5829"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    style={{
                        padding: '10px',
                        fontSize: '16px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                    }}
                />
                <button
                    type="submit"
                    style={{
                        padding: '12px',
                        background: '#d9534f',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                    }}
                >
                    Overwrite & Lock Database
                </button>
            </form>
        </div>
    )
}
