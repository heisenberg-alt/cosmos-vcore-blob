import React, { useState } from 'react';

function PushApiAzureSearch() {
    const [responseMessage, setResponseMessage] = useState('');
    const [progress, setProgress] = useState(0); // State to track progress percentage

    const handlePushToAzureSearch = async () => {
        try {
            setProgress(0); // Reset progress at the start
            const response = await fetch('http://localhost:5000/push-indexer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                // Simulate progress updates
                for (let i = 1; i <= 100; i++) {
                    await new Promise((resolve) => setTimeout(resolve, 20)); // Simulate delay
                    setProgress(i); // Update progress percentage
                }

                const result = await response.json();
                setResponseMessage(result.message || 'Documents successfully pushed to Azure AI Search!');
            } else {
                const error = await response.json();
                setResponseMessage(error.error || 'Failed to push documents to Azure AI Search.');
            }
        } catch (error) {
            setResponseMessage('An error occurred while pushing documents to Azure AI Search.');
            console.error('Error:', error);
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>Push API - Azure AI Search</h1>
            <p style={styles.description}>
                Create Indexes from vCore documents in Azure AI Search using the push API.
            </p>
            <button onClick={handlePushToAzureSearch} style={styles.button}>
                Push to Azure AI Search
            </button>
            <div style={styles.progressBarContainer}>
                <div style={{ ...styles.progressBar, width: `${progress}%` }}></div>
            </div>
            <p style={styles.progressText}>{progress}%</p>
            {responseMessage && <p style={styles.response}>{responseMessage}</p>}
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
        fontSize: '2rem',
        marginBottom: '20px',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        color: '#333',
    },
    description: {
        fontSize: '1.2rem',
        lineHeight: '1.8',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        color: '#555',
        marginBottom: '20px',
    },
    button: {
        padding: '10px 20px',
        fontSize: '1rem',
        backgroundColor: '#0078D4',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        marginTop: '20px',
    },
    progressBarContainer: {
        width: '80%',
        height: '20px',
        backgroundColor: '#e0e0e0',
        borderRadius: '10px',
        overflow: 'hidden',
        marginTop: '20px',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#0078D4',
        transition: 'width 0.2s ease',
    },
    progressText: {
        marginTop: '10px',
        fontSize: '1rem',
        color: '#333',
    },
    response: {
        marginTop: '20px',
        fontSize: '1rem',
        color: '#333',
    },
};

export default PushApiAzureSearch;