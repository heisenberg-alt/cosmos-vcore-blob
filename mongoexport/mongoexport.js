const { exec } = require("child_process");
const { BlobServiceClient } = require("@azure/storage-blob");
require("dotenv").config(); // Load environment variables from .env file

// MongoDB and Azure Blob Storage configuration from environment variables
const mongoUri = process.env.MONGO_URI;
const databaseName = process.env.MONGO_DB;
const collectionName = process.env.MONGO_COLLECTION;
const blobStorageConnectionString = process.env.BLOB_STORAGE_CONNECTION_STRING;
const containerName = process.env.CONTAINER_NAME;
const blobName = process.env.BLOB_NAME;

// Function to export MongoDB documents directly to Azure Blob Storage
async function exportMongoToBlob() {
    try {
        // Initialize Azure Blob Storage client
        const blobServiceClient = BlobServiceClient.fromConnectionString(blobStorageConnectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Ensure the container exists
        await containerClient.createIfNotExists();
        console.log(`Container "${containerName}" is ready.`);

        const blobClient = containerClient.getBlockBlobClient(blobName);

        // Construct the mongoexport command
        const command = `mongoexport --uri="${mongoUri}" --db="${databaseName}" --collection="${collectionName}" --jsonArray`;
        console.log("Running command:", command);

        // Execute the mongoexport command
        const childProcess = exec(command, { maxBuffer: 1024 * 1024 * 10 }); // Increase buffer size if needed

        // Upload the output of mongoexport directly to Azure Blob Storage
        const uploadPromise = new Promise((resolve, reject) => {
            childProcess.stdout.on("error", (error) => {
                console.error("Error during mongoexport process:", error);
                reject(error);
            });

            childProcess.on("close", (code) => {
                if (code === 0) {
                    console.log(`Mongoexport process completed successfully.`);
                    resolve();
                } else {
                    reject(new Error(`Mongoexport process exited with code ${code}.`));
                }
            });

            blobClient.uploadStream(childProcess.stdout, 4 * 1024 * 1024, 20, {
                onProgress: (progress) => {
                    console.log(`Uploaded ${progress.loadedBytes} bytes to Azure Blob Storage.`);
                },
            }).then(resolve).catch(reject);
        });

        await uploadPromise;
        console.log(`MongoDB collection exported successfully to blob "${blobName}" in container "${containerName}".`);
    } catch (error) {
        console.error("Error exporting MongoDB collection to Azure Blob Storage:", error);
    }
}

// Run the export function
exportMongoToBlob();