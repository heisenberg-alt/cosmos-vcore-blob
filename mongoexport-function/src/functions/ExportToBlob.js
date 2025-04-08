const { app } = require('@azure/functions');
const { exec } = require("child_process");
const { BlobServiceClient } = require("@azure/storage-blob");
require("dotenv").config(); // Load environment variables from .env file

// MongoDB and Azure Blob Storage configuration from environment variables
const mongoUri = process.env.MONGO_URI;
const databaseName = process.env.DATABASE_NAME || "blob-test";
const collectionName = process.env.COLLECTION_NAME || "mycollection";
const blobStorageConnectionString = process.env.BLOB_STORAGE_CONNECTION_STRING;
const containerName = process.env.CONTAINER_NAME || "mongo-exports";
const blobName = process.env.BLOB_NAME || "export.json";

// Function to export MongoDB documents directly to Azure Blob Storage
async function exportMongoToBlob(context) {
    try {
        // Initialize Azure Blob Storage client
        const blobServiceClient = BlobServiceClient.fromConnectionString(blobStorageConnectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Ensure the container exists
        await containerClient.createIfNotExists();
        context.log(`Container "${containerName}" is ready.`);

        const blobClient = containerClient.getBlockBlobClient(blobName);

        // Construct the mongoexport command
        const command = `mongoexport --uri="${mongoUri}" --db="${databaseName}" --collection="${collectionName}" --jsonArray`;
        context.log("Running command:", command);

        // Execute the mongoexport command
        const childProcess = exec(command, { maxBuffer: 1024 * 1024 * 10 }); // Increase buffer size if needed

        // Upload the output of mongoexport directly to Azure Blob Storage
        const uploadPromise = new Promise((resolve, reject) => {
            childProcess.stdout.on("error", (error) => {
                context.log("Error during mongoexport process:", error);
                reject(error);
            });

            childProcess.on("close", (code) => {
                if (code === 0) {
                    context.log(`Mongoexport process completed successfully.`);
                    resolve();
                } else {
                    reject(new Error(`Mongoexport process exited with code ${code}.`));
                }
            });

            blobClient.uploadStream(childProcess.stdout, 4 * 1024 * 1024, 20, {
                onProgress: (progress) => {
                    context.log(`Uploaded ${progress.loadedBytes} bytes to Azure Blob Storage.`);
                },
            }).then(resolve).catch(reject);
        });

        await uploadPromise;
        context.log(`MongoDB collection exported successfully to blob "${blobName}" in container "${containerName}".`);
    } catch (error) {
        context.log("Error exporting MongoDB collection to Azure Blob Storage:", error);
        throw error;
    }
}

// Azure Function HTTP trigger handler
app.http('ExportToBlob', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`HTTP function processed request for URL "${request.url}"`);

        try {
            await exportMongoToBlob(context);
            return { status: 200, body: "Export and upload completed successfully." };
        } catch (error) {
            return { status: 500, body: `Error during export and upload process: ${error.message}` };
        }
    }
});
