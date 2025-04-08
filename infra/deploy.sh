#!/bin/bash

# Variables
RESOURCE_GROUP="myResourceGroup"
LOCATION="eastus"
BICEP_FILE="vcore.bicep"

# Login to Azure
az login

# Set the subscription
az account set --subscription "your-subscription-id"

# Create a resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Deploy the Bicep file
az deployment group create --resource-group $RESOURCE_GROUP --template-file $BICEP_FILE

echo "Deployment completed successfully."