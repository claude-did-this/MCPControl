import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseUrl } from 'url';

// Get the directory name correctly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test results that will be collected during testing
let testResults = {
  buttonClicks: [],
  sequences: [],
  finalSequence: null,
  startTime: new Date().toISOString()
};

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = parseUrl(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle API endpoints
  if (pathname === '/api/test-data') {
    if (req.method === 'POST') {
      // Collect test data from the client
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          
          // If this is a click event
          if (data.type === 'click') {
            testResults.buttonClicks.push({
              timestamp: new Date().toISOString(),
              buttonId: data.buttonId,
              count: data.count
            });
            
            // Format click event with colored output
            console.log(`\x1b[38;2;127;187;255mClicked: ${data.buttonId}\x1b[0m`);
          }
          
          // If this is a sequence update
          if (data.type === 'sequence') {
            testResults.sequences.push({
              timestamp: new Date().toISOString(),
              sequence: data.sequence
            });
            
            // Removed sequence logging to simplify output
          }
          
          // If this is the final result
          if (data.type === 'final') {
            testResults.finalSequence = data.sequence;
            testResults.endTime = new Date().toISOString();
            
            // Write the results to a file for the test script to read
            fs.writeFileSync(
              path.join(__dirname, 'test-results.json'), 
              JSON.stringify(testResults, null, 2)
            );
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          console.error('Error processing data:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });
    } else if (req.method === 'GET') {
      // Return the current test results
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(testResults));
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    }
    return;
  }

  // Reset test results endpoint
  if (pathname === '/api/reset') {
    testResults = {
      buttonClicks: [],
      sequences: [],
      finalSequence: null,
      startTime: new Date().toISOString()
    };
    
    // Remove existing results file if it exists
    const resultsPath = path.join(__dirname, 'test-results.json');
    if (fs.existsSync(resultsPath)) {
      fs.unlinkSync(resultsPath);
    }
    
    console.log('Test results reset');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Serve the test panel HTML
  if (pathname === '/' || pathname === '/index.html') {
    fs.readFile(path.join(__dirname, '..', 'test-panel.html'), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
        return;
      }
      
      // Insert our API client code
      const apiClientCode = `
        // API client for test automation
        window.testAPI = {
          reportClick: function(buttonId, count) {
            fetch('/api/test-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                type: 'click', 
                buttonId: buttonId, 
                count: count 
              })
            }).catch(console.error);
          },
          
          reportSequence: function(sequence) {
            fetch('/api/test-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                type: 'sequence', 
                sequence: sequence.join ? sequence.join('') : sequence 
              })
            }).catch(console.error);
          },
          
          reportFinalResult: function(sequence) {
            fetch('/api/test-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                type: 'final', 
                sequence: sequence.join ? sequence.join('') : sequence 
              })
            }).catch(console.error);
          }
        };
      `;
      
      // Insert the API client code before the closing body tag
      const modifiedData = data.replace('</body>', `<script>${apiClientCode}</script></body>`);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(modifiedData);
    });
    return;
  }

  // Handle 404 - Not Found
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

// Check if a port is in use
function isPortAvailable(port) {
  return new Promise((resolve) => {
    import('net').then(({ default: net }) => {
      const tester = net.createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
          tester.close();
          resolve(true);
        })
        .listen(port);
    }).catch(() => resolve(false));
  });
}

// Find an available port and start the server
async function startServer() {
  const preferredPorts = [3000, 3001, 3002, 3003, 3004, 3005, 8080, 8081, 8082];
  let port = process.env.PORT;
  
  // If PORT is not set, try to find an available port
  if (!port) {
    for (const preferredPort of preferredPorts) {
      if (await isPortAvailable(preferredPort)) {
        port = preferredPort;
        break;
      }
    }
  }
  
  // If we still don't have a port, use a random high port
  if (!port) {
    port = Math.floor(Math.random() * 16384) + 49152; // Random port between 49152 and 65535
  }
  
  server.listen(port, () => {
    // Write the port to a file for the test script to read
    fs.writeFileSync(
      path.join(__dirname, 'server-port.txt'), 
      port.toString()
    );
  });
}

// Start the server
startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
