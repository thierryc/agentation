/**
 * Agentation MCP CLI
 *
 * Usage:
 *   agentation-mcp server [--port 4747]
 *   agentation-mcp init
 *   agentation-mcp doctor
 */

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

const command = process.argv[2];
const DEFAULT_PORT = 4747;

type CodingAgent = "claude" | "codex";

function parseAgentSelection(input: string): CodingAgent {
  const normalized = input.trim().toLowerCase();
  if (normalized === "2" || normalized === "codex") {
    return "codex";
  }
  return "claude";
}

function getAgentLabel(agent: CodingAgent): string {
  return agent === "claude" ? "Claude Code" : "Codex";
}

function parsePortInput(input: string): number {
  const trimmed = input.trim();
  const parsed = parseInt(trimmed, 10);
  if (!trimmed || isNaN(parsed) || parsed < 1 || parsed > 65535) {
    return DEFAULT_PORT;
  }
  return parsed;
}

function parsePortFromArgArray(args: unknown): number {
  if (!Array.isArray(args)) {
    return DEFAULT_PORT;
  }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && typeof args[i + 1] === "string") {
      const parsed = parseInt(args[i + 1], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
        return parsed;
      }
    }
  }
  return DEFAULT_PORT;
}

function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || "";
}

function getClaudeConfigPath(homeDir: string): string {
  return path.join(homeDir, ".claude", "claude_code_config.json");
}

function getCodexConfigPath(homeDir: string): string {
  return path.join(homeDir, ".codex", "config.toml");
}

async function promptForAgent(question: (q: string) => Promise<string>): Promise<CodingAgent> {
  console.log(`Select coding agent:`);
  console.log(`  [1] Claude Code (default)`);
  console.log(`  [2] Codex`);
  const answer = await question(`Choose agent [1/2]: `);
  const agent = parseAgentSelection(answer);
  console.log(`Using ${getAgentLabel(agent)} setup.`);
  console.log();
  return agent;
}

function ensureParentDirectory(filePath: string): void {
  const parent = path.dirname(filePath);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
}

function writeClaudeConfig(claudeConfigPath: string, port: number): void {
  let config: Record<string, unknown> = {};
  if (fs.existsSync(claudeConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(claudeConfigPath, "utf-8"));
    } catch {
      console.log(`   Warning: Could not parse existing config, creating new one`);
    }
  }

  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    config.mcpServers = {};
  }

  (config.mcpServers as Record<string, unknown>).agentation = {
    command: "npx",
    args: port === DEFAULT_PORT
      ? ["agentation-mcp", "server"]
      : ["agentation-mcp", "server", "--port", String(port)],
  };

  ensureParentDirectory(claudeConfigPath);
  fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2));
}

function buildCodexAgentationBlock(port: number): string[] {
  const args = port === DEFAULT_PORT
    ? `["-y", "agentation-mcp", "server"]`
    : `["-y", "agentation-mcp", "server", "--port", "${port}"]`;
  return [
    "[mcp_servers.agentation]",
    `command = "npx"`,
    `args = ${args}`,
    "",
  ];
}

function writeCodexConfig(codexConfigPath: string, port: number): void {
  const blockLines = buildCodexAgentationBlock(port);

  if (!fs.existsSync(codexConfigPath)) {
    ensureParentDirectory(codexConfigPath);
    fs.writeFileSync(codexConfigPath, blockLines.join("\n"));
    return;
  }

  const content = fs.readFileSync(codexConfigPath, "utf-8");
  const lines = content.split(/\r?\n/);
  const sectionHeader = "[mcp_servers.agentation]";
  const start = lines.findIndex((line) => line.trim() === sectionHeader);

  if (start === -1) {
    const separator = content.endsWith("\n") ? "" : "\n";
    const updated = `${content}${separator}\n${blockLines.join("\n")}`;
    fs.writeFileSync(codexConfigPath, updated);
    return;
  }

  let end = start + 1;
  while (end < lines.length) {
    const trimmed = lines[end].trim();
    if (/^\[[^\]]+\]$/.test(trimmed)) {
      break;
    }
    end++;
  }

  const merged = [...lines.slice(0, start), ...blockLines, ...lines.slice(end)].join("\n");
  const output = merged.endsWith("\n") ? merged : `${merged}\n`;
  fs.writeFileSync(codexConfigPath, output);
}

function getCodexAgentationPort(configText: string): number {
  const sectionMatch = configText.match(
    /^\[mcp_servers\.agentation\]\n([\s\S]*?)(?=^\[[^\]]+\]|$)/m,
  );
  if (!sectionMatch) {
    return DEFAULT_PORT;
  }

  const section = sectionMatch[1];
  const portMatch = section.match(/"--port"\s*,\s*"(\d+)"/);
  if (!portMatch) {
    return DEFAULT_PORT;
  }

  const parsed = parseInt(portMatch[1], 10);
  return isNaN(parsed) ? DEFAULT_PORT : parsed;
}

// ============================================================================
// INIT COMMAND - Interactive setup wizard
// ============================================================================

async function runInit() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q: string): Promise<string> =>
    new Promise((resolve) => rl.question(q, resolve));

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                 Agentation MCP Setup Wizard                   ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const agent = await promptForAgent(question);
  const agentLabel = getAgentLabel(agent);
  const homeDir = getHomeDir();

  // Step 1: Check agent config
  if (agent === "claude") {
    const claudeConfigPath = getClaudeConfigPath(homeDir);
    const hasClaudeConfig = fs.existsSync(claudeConfigPath);
    if (hasClaudeConfig) {
      console.log(`✓ Found ${agentLabel} config at ${claudeConfigPath}`);
    } else {
      console.log(`○ No ${agentLabel} config found at ${claudeConfigPath}`);
    }
  } else {
    const codexConfigPath = getCodexConfigPath(homeDir);
    const hasCodexConfig = fs.existsSync(codexConfigPath);
    if (hasCodexConfig) {
      console.log(`✓ Found ${agentLabel} config at ${codexConfigPath}`);
    } else {
      console.log(`○ No ${agentLabel} config found at ${codexConfigPath}`);
    }
  }
  console.log();

  // Step 2: Ask about MCP server
  console.log(`The Agentation MCP server allows ${agentLabel} to receive`);
  console.log(`real-time annotations and respond to feedback.`);
  console.log();

  const setupMcp = await question(`Set up MCP server integration? [Y/n] `);
  const wantsMcp = setupMcp.toLowerCase() !== "n";

  if (wantsMcp) {
    let port = DEFAULT_PORT;
    const portAnswer = await question(`HTTP server port [4747]: `);
    port = parsePortInput(portAnswer);

    if (agent === "claude") {
      const claudeConfigPath = getClaudeConfigPath(homeDir);
      writeClaudeConfig(claudeConfigPath, port);
      console.log();
      console.log(`✓ Updated ${claudeConfigPath}`);
    } else {
      const codexConfigPath = getCodexConfigPath(homeDir);
      writeCodexConfig(codexConfigPath, port);
      console.log();
      console.log(`✓ Updated ${codexConfigPath}`);
    }
    if (agent === "claude") {
      // Register MCP server using Claude Code CLI for immediate availability.
      const mcpArgs = port === DEFAULT_PORT
        ? ["mcp", "add", "agentation", "--", "npx", "agentation-mcp", "server"]
        : ["mcp", "add", "agentation", "--", "npx", "agentation-mcp", "server", "--port", String(port)];

      console.log();
      console.log(`Running: claude ${mcpArgs.join(" ")}`);

      try {
        const result = spawn("claude", mcpArgs, { stdio: "inherit" });
        await new Promise<void>((resolve, reject) => {
          result.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`claude mcp add exited with code ${code}`));
          });
          result.on("error", reject);
        });
        console.log(`✓ Registered agentation MCP server with Claude Code`);
      } catch (err) {
        console.log(`✗ Could not register MCP server automatically: ${err}`);
        console.log(`  You can register manually by running:`);
        console.log(`  claude mcp add agentation -- npx agentation-mcp server`);
      }
    }
    console.log();

    // Test connection
    const testNow = await question(`Start server and test connection? [Y/n] `);
    if (testNow.toLowerCase() !== "n") {
      console.log();
      console.log(`Starting server on port ${port}...`);

      // Start server in background
      const server = spawn("npx", ["-y", "agentation-mcp", "server", "--port", String(port)], {
        stdio: "inherit",
        detached: false,
      });

      // Wait a moment for server to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Test health endpoint
      try {
        const response = await fetch(`http://localhost:${port}/health`);
        if (response.ok) {
          console.log();
          console.log(`✓ Server is running on http://localhost:${port}`);
          console.log(`✓ MCP tools available to ${agentLabel}`);
          console.log();
          console.log(`Press Ctrl+C to stop the server.`);

          // Keep running
          await new Promise(() => {});
        } else {
          console.log(`✗ Server health check failed: ${response.status}`);
          server.kill();
        }
      } catch (err) {
        console.log(`✗ Could not connect to server: ${err}`);
        server.kill();
      }
    }
  }

  console.log();
  console.log(`Setup complete! Run 'agentation-mcp doctor' to verify your setup.`);
  rl.close();
}

// ============================================================================
// DOCTOR COMMAND - Diagnostic checks
// ============================================================================

async function runDoctor() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const question = (q: string): Promise<string> =>
    new Promise((resolve) => rl.question(q, resolve));

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    Agentation MCP Doctor                      ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const agent = await promptForAgent(question);
  const agentLabel = getAgentLabel(agent);

  let allPassed = true;
  const results: Array<{ name: string; status: "pass" | "fail" | "warn"; message: string }> = [];

  // Check 1: Node version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0], 10);
  if (majorVersion >= 18) {
    results.push({ name: "Node.js", status: "pass", message: `${nodeVersion} (18+ required)` });
  } else {
    results.push({ name: "Node.js", status: "fail", message: `${nodeVersion} (18+ required)` });
    allPassed = false;
  }

  const homeDir = getHomeDir();
  let port = DEFAULT_PORT;

  // Check 2: Agent config
  if (agent === "claude") {
    const claudeConfigPath = getClaudeConfigPath(homeDir);
    if (fs.existsSync(claudeConfigPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(claudeConfigPath, "utf-8"));
        const agentationConfig = config.mcpServers?.agentation;
        if (agentationConfig) {
          results.push({ name: "Claude Code config", status: "pass", message: "MCP server configured" });
          port = parsePortFromArgArray((agentationConfig as Record<string, unknown>).args);
        } else {
          results.push({ name: "Claude Code config", status: "warn", message: "Config exists but no agentation MCP entry" });
        }
      } catch {
        results.push({ name: "Claude Code config", status: "fail", message: "Could not parse config file" });
        allPassed = false;
      }
    } else {
      results.push({ name: "Claude Code config", status: "warn", message: "No config found at ~/.claude/claude_code_config.json" });
    }
  } else {
    const codexConfigPath = getCodexConfigPath(homeDir);
    if (fs.existsSync(codexConfigPath)) {
      try {
        const configText = fs.readFileSync(codexConfigPath, "utf-8");
        if (configText.includes("[mcp_servers.agentation]")) {
          results.push({ name: "Codex config", status: "pass", message: "MCP server configured" });
          port = getCodexAgentationPort(configText);
        } else {
          results.push({ name: "Codex config", status: "warn", message: "Config exists but no agentation MCP entry" });
        }
      } catch {
        results.push({ name: "Codex config", status: "fail", message: "Could not read config file" });
        allPassed = false;
      }
    } else {
      results.push({ name: "Codex config", status: "warn", message: "No config found at ~/.codex/config.toml" });
    }
  }

  // Check 3: Server connectivity
  try {
    const response = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(2000) });
    if (response.ok) {
      results.push({ name: `Server (port ${port})`, status: "pass", message: "Running and healthy" });
    } else {
      results.push({ name: `Server (port ${port})`, status: "warn", message: `Responded with ${response.status}` });
    }
  } catch {
    results.push({
      name: `Server (port ${port})`,
      status: "warn",
      message: `Not running (start with: npx agentation-mcp server)`,
    });
  }

  // Print results
  for (const r of results) {
    const icon = r.status === "pass" ? "✓" : r.status === "fail" ? "✗" : "○";
    const color = r.status === "pass" ? "\x1b[32m" : r.status === "fail" ? "\x1b[31m" : "\x1b[33m";
    console.log(`${color}${icon}\x1b[0m ${r.name}: ${r.message}`);
  }

  console.log();
  if (allPassed) {
    console.log(`All checks passed for ${agentLabel}!`);
  } else {
    console.log(`Some checks failed. Run 'agentation-mcp init' to fix.`);
    rl.close();
    process.exit(1);
  }
  rl.close();
}

// ============================================================================
// COMMAND ROUTER
// ============================================================================

if (command === "init") {
  runInit().catch((err) => {
    console.error("Init failed:", err);
    process.exit(1);
  });
} else if (command === "doctor") {
  runDoctor().catch((err) => {
    console.error("Doctor failed:", err);
    process.exit(1);
  });
} else if (command === "server") {
  // Dynamic import to avoid loading server code for other commands
  import("./server/index.js").then(({ startHttpServer, startMcpServer, setApiKey }) => {
    const args = process.argv.slice(3);
    let port = 4747;
    let mcpOnly = false;
    let httpUrl = "http://localhost:4747";
    let apiKeyArg: string | undefined;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--port" && args[i + 1]) {
        const parsed = parseInt(args[i + 1], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
          port = parsed;
          if (!args.includes("--http-url")) {
            httpUrl = `http://localhost:${port}`;
          }
        }
        i++;
      }
      if (args[i] === "--mcp-only") {
        mcpOnly = true;
      }
      if (args[i] === "--http-url" && args[i + 1]) {
        httpUrl = args[i + 1];
        i++;
      }
      if (args[i] === "--api-key" && args[i + 1]) {
        apiKeyArg = args[i + 1];
        i++;
      }
    }

    // API key from flag or environment variable
    const apiKey = apiKeyArg || process.env.AGENTATION_API_KEY;
    if (apiKey) {
      setApiKey(apiKey);
    }

    if (!mcpOnly) {
      startHttpServer(port, apiKey);
    }
    startMcpServer(httpUrl).catch((err) => {
      console.error("MCP server error:", err);
      process.exit(1);
    });
  });
} else if (command === "help" || command === "--help" || command === "-h" || !command) {
  console.log(`
agentation-mcp - MCP server for Agentation visual feedback

Usage:
  agentation-mcp init                    Interactive setup wizard
  agentation-mcp server [options]        Start the annotation server
  agentation-mcp doctor                  Check your setup and diagnose issues
  agentation-mcp help                    Show this help message

Server Options:
  --port <port>      HTTP server port (default: 4747)
  --mcp-only         Skip HTTP server, only run MCP on stdio
  --http-url <url>   HTTP server URL for MCP to fetch from
  --api-key <key>    API key for cloud storage (or set AGENTATION_API_KEY env var)

Commands:
  init      Guided setup that configures Claude Code or Codex to use the MCP server.
            Claude: updates ~/.claude/claude_code_config.json
            Codex: updates ~/.codex/config.toml

  server    Starts both an HTTP server and MCP server for collecting annotations.
            The HTTP server receives annotations from the React component.
            The MCP server exposes tools for Claude Code or Codex to read/act on annotations.

  doctor    Runs diagnostic checks on your setup:
            - Node.js version
            - Selected coding agent configuration
            - Server connectivity

Examples:
  agentation-mcp init                Set up Agentation MCP
  agentation-mcp server              Start server on default port 4747
  agentation-mcp server --port 8080  Start server on port 8080
  agentation-mcp doctor              Check if everything is configured correctly

  # Use cloud storage with API key (local server proxies to cloud)
  agentation-mcp server --api-key ag_xxx

  # Or using environment variable
  AGENTATION_API_KEY=ag_xxx agentation-mcp server
`);
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Run 'agentation-mcp help' for usage information.");
  process.exit(1);
}
