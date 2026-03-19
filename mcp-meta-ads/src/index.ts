#!/usr/bin/env node
/**
 * MCP Server: Meta Ads Manager & Business Suite
 *
 * Connects to Meta's Marketing API and Graph API to pull ALL data:
 * - Ad account info, campaigns, ad sets, ads, creatives
 * - Performance insights with demographic/placement breakdowns
 * - Custom audiences, saved audiences
 * - Pixel tracking, custom conversions
 * - Budget/spend history
 * - Facebook Page insights, posts
 * - Instagram insights, media, stories, demographics
 * - Lead forms and lead data
 * - Product catalogs
 *
 * Each project maps to a different client's ad account.
 *
 * Required env vars:
 *   META_ACCESS_TOKEN - Long-lived system user access token
 *
 * Optional env vars (for per-project tokens):
 *   META_ACCESS_TOKEN_<PROJECT_ID> - Project-specific token override
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, handleToolCall } from "./tools.js";

// ─── Access Token Resolution ─────────────────────────────────────────────────

function getAccessToken(args?: Record<string, unknown>): string {
  // 1. Check for project-specific token (per-client ad account)
  if (args?.project_id) {
    const projectToken = process.env[`META_ACCESS_TOKEN_${args.project_id}`];
    if (projectToken) return projectToken;
  }

  // 2. Check for ad-account-specific token
  if (args?.ad_account_id) {
    const accountId = (args.ad_account_id as string).replace("act_", "");
    const accountToken = process.env[`META_ACCESS_TOKEN_${accountId}`];
    if (accountToken) return accountToken;
  }

  // 3. Fall back to default token
  const defaultToken = process.env.META_ACCESS_TOKEN;
  if (!defaultToken) {
    throw new Error(
      "META_ACCESS_TOKEN environment variable is required. " +
      "Set a long-lived system user access token from Meta Business Manager. " +
      "You can also set per-project tokens with META_ACCESS_TOKEN_<PROJECT_ID>."
    );
  }

  return defaultToken;
}

// ─── Server Setup ────────────────────────────────────────────────────────────

const server = new Server(
  {
    name: "mcp-meta-ads",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─── List Tools ──────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// ─── Call Tool ───────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const accessToken = getAccessToken(args as Record<string, unknown>);
    const result = await handleToolCall(
      name,
      (args || {}) as Record<string, unknown>,
      accessToken
    );

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Meta Ads MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
