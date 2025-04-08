import React, { useState } from 'react';

function ExportToBlobStorage() {
    const [status, setStatus] = useState(''); // To display the current status
    const [loading, setLoading] = useState(false); // To disable buttons during operations
    const [showPauseResume, setShowPauseResume] = useState(false); // To toggle Pause/Resume buttons

    const backendUrl = 'http://127.0.0.1:5000'; // Backend URL

    // Function to start migration
    const startMigration = () => {
        setLoading(true);
        setStatus('Starting export...');
        setShowPauseResume(true); // Show Pause/Resume buttons

        const eventSource = new EventSource(`${backendUrl}/start-migration`); // Connect to the SSE endpoint

        eventSource.onmessage = (event) => {
            setStatus(event.data); // Update the current status
            if (event.data === 'Migration completed successfully.') {
                setLoading(false);
                setShowPauseResume(false); // Hide Pause/Resume buttons when export is complete
                eventSource.close(); // Close the connection when export is complete
            }
        };

        eventSource.onerror = () => {
            setStatus('An error occurred.');
            setLoading(false);
            setShowPauseResume(false); // Hide Pause/Resume buttons on error
            eventSource.close();
        };
    };

    // Function to pause migration
    const pauseMigration = async () => {
        setStatus('Pausing export...');
        try {
            const response = await fetch(`${backendUrl}/pause-migration`, { method: 'POST' });
            const data = await response.json();
            setStatus(data.message);
        } catch (error) {
            setStatus('An error occurred while pausing the export.');
        }
    };

    // Function to resume migration
    const resumeMigration = async () => {
        setStatus('Resuming export...');
        try {
            const response = await fetch(`${backendUrl}/resume-migration`, { method: 'POST' });
            const data = await response.json();
            setStatus(data.message);
        } catch (error) {
            setStatus('An error occurred while resuming the export.');
        }
    };

    // Function to delete all blobs
    const deleteBlobs = async () => {
        setLoading(true);
        setStatus('Deleting all blobs...');
        try {
            const response = await fetch(`${backendUrl}/delete-blobs`, { method: 'POST' });
            const data = await response.json();
            setStatus(data.message);
        } catch (error) {
            setStatus('An error occurred while deleting blobs.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>Export to Blob Storage</h1>
            <p style={styles.description}>Use the buttons below to export data to Blob Storage or delete blobs.</p>

            {/* Conditionally render Export/Delete or Pause/Resume buttons */}
            {!showPauseResume ? (
                <div style={styles.buttonContainer}>
                    <button
                        onClick={startMigration}
                        disabled={loading}
                        style={styles.buttonGreen}
                    >
                        {loading ? 'Exporting...' : 'Export'}
                    </button>
                    <button
                        onClick={deleteBlobs}
                        disabled={loading}
                        style={styles.buttonRed}
                    >
                        {loading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            ) : (
                <div style={styles.pauseResumeContainer}>
                    <button
                        onClick={pauseMigration}
                        style={styles.buttonYellow}
                    >
                        Pause
                    </button>
                    <button
                        onClick={resumeMigration}
                        style={styles.buttonBlue}
                    >
                        Resume
                    </button>
                </div>
            )}

            {/* Display current status */}
            <div style={styles.statusContainer}>
                <p>{status}</p>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '50vh', // Center vertically
        textAlign: 'center',
        marginTop: '-50px', 
    },
    heading: {
        marginBottom: '20px',
    },
    description: {
        marginBottom: '20px',
        fontSize: '16px',
        color: '#555',
    },
    buttonContainer: {
        display: 'flex',
        gap: '10px', // Space between buttons
    },
    pauseResumeContainer: {
        display: 'flex',
        gap: '10px', // Space between Pause and Resume buttons
        marginTop: '20px',
    },
    buttonGreen: {
        padding: '10px 20px',
        fontSize: '16px',
        backgroundColor: '#5cb85c',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    buttonRed: {
        padding: '10px 20px',
        fontSize: '16px',
        backgroundColor: '#d9534f',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    buttonYellow: {
        padding: '10px 20px',
        fontSize: '16px',
        backgroundColor: '#f0ad4e',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    buttonBlue: {
        padding: '10px 20px',
        fontSize: '16px',
        backgroundColor: '#0275d8',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    statusContainer: {
        marginTop: '20px',
        fontSize: '18px',
        color: '#333',
    },
};

export default ExportToBlobStorage;