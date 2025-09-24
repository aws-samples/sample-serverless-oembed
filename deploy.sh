#!/bin/bash

# Serverless oEmbed Provider - Deployment Helper Script
# Usage: ./deploy.sh [environment] [options]
# Example: ./deploy.sh dev --guided --stack-name my-custom-stack
# Example: ./deploy.sh prod --stack-name production-oembed
# Environment variable: STACK_NAME=my-stack ./deploy.sh dev

set -e

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Unicode symbols
CHECK_MARK="✅"
CROSS_MARK="❌"
ROCKET="🚀"
GEAR="⚙️"
PACKAGE="📦"
CLOUD="☁️"
SPARKLES="✨"

# Pretty print functions
print_header() {
    echo -e "\n${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${WHITE}                 Serverless oEmbed Provider                   ${PURPLE}║${NC}"
    echo -e "${PURPLE}║${WHITE}                    Deployment Script                        ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}\n"
}

print_step() {
    echo -e "${CYAN}${GEAR} $1${NC}"
}

print_success() {
    echo -e "${GREEN}${CHECK_MARK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS_MARK} $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_separator() {
    echo -e "${PURPLE}────────────────────────────────────────────────────────────────${NC}"
}

# Parse arguments with proper flag handling
ENVIRONMENT="dev"
GUIDED_FLAG=""
STACK_NAME_PARAM=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --guided)
            GUIDED_FLAG="--guided"
            shift
            ;;
        --stack-name)
            if [[ -n "$2" && "$2" != --* ]]; then
                STACK_NAME_PARAM="$2"
                shift 2
            else
                print_error "Option --stack-name requires a value"
                echo -e "\n${YELLOW}Usage examples:${NC}"
                echo -e "  ${WHITE}./deploy.sh dev --guided --stack-name my-oembed-stack${NC}"
                echo -e "  ${WHITE}./deploy.sh prod --stack-name production-oembed${NC}"
                exit 1
            fi
            ;;
        dev|stage|staging|prod|production)
            ENVIRONMENT="$1"
            shift
            ;;
        -h|--help)
            echo -e "${WHITE}Serverless oEmbed Provider - Deployment Script${NC}\n"
            echo -e "${CYAN}Usage:${NC}"
            echo -e "  ${WHITE}./deploy.sh [environment] [options]${NC}\n"
            echo -e "${CYAN}Environments:${NC}"
            echo -e "  ${WHITE}dev, stage, staging, prod, production${NC} (default: dev)\n"
            echo -e "${CYAN}Options:${NC}"
            echo -e "  ${WHITE}--guided${NC}              Run guided deployment"
            echo -e "  ${WHITE}--stack-name NAME${NC}     Custom stack name"
            echo -e "  ${WHITE}-h, --help${NC}            Show this help message\n"
            echo -e "${CYAN}Examples:${NC}"
            echo -e "  ${WHITE}./deploy.sh dev --guided${NC}"
            echo -e "  ${WHITE}./deploy.sh prod --stack-name my-oembed-stack${NC}"
            echo -e "  ${WHITE}./deploy.sh stage --guided --stack-name staging-oembed${NC}"
            echo -e "  ${WHITE}STACK_NAME=my-stack ./deploy.sh dev${NC} (environment variable)\n"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo -e "\n${YELLOW}Use ${WHITE}--help${YELLOW} to see available options${NC}"
            exit 1
            ;;
    esac
done

# Start deployment process
print_header

PARAM_FILE="${ENVIRONMENT}.parameters"

print_step "Validating deployment configuration..."

if [ ! -f "$PARAM_FILE" ]; then
    print_error "Parameter file '$PARAM_FILE' not found"
    print_info "Please copy ${ENVIRONMENT}.parameters.example to $PARAM_FILE and customize the values"
    echo -e "\n${YELLOW}Quick setup:${NC}"
    echo -e "  ${WHITE}cp ${ENVIRONMENT}.parameters.example $PARAM_FILE${NC}"
    echo -e "  ${WHITE}nano $PARAM_FILE${NC}"
    exit 1
fi

print_success "Parameter file found: $PARAM_FILE"

# Determine stack name with priority: parameter > environment variable > project folder name
if [ -n "$STACK_NAME_PARAM" ]; then
    STACK_NAME="$STACK_NAME_PARAM"
    print_info "Stack name from parameter: ${WHITE}$STACK_NAME${NC}"
elif [ -n "$STACK_NAME" ]; then
    print_info "Stack name from environment variable: ${WHITE}$STACK_NAME${NC}"
else
    # Fallback to project folder name
    STACK_NAME=$(basename "$(pwd)")
    print_info "Stack name from project folder: ${WHITE}$STACK_NAME${NC}"
fi

print_separator
echo -e "${WHITE}Deployment Configuration:${NC}"
echo -e "  ${CYAN}Environment:${NC} ${WHITE}$ENVIRONMENT${NC}"
echo -e "  ${CYAN}Stack Name:${NC}  ${WHITE}$STACK_NAME${NC}"
echo -e "  ${CYAN}Parameters:${NC}  ${WHITE}$PARAM_FILE${NC}"
if [ "$GUIDED_FLAG" = "--guided" ]; then
    echo -e "  ${CYAN}Mode:${NC}        ${YELLOW}Guided Deployment${NC}"
else
    echo -e "  ${CYAN}Mode:${NC}        ${GREEN}Automated Deployment${NC}"
fi
print_separator

# Function to convert parameter file to SAM format
convert_parameters() {
    local param_file="$1"
    local result=""
    
    # Read each line, filter comments and empty lines
    while IFS= read -r line; do
        # Skip comments and empty lines
        if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
            continue
        fi
        
        # Extract key and value
        if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
            local key="${BASH_REMATCH[1]}"
            local value="${BASH_REMATCH[2]}"
            
            # Remove quotes from value if present
            value=$(echo "$value" | sed 's/^"//;s/"$//')
            
            # Add to result in SAM format
            if [ -n "$result" ]; then
                result="$result "
            fi
            result="${result}${key}=${value}"
        fi
    done < "$param_file"
    
    echo "$result"
}

print_step "Processing deployment parameters..."

# Convert parameters to SAM format
PARAMETERS=$(convert_parameters "$PARAM_FILE")

if [ -z "$PARAMETERS" ]; then
    print_error "No parameters found in $PARAM_FILE"
    exit 1
fi

print_success "Parameters processed successfully"

# Show parameter preview (first 100 chars)
PARAM_PREVIEW=$(echo "$PARAMETERS" | cut -c1-80)
if [ ${#PARAMETERS} -gt 80 ]; then
    PARAM_PREVIEW="${PARAM_PREVIEW}..."
fi
print_info "Parameters: ${WHITE}$PARAM_PREVIEW${NC}"

print_separator

# Build the project
print_step "Building SAM application..."
echo ""
if sam build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

print_separator

# Deploy with parameters
print_step "Deploying to AWS..."
echo ""

if [ "$GUIDED_FLAG" = "--guided" ]; then
    print_warning "Starting guided deployment - you'll be prompted for configuration"
    echo ""
    if eval "sam deploy --guided --config-env $ENVIRONMENT --parameter-overrides '$PARAMETERS' --resolve-s3 --stack-name $STACK_NAME"; then
        DEPLOY_SUCCESS=true
    else
        DEPLOY_SUCCESS=false
    fi
else
    print_info "Starting automated deployment..."
    echo ""
    if eval "sam deploy --config-env $ENVIRONMENT --parameter-overrides '$PARAMETERS' --resolve-s3 --stack-name $STACK_NAME"; then
        DEPLOY_SUCCESS=true
    else
        DEPLOY_SUCCESS=false
    fi
fi

print_separator

if [ "$DEPLOY_SUCCESS" = true ]; then
    echo -e "\n${GREEN}${SPARKLES}${ROCKET} Deployment completed successfully! ${ROCKET}${SPARKLES}${NC}\n"
    
    print_info "Your oEmbed provider is now live!"
    print_info "Next steps:"
    echo -e "  ${WHITE}1.${NC} Customize ${CYAN}src/integration/getContentMetadata.mjs${NC}"
    echo -e "  ${WHITE}2.${NC} Test your endpoint with a sample URL"
    echo -e "  ${WHITE}3.${NC} Check CloudWatch logs for any issues"
    
    # Try to get the API endpoint from stack outputs
    echo ""
    print_step "Retrieving endpoint information..."
    
    if command -v aws >/dev/null 2>&1; then
        ENDPOINT=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayEndpoint`].OutputValue' --output text 2>/dev/null || echo "")
        CUSTOM_ENDPOINT=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`CustomDomainEndpoint`].OutputValue' --output text 2>/dev/null || echo "")
        
        if [ -n "$ENDPOINT" ] && [ "$ENDPOINT" != "None" ]; then
            echo -e "\n${CYAN}${CLOUD} Your oEmbed Endpoints:${NC}"
            echo -e "  ${WHITE}Default:${NC} $ENDPOINT"
            
            if [ -n "$CUSTOM_ENDPOINT" ] && [ "$CUSTOM_ENDPOINT" != "None" ]; then
                echo -e "  ${WHITE}Custom:${NC}  $CUSTOM_ENDPOINT"
            fi
            
            echo -e "\n${YELLOW}Test your endpoint:${NC}"
            echo -e "  ${WHITE}curl \"$ENDPOINT?url=https://mytestcompany.com/content/123\"${NC}"
        fi
    fi
    
    echo ""
else
    print_error "Deployment failed!"
    print_info "Check the error messages above for details"
    exit 1
fi