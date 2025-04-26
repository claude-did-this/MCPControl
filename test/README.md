# MCPControl Testing Tools

This directory contains tools for testing MCPControl's accuracy and reliability.

## Test Panel

The `test-panel.html` file provides an interactive button panel for testing mouse click accuracy with MCPControl. It's designed as a standalone HTML file that can be hosted on any web server or opened directly in a browser.

### Features

- 4x4 grid of interactive buttons
- Click counters for each button
- Visual feedback when buttons are clicked with fade animation
- Statistics tracking (total clicks, last clicked, most clicked)
- Activity logging with timestamps
- Tokyo Night color scheme with chalkboard aesthetic
- Responsive design with separate log panel
- Sound effects for clicks

### Usage

To use the test panel:

1. Open `test-panel.html` in a web browser
2. Click on buttons manually or use MCPControl to automate clicks
3. View statistics and logs to verify accuracy

You can also use the "Click Random Button" feature to generate random clicks for testing.

## Automated Test Script

The `accuracy-test.js` script provides a framework for automated accuracy testing:

1. Starts a local web server to host the test panel
2. Opens the test panel in a browser
3. Launches MCPControl
4. Can be extended to send programmatic click commands to test accuracy

### Requirements

To run the automated test script, you'll need:

```
npm install express open
```

### Usage

```
node test/accuracy-test.js
```

## Test Methodology

For comprehensive accuracy testing:

1. Run the test panel in a browser window
2. Position the window consistently on screen
3. Use MCPControl commands to target specific buttons
4. Compare expected vs. actual click counts
5. Analyze results for accuracy patterns

The log panel on the right side of the screen provides detailed timing information for every click, making it easy to analyze the results.

## AWS Integration

For AWS-based automated testing:

1. Host the test panel on S3 or GitHub Pages
2. Configure Windows EC2 instances with MCPControl
3. Run the automated tests on schedule
4. Capture and store results for analysis

This enables automated regression testing in cloud environments.