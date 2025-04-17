#!/bin/bash

# Function to display usage and exit
show_usage() {
    echo "Usage: $0"
    echo ""
    echo "The script will prompt for the necessary parameters."
    exit 1
}

# Function to prompt for input with validation
prompt_for_input() {
    local prompt_message=$1
    local validation_message=$2
    local validation_func=$3
    local input=""
    
    while true; do
        read -p "$prompt_message: " input
        
        if [[ -z "$input" ]]; then
            echo "Error: Value cannot be empty."
            continue
        fi
        
        if [[ -n "$validation_func" ]] && ! $validation_func "$input"; then
            echo "Error: $validation_message"
            continue
        fi
        
        echo "$input"
        break
    done
}

# Password validation function
validate_password() {
    local password=$1
    if [ ${#password} -lt 8 ]; then
        return 1
    fi
    return 0
}

echo "=== Azure Cosmos DB MongoDB vCore Cluster Deployment ==="
echo ""

# Login to Azure
echo "Logging in to Azure..."
az login
#az resource show --ids "/subscriptions/<sub id>/resourceGroups/<resource group name>/providers/Microsoft.DocumentDB/mongoClusters/<resource name of your Cosmos DB for MongoDB vCore cluster>" --api-version 2024-10-01-preview
#az resource patch --ids "/subscriptions/<subscription_id>/resourceGroups/<resource_group_name>/providers/Microsoft.DocumentDB/mongoClusters/<vCore_cluster_name>" --api-version 2024-10-01-preview --properties "{\"previewFeatures\": [ \"ChangeStreams\"]}"

# Get subscriptions directly as separate arrays for name and id
echo "Getting available subscriptions..."
mapfile -t SUB_NAMES < <(az account list --query "[].name" -o tsv)
mapfile -t SUB_IDS < <(az account list --query "[].id" -o tsv)

if [ ${#SUB_IDS[@]} -eq 0 ]; then
    echo "Error: No subscriptions found. Please check your Azure account."
    exit 1
fi

echo "Available subscriptions:"
echo ""

# Display subscriptions with index numbers
for i in "${!SUB_IDS[@]}"; do
    echo "[$i] ${SUB_NAMES[$i]} (${SUB_IDS[$i]})"
done

echo ""

# Ask user to select subscription by number
while true; do
    read -p "Please enter the number of the subscription you want to use: " SUB_INDEX
    
    # Validate input is a number
    if ! [[ "$SUB_INDEX" =~ ^[0-9]+$ ]]; then
        echo "Please enter a valid number."
        continue
    fi
    
    # Validate input is in range
    if [ "$SUB_INDEX" -lt 0 ] || [ "$SUB_INDEX" -ge ${#SUB_IDS[@]} ]; then
        echo "Please enter a number between 0 and $((${#SUB_IDS[@]} - 1))."
        continue
    fi
    
    break
done

# Get the selected subscription
CURRENT_SUB_NAME="${SUB_NAMES[$SUB_INDEX]}"
CURRENT_SUBSCRIPTION="${SUB_IDS[$SUB_INDEX]}"

echo "Selected subscription: $CURRENT_SUB_NAME ($CURRENT_SUBSCRIPTION)"

# Set subscription context
echo "Setting subscription context..."
if ! az account set --subscription "$CURRENT_SUBSCRIPTION"; then
    echo "Error: Could not set subscription. Please verify the subscription ID is correct."
    exit 1
fi

# Register resource providers
echo "Registering necessary resource providers..."
az provider register --namespace Microsoft.DocumentDB --subscription "$CURRENT_SUBSCRIPTION"
az provider register --namespace Microsoft.Resources --subscription "$CURRENT_SUBSCRIPTION"

# Prompt for all parameters
echo ""
echo "Please provide the following parameters:"
echo ""

RESOURCE_GROUP=$(prompt_for_input "Resource Group name" "" "")
LOCATION=$(prompt_for_input "Location (e.g., eastus, westeurope)" "" "")
CLUSTER_NAME=$(prompt_for_input "Cluster name" "" "")
ADMIN_USERNAME=$(prompt_for_input "Admin username" "" "")
ADMIN_PASSWORD=$(prompt_for_input "Admin password (minimum 8 characters)" "Password must be at least 8 characters long" validate_password)

# Confirm parameters
echo ""
echo "Deployment Parameters:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Subscription:   $CURRENT_SUB_NAME ($CURRENT_SUBSCRIPTION)"
echo "  Location:       $LOCATION"
echo "  Cluster Name:   $CLUSTER_NAME"
echo "  Admin Username: $ADMIN_USERNAME"
echo "  Admin Password: ********"
echo ""

read -p "Proceed with deployment? (y/n): " CONFIRMATION
if [[ ! "$CONFIRMATION" =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Create resource group
echo "Creating resource group $RESOURCE_GROUP in $LOCATION..."
if ! az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --subscription "$CURRENT_SUBSCRIPTION"; then
    echo "Error: Failed to create resource group."
    exit 1
fi

# List resource groups to confirm
echo "Listing resource groups in subscription $CURRENT_SUBSCRIPTION:"
az group list --subscription "$CURRENT_SUBSCRIPTION" --query "[].name" -o tsv

# Deploy the Bicep template
echo "Deploying Bicep template..."
if ! az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --subscription "$CURRENT_SUBSCRIPTION" \
    --template-file ./vcore.bicep \
    --parameters \
        clusterName="$CLUSTER_NAME" \
        location="$LOCATION" \
        adminUsername="$ADMIN_USERNAME" \
        adminPassword="$ADMIN_PASSWORD" \
        subscriptionId="$CURRENT_SUBSCRIPTION"; then
    
    echo "Error: Deployment failed."
    
    # Try to validate the template separately
    echo "Validating template..."
    az deployment group validate \
        --resource-group "$RESOURCE_GROUP" \
        --subscription "$CURRENT_SUBSCRIPTION" \
        --template-file ./vcore.bicep \
        --parameters \
            clusterName="$CLUSTER_NAME" \
            location="$LOCATION" \
            adminUsername="$ADMIN_USERNAME" \
            adminPassword="$ADMIN_PASSWORD" \
            subscriptionId="$CURRENT_SUBSCRIPTION"
    
    exit 1
fi

echo "Deployment completed successfully."