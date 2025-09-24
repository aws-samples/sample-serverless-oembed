# Deployment Guide

Complete deployment instructions for the Serverless oEmbed Provider using AWS SAM CLI.

## Prerequisites

- AWS Account with Lambda, API Gateway, CloudFormation permissions
- AWS CLI configured with credentials
- AWS SAM CLI installed ([Installation Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
- Node.js 18.x or later
- (Optional) Custom domain and ACM certificate

## Method 1: SAM CLI Deployment (Recommended)

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/aws-samples/serverless-oembed-provider.git
cd serverless-oembed-provider

# Install dependencies and run tests
npm install
npm test
```

### Step 2: Configure Parameters

```bash
# Copy and edit parameters
cp dev.parameters.example dev.parameters
nano dev.parameters
```

Example `dev.parameters` file:

```
Environment=prod
ProviderName="YourCompanyName"
ProviderUrl="https://yourcompany.com"
ProviderDomain="yourcompany.com"
CertificateArn=""
```

### Step 3: Deploy

```bash
# Build and deploy using helper script
./deploy.sh dev --guided
```

**Advanced Usage**:

```bash
# Deploy to production with custom stack name
./deploy.sh prod --guided --stack-name my-oembed-production

# Quick deployment without guided prompts
./deploy.sh dev --stack-name my-dev-stack

# Using environment variable for stack name
STACK_NAME=my-custom-stack ./deploy.sh stage

# Get help with all available options
./deploy.sh --help
```

**Note**: During guided deployment, you'll be prompted with:

```
oembedFunction has no authentication. Is this okay? [y/N]
```

Answer **'y'** (yes) - this is expected and correct for oEmbed endpoints, which need to be publicly accessible for social media platforms and other services to fetch content previews.

### Step 4: Customize Integration

Edit `src/integration/getContentMetadata.mjs` to connect to your backend, then redeploy:

```bash
./deploy.sh dev
```

## Parameters

### Required

- **ProviderName**: Your business name no spaces (appears in oEmbed responses)
- **ProviderUrl**: Your main website URL
- **ProviderDomain**: Your domain for URL validation (e.g., "mycompany.com")

### Optional

- **Environment**: Deployment environment (`dev`, `stage`, `prod`)
- **CertificateArn**: ACM certificate ARN (optional - if provided, creates custom domain at oembed.{ProviderDomain})

## Custom Domain Setup (Optional)

By default, your oEmbed endpoint uses the standard API Gateway URL. To use a custom domain:

1. **Create ACM Certificate**:

   ```bash
   aws acm request-certificate \
     --domain-name oembed.yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Deploy with Custom Domain**:

   Add the certificate ARN to your parameters file:

   ```
   CertificateArn="arn:aws:acm:us-east-1:123456789012:certificate/..."
   ```

   This automatically creates a custom domain at `oembed.{ProviderDomain}`

3. **Update DNS**: Create CNAME record pointing to the API Gateway domain name

**Note**: If no `CertificateArn` is provided, the deployment uses the default API Gateway domain (no custom domain is created).

## Multi-Environment Deployment

```bash
# Development
cp dev.parameters.example dev.parameters
# Edit dev.parameters with your values
./deploy.sh dev --guided

# Staging
cp dev.parameters.example stage.parameters
# Edit stage.parameters with your values
./deploy.sh stage --stack-name my-oembed-staging

# Production
cp dev.parameters.example prod.parameters
# Edit prod.parameters with your values
./deploy.sh prod --guided --stack-name my-oembed-production
```

## Testing Your Deployment

```bash
# Test endpoint
curl "https://your-endpoint/oembed?url=https://yourdomain.com/video/123"

# Expected response
{
  "version": "1.0",
  "type": "video",
  "title": "Sample Video",
  "provider_name": "Your Company",
  "html": "<iframe src='...' width='800' height='450'></iframe>",
  "width": 800,
  "height": 450
}
```

## Setting Up oEmbed Discoverability

After deployment, enable automatic discovery by social platforms:

### 1. Add Discovery Links to Your Content Pages

Add these `<link>` tags to the `<head>` section of your content pages:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Your Video Title</title>

    <!-- oEmbed Discovery Links (per official oEmbed specification) -->
    <link
      rel="alternate"
      type="application/json+oembed"
      href="https://your-oembed-endpoint.com/oembed?url=https%3A%2F%2Fyoursite.com%2Fvideo%2F123"
      title="Your Video Title"
    />

    <!-- Optional XML format -->
    <link
      rel="alternate"
      type="text/xml+oembed"
      href="https://your-oembed-endpoint.com/oembed?url=https%3A%2F%2Fyoursite.com%2Fvideo%2F123"
      title="Your Video Title"
    />
  </head>
  <body>
    <!-- Your content here -->
  </body>
</html>
```

**Important**: URLs in the `href` attribute must be properly URL-encoded as per the [official oEmbed specification](https://oembed.com/#section4).

#### Alternative: HTTP Link Headers

The official oEmbed specification also supports discovery via HTTP Link headers:

```http
Link: <https://your-oembed-endpoint.com/oembed?url=https%3A%2F%2Fyoursite.com%2Fvideo%2F123>; rel="alternate"; type="application/json+oembed"; title="Your Video Title"
Link: <https://your-oembed-endpoint.com/oembed?url=https%3A%2F%2Fyoursite.com%2Fvideo%2F123>; rel="alternate"; type="text/xml+oembed"; title="Your Video Title"
```

Example server implementation:

```javascript
// Express.js example
app.get("/video/:id", (req, res) => {
  const videoUrl = `https://yoursite.com/video/${req.params.id}`;
  const encodedUrl = encodeURIComponent(videoUrl);

  res.set("Link", [
    `<https://your-oembed-endpoint.com/oembed?url=${encodedUrl}>; rel="alternate"; type="application/json+oembed"; title="Video Title"`,
    `<https://your-oembed-endpoint.com/oembed?url=${encodedUrl}>; rel="alternate"; type="text/xml+oembed"; title="Video Title"`,
  ]);

  // Render your content page
  res.render("video", { video: getVideo(req.params.id) });
});
```

### 2. Create Provider Registry (Optional Extension)

**Important**: This is NOT part of the official oEmbed specification. The [official oEmbed spec](https://oembed.com/) recommends using the discovery mechanism instead.

However, if you need to support provider registries for certain platforms, create a file at `https://yoursite.com/oembed.json`:

```json
{
  "provider_name": "Your Company Name",
  "provider_url": "https://yoursite.com",
  "endpoints": [
    {
      "schemes": [
        "https://yoursite.com/video/*",
        "https://yoursite.com/photo/*",
        "https://yoursite.com/content/*",
        "https://yoursite.com/article/*"
      ],
      "url": "https://your-oembed-endpoint.com/oembed",
      "discovery": true,
      "formats": ["json", "xml"]
    }
  ]
}
```

### 3. Test Discovery

```bash
# Test that platforms can discover your oEmbed endpoint
curl -H "Accept: application/json" "https://yoursite.com/oembed.json"

# Test discovery link resolution
curl "https://your-oembed-endpoint.com/oembed?url=https://yoursite.com/video/123"
```

## Troubleshooting

### Common Issues

- **Certificate validation failed**: Ensure ACM certificate is validated in correct region
- **Domain authorization failed**: Verify `ProviderDomain` matches your content URLs exactly
- **Lambda timeout**: Optimize your `getContentMetadata` implementation
- **CORS issues**: Ensure you're making GET requests to correct endpoint

### Getting Help

1. Check CloudWatch Logs: `/aws/lambda/oembed-function-{Environment}`
2. Use CloudWatch Dashboard for metrics
3. Check [GitHub Issues](https://github.com/aws-samples/serverless-oembed-provider/issues)

## Next Steps

1. **Customize Integration**: Edit `src/integration/getContentMetadata.mjs`
2. **Test Thoroughly**: Verify all content types work
3. **Configure Monitoring**: Set up CloudWatch alarms
4. **Share Endpoint**: Provide oEmbed URL to platforms

For detailed integration instructions, see [Integration Guide](src/integration/INTEGRATION_GUIDE.md).
