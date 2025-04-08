import React from 'react';

function ChangeStreamBlobStorage() {
    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>Change Stream (Blob Storage)</h1>
            <p style={styles.description}>
                This is the page for managing change streams in Blob Storage.
            </p>
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
    },
};

export default ChangeStreamBlobStorage;