import React, { useState } from 'react';

function ScheduleAzureFunction() {
    const [schedule, setSchedule] = useState('');
    const [status, setStatus] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('Submitting schedule...');

        try {
            const response = await fetch('http://127.0.0.1:5000/schedule-trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedule }),
            });

            if (response.ok) {
                const data = await response.json();
                setStatus(`Schedule set successfully: ${data.message}`);
            } else {
                const error = await response.text();
                setStatus(`Error: ${error}`);
            }
        } catch (err) {
            setStatus(`Error: ${err.message}`);
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>Schedule Azure Function Trigger</h1>
            <form onSubmit={handleSubmit} style={styles.form}>
                <label style={styles.label}>
                    Enter Schedule (Cron Expression):
                    <input
                        type="text"
                        value={schedule}
                        onChange={(e) => setSchedule(e.target.value)}
                        placeholder="e.g., 0 */5 * * * *"
                        required
                        style={styles.input}
                    />
                </label>
                <button type="submit" style={styles.button}>
                    Set Schedule
                </button>
            </form>
            <p style={styles.status}>{status}</p>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '50vh', // Reduced height to shift content upwards
        textAlign: 'center',
        marginTop: '-50px', // Negative margin to move content upwards
    },
    heading: {
        marginBottom: '20px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    label: {
        marginBottom: '10px',
        fontSize: '16px',
    },
    input: {
        marginLeft: '10px',
        padding: '5px',
        width: '300px',
    },
    button: {
        marginTop: '10px',
        padding: '10px 20px',
        fontSize: '16px',
        backgroundColor: '#0078D4',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    status: {
        marginTop: '20px',
        color: 'green',
        fontSize: '16px',
    },
};

export default ScheduleAzureFunction;