import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Settings() {
    const [mongoConnectionString, setMongoConnectionString] = useState('');
    const [blobConnectionString, setBlobConnectionString] = useState('');
    const navigate = useNavigate();

    const validateMongoConnectionString = (connectionString) => {
        // Basic validation for CosmosDB vCore connection string
        return connectionString.startsWith('mongodb://') || connectionString.startsWith('mongodb+srv://');
    };

    const validateBlobConnectionString = (connectionString) => {
        // Basic validation for Azure Blob Storage connection string
        return connectionString.includes('DefaultEndpointsProtocol') &&
               connectionString.includes('AccountName') &&
               connectionString.includes('AccountKey');
    };

    const handleSave = () => {
        // Validate MongoDB connection string
        if (!mongoConnectionString) {
            alert('MongoDB vCore connection string cannot be empty.');
            return;
        }
        if (!validateMongoConnectionString(mongoConnectionString)) {
            alert('Invalid MongoDB vCore connection string format. It should start with "mongodb://" or "mongodb+srv://".');
            return;
        }

        // Validate Blob Storage connection string
        if (!blobConnectionString) {
            alert('Blob Storage connection string cannot be empty.');
            return;
        }
        if (!validateBlobConnectionString(blobConnectionString)) {
            alert('Invalid Blob Storage connection string format. It should include "DefaultEndpointsProtocol", "AccountName", and "AccountKey".');
            return;
        }

        // Save the connection strings (e.g., to localStorage or send to backend)
        localStorage.setItem('mongoConnectionString', mongoConnectionString);
        localStorage.setItem('blobConnectionString', blobConnectionString);
        alert('Connection strings saved successfully!');

        // Navigate to the TestConnections page
        navigate('/test-connections');
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>Settings</h1>
            <p style={styles.description}>
                Configure the connection strings for MongoDB vCore and Blob Storage.
            </p>
            <div style={styles.form}>
                <label style={styles.label}>
                    MongoDB vCore Connection String:
                    <input
                        type="text"
                        value={mongoConnectionString}
                        onChange={(e) => setMongoConnectionString(e.target.value)}
                        placeholder="Enter MongoDB vCore connection string"
                        style={styles.input}
                    />
                </label>
                <label style={styles.label}>
                    Blob Storage Connection String:
                    <input
                        type="text"
                        value={blobConnectionString}
                        onChange={(e) => setBlobConnectionString(e.target.value)}
                        placeholder="Enter Blob Storage connection string"
                        style={styles.input}
                    />
                </label>
                <button onClick={handleSave} style={styles.button}>
                    Save and Test Connections
                </button>
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
    form: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px',
        width: '100%',
        maxWidth: '500px',
    },
    label: {
        fontSize: '1rem',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        color: '#333',
        textAlign: 'left',
        width: '100%',
    },
    input: {
        width: '100%',
        padding: '10px',
        fontSize: '1rem',
        border: '1px solid #ccc',
        borderRadius: '5px',
        marginTop: '5px',
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
};

export default Settings;