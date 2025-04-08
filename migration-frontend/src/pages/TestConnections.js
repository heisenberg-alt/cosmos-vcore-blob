import React, { useState } from 'react';

function TestConnections() {
    const [mongoTestResult, setMongoTestResult] = useState('');
    const [blobTestResult, setBlobTestResult] = useState('');

    const mongoConnectionString = localStorage.getItem('mongoConnectionString');
    const blobConnectionString = localStorage.getItem('blobConnectionString');

    const testMongoConnection = async () => {
        try {
            const response = await fetch('http://localhost:5000/test_mongo_connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ connectionString: mongoConnectionString }),
            });

            if (response.ok) {
                const result = await response.json();
                setMongoTestResult(result.message || 'MongoDB connection successful!');
            } else {
                const error = await response.json();
                setMongoTestResult(error.message || 'MongoDB connection failed!');
            }
        } catch (error) {
            setMongoTestResult('An error occurred while testing the MongoDB connection.');
            console.error('Error:', error);
        }
    };

    const testBlobConnection = async () => {
        try {
            const response = await fetch('http://localhost:5000/test_blob_connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ connectionString: blobConnectionString }),
            });

            if (response.ok) {
                const result = await response.json();
                setBlobTestResult(result.message || 'Blob Storage connection successful!');
            } else {
                const error = await response.json();
                setBlobTestResult(error.message || 'Blob Storage connection failed!');
            }
        } catch (error) {
            setBlobTestResult('An error occurred while testing the Blob Storage connection.');
            console.error('Error:', error);
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>Test Connections</h1>
            <p style={styles.description}>
                Test the connection strings for MongoDB vCore and Blob Storage.
            </p>
            <div style={styles.testSection}>
                <button onClick={testMongoConnection} style={styles.button}>
                    Test MongoDB Connection
                </button>
                <p style={styles.result}>{mongoTestResult}</p>
                <button onClick={testBlobConnection} style={styles.button}>
                    Test Blob Storage Connection
                </button>
                <p style={styles.result}>{blobTestResult}</p>
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
        height: '80vh',
        textAlign: 'center',
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
    testSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px',
    },
    button: {
        padding: '10px 20px',
        fontSize: '1rem',
        backgroundColor: '#0078D4',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    result: {
        fontSize: '1rem',
        color: '#333',
        marginTop: '10px',
    },
};

export default TestConnections;