"use client";

import { useState, useId, useRef, useEffect } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { Footer } from "../Footer";
import { motion, useAnimate, type AnimationSequence } from "framer-motion";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [scope, animate] = useAnimate();
  const maskId = useId();

  const inSequence: AnimationSequence = [
    [
      '[data-part="square-front"]',
      { y: [0, -4] },
      { duration: 0.12, ease: "easeOut" },
    ],
    [
      '[data-part="square-back"]',
      { x: [0, -4] },
      { at: "<", duration: 0.12, ease: "easeOut" },
    ],
    [
      '[data-part="square-front"], [data-part="square-back"]',
      {
        rx: [2, 7.25],
        width: [10.5, 14.5],
        height: [10.5, 14.5],
        rotate: [0, -45],
      },
      { at: "<", duration: 0.12, ease: "easeOut" },
    ],
    [
      '[data-part="check"]',
      { opacity: [0, 1], pathOffset: [1, 0] },
      { at: "-0.03", duration: 0 },
    ],
    ['[data-part="check"]', { pathLength: [0, 1] }, { duration: 0.1 }],
  ];

  const outSequence: AnimationSequence = [
    [
      '[data-part="check"]',
      { pathOffset: [0, 1] },
      { duration: 0.1, ease: "easeOut" },
    ],
    [
      '[data-part="check"]',
      { opacity: [1, 0], pathLength: [1, 0] },
      { duration: 0 },
    ],
    [
      '[data-part="square-front"], [data-part="square-back"]',
      {
        rx: [7.25, 2],
        width: [14.5, 10.5],
        height: [14.5, 10.5],
        rotate: [-45, 0],
      },
      { at: "+0.03", duration: 0.12, ease: "easeOut" },
    ],
    [
      '[data-part="square-front"]',
      { y: [-4, 0] },
      { at: "<", duration: 0.12, ease: "easeOut" },
    ],
    [
      '[data-part="square-back"]',
      { x: [-4, 0] },
      { at: "<", duration: 0.12, ease: "easeOut" },
    ],
  ];

  const isFirstRender = useRef(true);
  const hasAnimatedIn = useRef(false);
  const inAnimation = useRef<ReturnType<typeof animate> | null>(null);
  const outAnimation = useRef<ReturnType<typeof animate> | null>(null);

  const animateIn = async () => {
    if (
      !inAnimation.current &&
      !outAnimation.current &&
      !hasAnimatedIn.current
    ) {
      const animation = animate(inSequence);
      inAnimation.current = animation;
      await animation;
      inAnimation.current = null;
      if (animation.speed === 1) hasAnimatedIn.current = true;
    } else if (outAnimation.current) {
      outAnimation.current.speed = -1;
    } else if (inAnimation.current) {
      inAnimation.current.speed = 1;
    }
  };

  const animateOut = async () => {
    if (inAnimation.current) {
      inAnimation.current.speed = -1;
    } else if (hasAnimatedIn.current && !outAnimation.current) {
      const animation = animate(outSequence);
      outAnimation.current = animation;
      await animation;
      outAnimation.current = null;
      if (animation.speed === 1) hasAnimatedIn.current = false;
    } else if (outAnimation.current) {
      outAnimation.current.speed = 1;
    }
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    copied ? animateIn() : animateOut();
  }, [copied]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="copy-button"
      title="Copy to clipboard"
      style={{
        position: "absolute",
        top: "50%",
        right: "0.75rem",
        transform: "translateY(-50%)",
        padding: "0.375rem",
        background: "transparent",
        border: "none",
        borderRadius: "0.25rem",
        cursor: "pointer",
        color: "rgba(0,0,0,0.35)",
        transition: "color 0.15s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        ref={scope}
        style={{ overflow: "visible" }}
        width={20}
        height={20}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        aria-hidden="true"
      >
        <motion.rect
          data-part="square-front"
          x="4.75"
          y="8.75"
          width="10.5"
          height="10.5"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <g mask={`url(#${maskId})`}>
          <motion.rect
            data-part="square-back"
            x="8.75"
            y="4.75"
            width="10.5"
            height="10.5"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </g>
        <motion.path
          data-part="check"
          initial={{ pathLength: 0, opacity: 0 }}
          d="M9.25 12.25L11 14.25L15 10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#fff" />
          <motion.rect
            data-part="square-front"
            x="4.75"
            y="8.75"
            width="10.5"
            height="10.5"
            rx="2"
            fill="#000"
            stroke="#000"
            strokeWidth="1.5"
          />
        </mask>
      </svg>
    </button>
  );
}

function CodeBlock({
  code,
  language = "tsx",
  copyable = false,
}: {
  code: string;
  language?: string;
  copyable?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <Highlight theme={themes.github} code={code.trim()} language={language}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className="code-block"
            style={{ ...style, background: "transparent" }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
      {copyable && <CopyButton text={code.trim()} />}
    </div>
  );
}

export default function InstallPage() {
  return (
    <>
      <article className="article">
        <header>
          <h1>Installation</h1>
          <p className="tagline">Get started with Agentation in your project</p>
        </header>

        <section>
          <h2>Choose your setup</h2>
          <ul>
            <li><strong>Just want annotations?</strong> &rarr; Basic Setup below (copy-paste to agent)</li>
            <li><strong>Using Claude Code?</strong> &rarr; Add the <code>/agentation</code> skill (auto-setup)</li>
            <li><strong>Building a custom agent?</strong> &rarr; Run MCP server for real-time sync</li>
          </ul>
          <p style={{ fontSize: "0.875rem", color: "rgba(0,0,0,0.5)", marginTop: "0.5rem" }}>
            Most users: Basic + Claude Code skill. Power users: Basic + MCP server.
          </p>
        </section>

        <section>
          <h2>Install the package</h2>
          <CodeBlock code="npm install agentation" language="bash" copyable />
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(0,0,0,0.5)",
              marginTop: "0.5rem",
            }}
          >
            Or use yarn, pnpm, or bun.
          </p>
        </section>

        <section>
          <h2>Add to your app</h2>
          <p>
            Add the component anywhere in your React app, ideally at the root
            level. The <code>NODE_ENV</code> check ensures it only loads in
            development.
          </p>
          <CodeBlock
            code={`import { Agentation } from "agentation";

function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV === "development" && <Agentation />}
    </>
  );
}`}
            language="tsx"
          />
        </section>

        <section>
          <h2>Claude Code</h2>
          <p>
            If you use Claude Code, you can set up Agentation automatically with the <code>/agentation</code> skill. Install it:
          </p>
          <CodeBlock code="npx add-skill benjitaylor/agentation" language="bash" copyable />
          <p style={{ marginTop: "1rem" }}>
            Then in Claude Code:
          </p>
          <CodeBlock code="/agentation" language="bash" copyable />
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(0,0,0,0.5)",
              marginTop: "0.5rem",
            }}
          >
            Detects your framework, installs the package, creates a provider, and wires it into your layout.
          </p>
        </section>

        <section>
          <h2>Agent Integration (Optional)</h2>
          <p>
            Connect Agentation to any AI coding agent that supports{" "}
            <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">MCP</a>.
            This enables real-time annotation syncing and bidirectional communication.
          </p>

          <h3>1. Start the server</h3>
          <p>
            The Agentation server runs two services: an HTTP server that receives
            annotations from the React component, and an MCP server that exposes
            tools for AI agents to read and act on feedback.
          </p>
          <CodeBlock code="npx agentation server" language="bash" copyable />
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(0,0,0,0.5)",
              marginTop: "0.5rem",
            }}
          >
            Runs on port 4747 by default. Use <code>--port 8080</code> to change it.
          </p>

          <h3>2. Configure your agent</h3>
          <p>
            Add Agentation as an MCP server in your agent&apos;s config. Example for Claude Code:
          </p>
          <CodeBlock
            code={`// Edit ~/.claude.json (Claude Code's global config)
// Find or create: "projects" → "/absolute/path/to/your/project"
{
  "mcpServers": {
    "agentation": {
      "command": "npx",
      "args": ["agentation", "server"]
    }
  }
}`}
            language="json"
          />

          <h3>3. Connect the component</h3>
          <p>
            Point the React component to your server:
          </p>
          <CodeBlock
            code={`<Agentation
  endpoint="http://localhost:4747"
  onSessionCreated={(sessionId) => {
    console.log("Session started:", sessionId);
  }}
/>`}
            language="tsx"
          />
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(0,0,0,0.5)",
              marginTop: "0.5rem",
            }}
          >
            The component syncs annotations to the server automatically. Any MCP-compatible
            agent can then read them via the exposed tools.
          </p>

          <p style={{ marginTop: "1.5rem" }}>
            <strong>Other agents:</strong> Any tool that supports MCP can connect.
            Point your agent&apos;s MCP config to <code>npx agentation server</code> and
            it will have access to annotation tools like <code>agentation_get_pending</code>,{" "}
            <code>agentation_list_sessions</code>, and <code>agentation_resolve</code>.
          </p>
        </section>

        <section>
          <h2>Requirements</h2>
          <ul>
            <li>
              <strong>React 18+</strong> &mdash; Uses modern React features
            </li>
            <li>
              <strong>Client-side only</strong> &mdash; Requires DOM access
            </li>
            <li>
              <strong>Desktop only</strong> &mdash; Not optimized for mobile
              devices
            </li>
            <li>
              <strong>Zero dependencies</strong> &mdash; No runtime deps beyond
              React
            </li>
          </ul>
        </section>

        <section>
          <h2>Props</h2>
          <p>
            All props are optional. The component works with zero configuration.
          </p>

          <h3 style={{ fontSize: "0.9375rem", marginTop: "1.5rem", marginBottom: "0.5rem" }}>Callbacks</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <tbody>
              <tr>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)", width: "35%" }}>
                  <code>onAnnotationAdd</code>
                </td>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}>
                  Fired when an annotation is added
                </td>
              </tr>
              <tr>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <code>onAnnotationDelete</code>
                </td>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}>
                  Fired when an annotation is deleted
                </td>
              </tr>
              <tr>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <code>onAnnotationUpdate</code>
                </td>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}>
                  Fired when an annotation comment is edited
                </td>
              </tr>
              <tr>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <code>onAnnotationsClear</code>
                </td>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}>
                  Fired when all annotations are cleared
                </td>
              </tr>
              <tr>
                <td style={{ padding: "0.5rem 0" }}>
                  <code>onCopy</code>
                </td>
                <td style={{ padding: "0.5rem 0", color: "rgba(0,0,0,0.5)" }}>
                  Fired when copy button is clicked (receives markdown)
                </td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: "0.9375rem", marginTop: "1.5rem", marginBottom: "0.5rem" }}>Behavior</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <tbody>
              <tr>
                <td style={{ padding: "0.5rem 0", width: "35%" }}>
                  <code>copyToClipboard</code>
                </td>
                <td style={{ padding: "0.5rem 0", color: "rgba(0,0,0,0.5)" }}>
                  Auto-copy on add (default: <code style={{ color: "rgba(0,0,0,0.7)" }}>true</code>)
                </td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: "0.9375rem", marginTop: "1.5rem", marginBottom: "0.5rem" }}>Agent Sync</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <tbody>
              <tr>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)", width: "35%" }}>
                  <code>endpoint</code>
                </td>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}>
                  Server URL (e.g., <code style={{ color: "rgba(0,0,0,0.7)" }}>&quot;http://localhost:4747&quot;</code>)
                </td>
              </tr>
              <tr>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <code>sessionId</code>
                </td>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}>
                  Join an existing session (optional)
                </td>
              </tr>
              <tr>
                <td style={{ padding: "0.5rem 0" }}>
                  <code>onSessionCreated</code>
                </td>
                <td style={{ padding: "0.5rem 0", color: "rgba(0,0,0,0.5)" }}>
                  Fired when new session is created (receives <code style={{ color: "rgba(0,0,0,0.7)" }}>sessionId: string</code>)
                </td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: "0.9375rem", marginTop: "1.5rem", marginBottom: "0.5rem" }}>Demo Mode</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <tbody>
              <tr>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)", width: "35%" }}>
                  <code>enableDemoMode</code>
                </td>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}>
                  Auto-play demo annotations (default: <code style={{ color: "rgba(0,0,0,0.7)" }}>false</code>)
                </td>
              </tr>
              <tr>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <code>demoAnnotations</code>
                </td>
                <td style={{ padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.5)" }}>
                  Array of <code style={{ color: "rgba(0,0,0,0.7)" }}>{`{ selector, comment }`}</code> for demo
                </td>
              </tr>
              <tr>
                <td style={{ padding: "0.5rem 0" }}>
                  <code>demoDelay</code>
                </td>
                <td style={{ padding: "0.5rem 0", color: "rgba(0,0,0,0.5)" }}>
                  Delay between demo annotations in ms (default: <code style={{ color: "rgba(0,0,0,0.7)" }}>1000</code>)
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Programmatic integration</h2>
          <p>
            Use the <code>onAnnotationAdd</code> callback to receive structured
            annotation data directly. See the <a href="/api">API page</a> for all available callbacks.
          </p>
          <CodeBlock
            code={`import { Agentation, type Annotation } from "agentation";

function App() {
  const handleAnnotation = (annotation: Annotation) => {
    // Structured data - no parsing needed
    console.log(annotation.element);      // "Button"
    console.log(annotation.elementPath);  // "body > div > button"
    console.log(annotation.boundingBox);  // { x, y, width, height }

    // Send to your agent, API, etc.
    sendToAgent(annotation);
  };

  return (
    <>
      <YourApp />
      <Agentation
        onAnnotationAdd={handleAnnotation}
        copyToClipboard={false}  // Skip clipboard if handling via callback
      />
    </>
  );
}`}
            language="tsx"
          />
        </section>

        <section>
          <h2>Security notes</h2>
          <p>
            Agentation runs in your browser and reads DOM content to generate
            feedback. By default, it does <strong>not</strong> send data anywhere &mdash;
            everything stays local until you manually copy and paste.
          </p>
          <ul>
            <li>
              <strong>No external requests</strong> &mdash; all processing is
              client-side by default
            </li>
            <li>
              <strong>Local server only</strong> &mdash; when using the <code>endpoint</code> prop,
              data is sent to your local machine only (localhost)
            </li>
            <li>
              <strong>No data collection</strong> &mdash; nothing is tracked or
              stored remotely
            </li>
            <li>
              <strong>Dev-only</strong> &mdash; use the <code>NODE_ENV</code>{" "}
              check to exclude from production
            </li>
          </ul>
        </section>
      </article>

      <Footer />
    </>
  );
}
