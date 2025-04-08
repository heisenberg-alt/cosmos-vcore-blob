#!/bin/bash

# Login to Azure
az login

# Set the subscription
az account set --subscription $SUBSCRIPTION_ID

echo "Logged in to Azure and set the subscription successfully."