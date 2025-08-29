import esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import { exec } from 'child_process';
import https from 'https';
import { createProxyMiddleware } from 'http-proxy-middleware';

const isProduction = process.argv.includes('--production');
const watchMode = process.argv.includes('--watch');

const outdir = 'dist';

async function copyPublicFiles() {
  try {
    await fs.mkdir(outdir, { recursive: true });
    await fs.copyFile(path.join('public', 'index.html'), path.join(outdir, 'index.html'));
    const publicFiles = await fs.readdir('public');
    for (const file of publicFiles) {
      await fs.copyFile(path.join('public', file), path.join(outdir, file));
      console.log(`public/${file} copied to dist/${file}`);
    }
  } catch (err) {
    console.error('Error copying public files:', err);
    process.exit(1);
  }
}

const buildOptions = {
  entryPoints: ['src/index.jsx'],
  bundle: true,
  outfile: path.join(outdir, 'bundle.js'),
  minify: isProduction,
  sourcemap: !isProduction,
  platform: 'browser',
  format: 'iife', // Immediately Invoked Function Expression, good for browser scripts
  loader: {
    '.js': 'jsx', // Process .js files that might contain JSX
    '.jsx': 'jsx',
  },
  define: {
    'process.env.NODE_ENV': isProduction ? '"production"' : '"development"',
  },
  jsx: 'automatic', // esbuild will automatically use the new JSX transform
};

async function startDevServer() {
  await copyPublicFiles(); // Ensure public/index.html is in dist first

  const ctx = await esbuild.context({
    ...buildOptions, // Uses development settings because isProduction is false here
    // No need for live reload banner if not implementing SSE here, manual refresh is fine.
    // banner: { js: ' (() => new EventSource("/esbuild").onmessage = () => location.reload())();' },
  });

  await ctx.watch(); // Start esbuild's watch mode for rebuilding on changes

  const app = express();
  const devServerPort = 443; // Default port for HTTPS
  const targetApiUrl = 'http://localhost:3333'; // Target for proxying
  const pywebApiUrl = 'http://localhost:8000' // Python API engine

  // Serve static files from 'dist' directory
  app.use(express.static(outdir));

  // Proxy all other requests (those not served by express.static)
  app.use('/', createProxyMiddleware({
    target: targetApiUrl,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[DevProxy] ${req.method} ${req.originalUrl} -> ${targetApiUrl}${proxyReq.path}`);
    },
    onError: (err, req, res) => {
      console.error('[DevProxy] Error:', err.message);
      if (res && typeof res.writeHead === 'function' && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Proxy error: Could not connect to target service.');
      } else if (res && res.socket && !res.socket.destroyed) {
        // Fallback if headers already sent or res.writeHead is not available
        res.socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      }
    }
  }));

  // HTTPS setup
  const certPath = path.join(process.env.HOME, '.consumer-certs', 'consumer.crt');
  const keyPath = path.join(process.env.HOME, '.consumer-certs', 'consumer.key');

  try {
    const privateKey = await fs.readFile(keyPath, 'utf8');
    const certificate = await fs.readFile(certPath, 'utf8');

    const credentials = { key: privateKey, cert: certificate };
    const httpsServer = https.createServer(credentials, app);

    httpsServer.listen(devServerPort, () => {
      const openUrl = `https://local.cookson.pro:${devServerPort}`;
      console.log(`\nDevelopment server running on ${openUrl}`);
      console.log(`Serving static files from ./${outdir}`);
      console.log(`Proxying other requests to ${targetApiUrl}`);
      console.log('esbuild is watching for changes...');

      // Open the browser
      const openCommand = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      exec(`${openCommand} ${openUrl}`, (err) => {
        if (err) {
          console.error(`Failed to open browser: ${err.message}`);
        }
      });
    });
  } catch (err) {
    console.error(`\nError starting HTTPS server: ${err.message}`);
    console.error(`Please ensure '${certPath}' and '${keyPath}' exist and are readable.`);
    process.exit(1);
  }
}

async function build() {
  if (watchMode && !isProduction) {
    await startDevServer();
  } else {
    // Production build
    try {
      await copyPublicFiles();
      // buildOptions is already configured for production/development based on isProduction flag
      await esbuild.build(buildOptions);
      console.log('Production build finished.');
    } catch (error) {
      console.error('Production build failed:', error);
      process.exit(1);
    }
  }
}

build();