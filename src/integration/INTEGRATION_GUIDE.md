# Integration Guide

This guide shows how to integrate your backend content system with the Serverless oEmbed Provider by customizing the `getContentMetadata.mjs` function.

## Quick Start

### 1. Basic Integration

Edit `src/integration/getContentMetadata.mjs` and customize the `fetchContentFromBackend()` function:

```javascript
async function fetchContentFromBackend(contentParams, correlationId) {
  const { contentId, contentType } = contentParams;

  // Replace with your actual backend API call
  const response = await fetch(`https://your-api.com/content/${contentId}`);
  const data = await response.json();

  // Transform your data to oEmbed format
  return transformBackendData(data, contentType);
}
```

## Content Type Examples

### Video Content

```javascript
export async function getContentMetadata(url, params = {}) {
  const videoId = extractVideoId(url);
  const video = await fetchVideoFromAPI(videoId);

  return {
    type: "video",
    title: video.title,
    author_name: video.creator.name,
    thumbnail_url: video.thumbnail_url,
    html: `<iframe src="${video.embed_url}" width="800" height="450" frameborder="0" allowfullscreen></iframe>`,
    width: 800,
    height: 450,
  };
}
```

### Photo Content

```javascript
export async function getContentMetadata(url, params = {}) {
  const photoId = extractPhotoId(url);
  const photo = await fetchPhotoFromAPI(photoId);

  return {
    type: "photo",
    title: photo.title,
    author_name: photo.photographer.name,
    url: photo.image_url,
    width: photo.width,
    height: photo.height,
  };
}
```

### Rich Content

```javascript
export async function getContentMetadata(url, params = {}) {
  const widgetId = extractWidgetId(url);
  const widget = await fetchWidgetFromAPI(widgetId);

  return {
    type: "rich",
    title: widget.title,
    author_name: widget.creator.name,
    html: `<div class="widget-container">
             <iframe src="${widget.embed_url}" width="500" height="300"></iframe>
           </div>`,
    width: 500,
    height: 300,
  };
}
```

### Link Content

```javascript
export async function getContentMetadata(url, params = {}) {
  const articleId = extractArticleId(url);
  const article = await fetchArticleFromAPI(articleId);

  return {
    type: "link",
    title: article.title,
    author_name: article.author.name,
    thumbnail_url: article.featured_image_url,
    thumbnail_width: article.featured_image_width,
    thumbnail_height: article.featured_image_height,
  };
}
```

## Backend Integration Patterns

### Database Integration (DynamoDB)

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function getContentMetadata(url, params = {}) {
  const contentId = extractContentId(url);

  const command = new GetCommand({
    TableName: "ContentTable",
    Key: { id: contentId },
  });

  const response = await docClient.send(command);

  if (!response.Item) {
    throw new Error("Content not found");
  }

  return mapContentToOembed(response.Item, params);
}
```

### REST API Integration

```javascript
export async function getContentMetadata(url, params = {}) {
  const contentId = extractContentId(url);

  const response = await fetch(
    `https://api.mycompany.com/content/${contentId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Content not found");
    }
    throw new Error("Failed to fetch content");
  }

  const content = await response.json();
  return mapContentToOembed(content, params);
}
```

### GraphQL Integration

```javascript
export async function getContentMetadata(url, params = {}) {
  const contentId = extractContentId(url);

  const query = `
    query GetContent($id: ID!) {
      content(id: $id) {
        id
        title
        type
        author { name profileUrl }
        media { url width height thumbnailUrl }
      }
    }
  `;

  const response = await fetch("https://api.mycompany.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GRAPHQL_TOKEN}`,
    },
    body: JSON.stringify({ query, variables: { id: contentId } }),
  });

  const { data } = await response.json();

  if (!data.content) {
    throw new Error("Content not found");
  }

  return mapGraphQLToOembed(data.content, params);
}
```

## Testing Your Integration

### Unit Testing

```javascript
// __tests__/integration.test.mjs
import { getContentMetadata } from "../src/integration/getContentMetadata.mjs";

test("should return video metadata for valid video URL", async () => {
  const url = "https://mycompany.com/video/123";
  const result = await getContentMetadata(url);

  expect(result.type).toBe("video");
  expect(result.title).toBeDefined();
  expect(result.html).toContain("iframe");
});
```

### Local Testing

```bash
# Start local API
sam local start-api

# Test your integration
curl "http://localhost:3000/oembed?url=https://mycompany.com/video/123"
```

## oEmbed Specification Compliance

This serverless oEmbed provider is fully compliant with the [official oEmbed 1.0 specification](https://oembed.com/). Here's how we ensure compliance:

### Supported Request Parameters

**Required Parameters:**

- `url` (required) - The URL to retrieve embedding information for

**Optional Parameters:**

- `maxwidth` (optional) - Maximum width of embedded resource (1-2048 pixels)
- `maxheight` (optional) - Maximum height of embedded resource (1-2048 pixels)
- `format` (optional) - Response format (`json` or `xml`, defaults to `json`)

### Response Formats

**JSON Response** (default):

- Content-Type: `application/json`
- UTF-8 encoded
- Well-formed JSON structure

**XML Response**:

- Content-Type: `text/xml`
- UTF-8 encoded with XML declaration
- Root element: `<oembed>`
- Proper PCDATA escaping

### Content Types

All four official oEmbed content types are supported:

1. **photo** - Static images with required `url`, `width`, `height`
2. **video** - Playable videos with required `html`, `width`, `height`
3. **rich** - Rich HTML content with required `html`, `width`, `height`
4. **link** - Generic metadata without `url` or `html`

### HTTP Status Codes

Compliant with official oEmbed error codes:

- `200` - Success
- `404` - Provider has no response for requested URL
- `501` - Provider cannot return response in requested format
- `401` - URL contains private resource (not implemented by default)

### Security Considerations

Following official oEmbed security guidelines:

- URL scheme filtering (http, https)
- XSS prevention in HTML generation
- iframe sandboxing recommendations
- Proper XML character escaping

## oEmbed Discoverability Setup

To enable automatic discovery by social platforms and other services, you need to implement oEmbed discoverability on your website per the [official oEmbed specification](https://oembed.com/#section4).

### HTML Discovery Links

Add oEmbed discovery links to the `<head>` section of your content pages. This allows platforms to automatically find your oEmbed endpoint.

#### Example Implementation

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Amazing Video Content</title>
    <meta charset="utf-8" />

    <!-- Standard meta tags -->
    <meta name="description" content="Watch this amazing video content" />

    <!-- oEmbed Discovery Links (per official oEmbed specification) -->
    <link
      rel="alternate"
      type="application/json+oembed"
      href="https://your-oembed-endpoint.com/oembed?url=https%3A%2F%2Fyoursite.com%2Fvideo%2F123"
      title="Amazing Video Content"
    />

    <!-- Optional XML format support -->
    <link
      rel="alternate"
      type="text/xml+oembed"
      href="https://your-oembed-endpoint.com/oembed?url=https%3A%2F%2Fyoursite.com%2Fvideo%2F123"
      title="Amazing Video Content"
    />
  </head>
  <body>
    <!-- Your content here -->
  </body>
</html>
```

#### Dynamic Discovery Links

For dynamic content, generate discovery links programmatically:

```javascript
// Example: Express.js route for content pages
app.get("/video/:id", async (req, res) => {
  const videoId = req.params.id;
  const video = await getVideoById(videoId);
  const currentUrl = `https://yoursite.com/video/${videoId}`;
  const oembedUrl = `https://your-oembed-endpoint.com/oembed?url=${encodeURIComponent(
    currentUrl
  )}`;

  res.render("video", {
    video,
    oembedDiscovery: {
      json: oembedUrl,
      xml: oembedUrl,
      title: video.title,
    },
  });
});
```

```html
<!-- In your template -->
<link
  rel="alternate"
  type="application/json+oembed"
  href="{{oembedDiscovery.json}}"
  title="{{oembedDiscovery.title}}"
/>
```

#### HTTP Link Headers (Alternative Method)

The official oEmbed specification also supports discovery via HTTP Link headers:

```javascript
// Express.js example with HTTP Link headers
app.get("/video/:id", (req, res) => {
  const videoId = req.params.id;
  const currentUrl = `https://yoursite.com/video/${videoId}`;
  const encodedUrl = encodeURIComponent(currentUrl);
  const oembedEndpoint = "https://your-oembed-endpoint.com/oembed";

  // Set Link headers for oEmbed discovery
  res.set("Link", [
    `<${oembedEndpoint}?url=${encodedUrl}>; rel="alternate"; type="application/json+oembed"; title="Video Title"`,
    `<${oembedEndpoint}?url=${encodedUrl}>; rel="alternate"; type="text/xml+oembed"; title="Video Title"`,
  ]);

  // Render your content page
  res.render("video", { video: getVideoById(videoId) });
});
```

**HTTP Response Example:**

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Link: <https://your-oembed-endpoint.com/oembed?url=https%3A%2F%2Fyoursite.com%2Fvideo%2F123>; rel="alternate"; type="application/json+oembed"; title="Video Title"
Link: <https://your-oembed-endpoint.com/oembed?url=https%3A%2F%2Fyoursite.com%2Fvideo%2F123>; rel="alternate"; type="text/xml+oembed"; title="Video Title"

<!DOCTYPE html>
<html>
<!-- Your content page -->
</html>
```

### Provider Registry (Optional Extension)

**Important**: This is NOT part of the official oEmbed specification. The [official oEmbed spec](https://oembed.com/) recommends using the discovery mechanism instead of provider registries.

However, some platforms and tools use provider registries as an extension. If you need to support this:

#### Create `/oembed.json` endpoint

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
        "https://yoursite.com/article/*",
        "https://yoursite.com/gallery/*"
      ],
      "url": "https://your-oembed-endpoint.com/oembed",
      "discovery": true,
      "formats": ["json", "xml"]
    }
  ]
}
```

#### Serve the discovery document

```javascript
// Express.js example
app.get("/oembed.json", (req, res) => {
  res.json({
    provider_name: process.env.PROVIDER_NAME,
    provider_url: process.env.PROVIDER_URL,
    endpoints: [
      {
        schemes: [
          `${process.env.PROVIDER_URL}/video/*`,
          `${process.env.PROVIDER_URL}/photo/*`,
          `${process.env.PROVIDER_URL}/content/*`,
        ],
        url: process.env.OEMBED_ENDPOINT_URL,
        discovery: true,
        formats: ["json", "xml"],
      },
    ],
  });
});
```

### Platform-Specific Considerations

#### Discord

- Automatically detects oEmbed discovery links
- Supports rich video and image embeds
- Respects `maxwidth` and `maxheight` parameters

```html
<!-- Optimized for Discord -->
<link
  rel="alternate"
  type="application/json+oembed"
  href="https://your-oembed-endpoint.com/oembed?url=https%3A%2F%2Fyoursite.com%2Fvideo%2F123"
  title="Video Title"
/>
```

#### Slack

- Requires HTTPS for oEmbed endpoints
- Supports interactive content previews
- Caches responses for performance

#### Twitter/X

- Uses oEmbed for Twitter Cards
- Supports video, photo, and rich content types
- Requires proper CORS headers

#### Facebook/Meta

- Uses oEmbed for link previews
- Supports Open Graph fallbacks
- Requires SSL certificates

### Testing Discoverability

#### Manual Testing

```bash
# Test discovery document
curl -H "Accept: application/json" "https://yoursite.com/oembed.json"

# Test discovery link resolution
curl "https://your-oembed-endpoint.com/oembed?url=https://yoursite.com/video/123"

# Test with different platforms' user agents
curl -H "User-Agent: Discordbot/2.0" "https://yoursite.com/video/123"
curl -H "User-Agent: Slackbot-LinkExpanding" "https://yoursite.com/video/123"
```

#### Automated Testing

```javascript
// Jest test example
describe("oEmbed Discoverability", () => {
  it("should include discovery links in content pages", async () => {
    const response = await request(app).get("/video/123");
    expect(response.text).toContain("application/json+oembed");
    expect(response.text).toContain("your-oembed-endpoint.com/oembed");
  });

  it("should serve provider discovery document", async () => {
    const response = await request(app).get("/oembed.json");
    expect(response.status).toBe(200);
    expect(response.body.provider_name).toBeDefined();
    expect(response.body.endpoints).toHaveLength(1);
  });
});
```

### Common Platforms Integration

#### WordPress Plugin Example

```php
// WordPress plugin to add oEmbed discovery
function add_oembed_discovery() {
    if (is_single()) {
        global $post;
        $current_url = get_permalink($post->ID);
        $oembed_url = 'https://your-oembed-endpoint.com/oembed?url=' . urlencode($current_url);

        echo '<link rel="alternate" type="application/json+oembed" href="' . $oembed_url . '" title="' . get_the_title() . '">';
    }
}
add_action('wp_head', 'add_oembed_discovery');
```

#### React/Next.js Example

```jsx
// Next.js Head component
import Head from "next/head";

function VideoPage({ video }) {
  const currentUrl = `https://yoursite.com/video/${video.id}`;
  const oembedUrl = `https://your-oembed-endpoint.com/oembed?url=${encodeURIComponent(
    currentUrl
  )}`;

  return (
    <>
      <Head>
        <title>{video.title}</title>
        <link
          rel="alternate"
          type="application/json+oembed"
          href={oembedUrl}
          title={video.title}
        />
      </Head>
      {/* Your video content */}
    </>
  );
}
```

## Performance Optimization

### API Gateway Caching

By default, API Gateway caching is **disabled** to minimize costs. However, enabling caching can significantly improve performance for frequently requested content.

**To enable caching:**

1. Edit `template.yaml` and uncomment the caching configuration:

   ```yaml
   # API Gateway Caching Configuration
   CacheClusterEnabled: true
   CacheClusterSize: "0.5"
   MethodSettings:
     - ResourcePath: "/oembed"
       HttpMethod: "GET"
       CachingEnabled: true
       CacheTtlInSeconds: 300
   ```

2. Redeploy your stack:
   ```bash
   ./deploy.sh dev
   ```

**Cost Impact:**

- **Without caching**: ~$0.50-2.00/month for typical usage
- **With caching**: Additional ~$13.50/month for 0.5GB cache cluster
- **Performance benefit**: 50-90% faster response times for cached content

**When to enable caching:**

- High traffic volume (>1000 requests/day)
- Content doesn't change frequently
- Performance is more important than cost optimization

### Backend Optimization Tips

1. **Use connection pooling** for database connections
2. **Implement proper error handling** to avoid unnecessary retries
3. **Cache frequently accessed data** in your backend
4. **Use CDN** for media assets referenced in oEmbed responses

## Deployment

After customizing your integration:

1. Test locally with `sam local start-api`
2. Run tests with `npm test`
3. Deploy with `./deploy.sh dev --guided`

For detailed deployment instructions, see [DEPLOYMENT.md](../../DEPLOYMENT.md).
