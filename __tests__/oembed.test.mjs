import { handler } from "../src/handlers/oembed.mjs";

// Mock environment variables
process.env.PROVIDER_DOMAIN = "mybusiness.com";
process.env.PROVIDER_NAME = "Example Provider";
process.env.PROVIDER_URL = "https://mybusiness.com";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "ERROR"; // Reduce log noise in tests
process.env.AWS_XRAY_CONTEXT_MISSING = "LOG_ERROR"; // Reduce X-Ray noise in tests

describe("oEmbed Lambda Function", () => {
  describe("handler", () => {
    it("should return error for missing url parameter", async () => {
      const event = {
        queryStringParameters: {},
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty("message", "URL parameter is required");
      expect(body.error).toHaveProperty("code", "MISSING_URL");
      expect(body.error).toHaveProperty("timestamp");
      expect(body.error).toHaveProperty("requestId");
    });

    it("should return error for unsupported format", async () => {
      const event = {
        queryStringParameters: {
          url: "https://mybusiness.com/video",
          format: "invalid",
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(501);
      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty("message", "Format not implemented");
      expect(body.error).toHaveProperty("code", "INVALID_FORMAT");
    });

    it("should return error for invalid URL", async () => {
      const event = {
        queryStringParameters: {
          url: "invalid-url",
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty("message", "Invalid URL");
      expect(body.error).toHaveProperty("code", "MALFORMED_URL");
    });

    it("should return error for unauthorized domain", async () => {
      const event = {
        queryStringParameters: {
          url: "https://other-domain.com/video",
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty("message", "Provider Domain Not Found");
      expect(body.error).toHaveProperty("code", "UNAUTHORIZED_DOMAIN");
    });

    it("should handle successful video response", async () => {
      const event = {
        queryStringParameters: {
          url: "https://mybusiness.com/video/123",
          maxwidth: "800",
          maxheight: "600",
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        version: "1.0",
        type: "video",
        title: "Test Video & Special Characters",
        author_name: "Test Author",
        author_url: "https://mybusiness.com/author",
        provider_name: "Example Provider",
        provider_url: "https://mybusiness.com",
        thumbnail_url: "https://mybusiness.com/thumb/123.jpg",
        thumbnail_width: 320,
        thumbnail_height: 180,
        width: 800,
        height: 600,
      });
      expect(body.html).toContain("<iframe");
      expect(body.html).toContain('width="800"');
      expect(body.html).toContain('height="600"');
      expect(body.html).toContain(
        'sandbox="allow-scripts allow-same-origin allow-presentation"'
      );
    });

    it("should handle successful rich content response", async () => {
      const event = {
        queryStringParameters: {
          url: "https://mybusiness.com/content/123",
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        version: "1.0",
        type: "rich",
        title: "Test Rich Content",
        author_name: "Test Author",
        author_url: "https://mybusiness.com/author",
        provider_name: "Example Provider",
        provider_url: "https://mybusiness.com",
        width: 500,
        height: 300,
      });
      expect(body.html).toContain("Rich content");
    });

    it("should handle XML format response", async () => {
      const event = {
        queryStringParameters: {
          url: "https://mybusiness.com/video/123",
          format: "xml",
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers["Content-Type"]).toBe("text/xml");
      expect(response.body).toContain(
        '<?xml version="1.0" encoding="utf-8" standalone="yes"?>'
      );
      expect(response.body).toContain("<oembed>");
      expect(response.body).toContain("<type>video</type>");
      expect(response.body).toContain("<version>1.0</version>");
      expect(response.body).toContain("&amp;");
    });

    it("should return error response in XML format when requested", async () => {
      const event = {
        queryStringParameters: {
          format: "xml",
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(response.headers["Content-Type"]).toBe("text/xml");
      expect(response.body).toContain(
        '<?xml version="1.0" encoding="utf-8" standalone="yes"?>'
      );
      expect(response.body).toContain("<oembed>");
      expect(response.body).toContain("<error>");
      expect(response.body).toContain(
        "<message>URL parameter is required</message>"
      );
      expect(response.body).toContain("<code>MISSING_URL</code>");
    });

    it("should validate maxwidth parameter", async () => {
      const event = {
        queryStringParameters: {
          url: "https://mybusiness.com/video/123",
          maxwidth: "invalid",
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty("code", "INVALID_MAXWIDTH");
    });

    it("should validate maxheight parameter", async () => {
      const event = {
        queryStringParameters: {
          url: "https://mybusiness.com/video/123",
          maxheight: "3000", // Above limit
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty("code", "INVALID_MAXHEIGHT");
    });

    it("should handle link content type", async () => {
      const event = {
        queryStringParameters: {
          url: "https://mybusiness.com/article/456",
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        version: "1.0",
        type: "link",
        provider_name: "Example Provider",
        provider_url: "https://mybusiness.com",
      });
    });

    it("should include cache control headers", async () => {
      const event = {
        queryStringParameters: {
          url: "https://mybusiness.com/video/123",
        },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty("Cache-Control");
      expect(response.headers["Cache-Control"]).toMatch(/max-age=\d+/);
    });
  });
});
