import os
import pymongo
from azure.storage.blob import BlobServiceClient, BlobClient, ContainerClient

# MongoDB connection details
mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection = os.getenv("MONGO_COLLECTION")

# Azure Blob Storage connection details
blob_service_client = BlobServiceClient.from_connection_string(os.getenv("AZURE_STORAGE_CONNECTION_STRING"))
container_name = os.getenv("AZURE_CONTAINER_NAME")
container_client = blob_service_client.get_container_client(container_name)

# Connect to MongoDB
client = pymongo.MongoClient(mongo_uri)
db = client[mongo_db]
collection = db[mongo_collection]

# Function to migrate documents
def migrate_documents():
    documents = collection.find()
    for doc in documents:
        blob_name = f"{doc['_id']}.json"
        blob_client = container_client.get_blob_client(blob_name)
        blob_client.upload_blob(doc)

# Trigger the migration
migrate_documents()