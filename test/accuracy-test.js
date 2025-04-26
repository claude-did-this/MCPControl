// MCPControl Accuracy Test
// This script can be used to automate testing of the mouse click accuracy
// against the test-panel.html

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const open = require('open');
const express = require('express');

// Configuration
const TEST_DURATION = process.env.TEST_DURATION || 60000; // 1 minute test by default
const CLICK_INTERVAL = process.env.CLICK_INTERVAL || 1000; // Click every second
const SERVER_PORT = process.env.SERVER_PORT || 3000;

// Start a simple server to host the test panel
function startServer() {
    const app = express();
    app.use(express.static(path.resolve(__dirname, '..')));
    
    const server = app.listen(SERVER_PORT, () => {
        console.log(`Test panel server running at http://localhost:${SERVER_PORT}/test/test-panel.html`);
    }).on('error', (err) => {
        console.error(`Failed to start server: ${err.message}`);
        process.exit(1);
    });
    
    return server;
}

// Start MCPControl programmatically
function startMCPControl() {
    try {
        const mcpProcess = spawn('npx', ['--no-cache', '-y', 'mcp-control'], {
            stdio: 'pipe'
        });
        
        mcpProcess.stdout.on('data', (data) => {
            console.log(`MCPControl: ${data}`);
        });
        
        mcpProcess.stderr.on('data', (data) => {
            console.error(`MCPControl error: ${data}`);
        });
        
        mcpProcess.on('error', (err) => {
            console.error(`Failed to start MCPControl: ${err.message}`);
            process.exit(1);
        });
        
        return mcpProcess;
    } catch (error) {
        console.error(`Exception when starting MCPControl: ${error.message}`);
        process.exit(1);
    }
}

// Run automated clicks test
async function runAccuracyTest() {
    console.log('Starting accuracy test...');
    
    // Start server
    const server = startServer();
    
    try {
        // Open test panel in browser
        await open(`http://localhost:${SERVER_PORT}/test/test-panel.html`);
        
        // Give browser time to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Start MCPControl
        const mcpControl = startMCPControl();
        
        // Wait for MCPControl to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Test running - will click random buttons for 1 minute...');
        
        // Here you would add code to send commands to MCPControl
        // For demonstration, we're just showing the structure
        
        // Example (pseudo-code):
        // for each click interval:
        //   1. Get random button position
        //   2. Send mouse click command to MCPControl
        //   3. Log results
        
        // Clean up after test duration
        setTimeout(() => {
            console.log('Test complete!');
            
            // Kill MCPControl process
            mcpControl.kill();
            
            // Close server
            server.close(() => {
                console.log('Server closed successfully');
            });
            
            console.log('Check browser for click accuracy results');
        }, TEST_DURATION);
    } catch (error) {
        console.error(`Error during test execution: ${error.message}`);
        server.close();
        process.exit(1);
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    runAccuracyTest().catch(error => {
        console.error(`Uncaught error in accuracy test: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { runAccuracyTest };