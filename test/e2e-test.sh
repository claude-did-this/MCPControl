#!/bin/bash

# e2e-test.sh - End-to-end testing script for MCPControl test panel

# Handle command line arguments
ITERATIONS=${1:-1}  # Default to 1 iteration if not specified
MAX_SEQUENCE_LENGTH=6  # Maximum buttons in the sequence

# Function to clean up when script exits
cleanup() {
  echo "Cleaning up..."
  if [ -n "$CHROME_PID" ]; then
    kill $CHROME_PID 2>/dev/null
  fi
  if [ -n "$SERVER_PID" ]; then
    kill $SERVER_PID 2>/dev/null
  fi
  exit $1
}

# Set up trap for cleanup
trap 'cleanup 1' INT TERM

# Initialize success and failure counts
SUCCESS_COUNT=0
FAILURE_COUNT=0

# ANSI color codes
BOLD="\033[1m"
RESET="\033[0m"
MAGENTA="\033[38;2;187;128;255m"
BLUE="\033[38;2;127;187;255m"
CYAN="\033[38;2;94;210;234m"
GREEN="\033[38;2;158;255;142m"
YELLOW="\033[38;2;255;242;102m"
RED="\033[38;2;255;121;121m"
ORANGE="\033[38;2;255;170;83m"
PURPLE="\033[38;2;210;120;255m"
PINK="\033[38;2;255;127;227m"

echo -e "${BOLD}${MAGENTA}🧪 Running ${BLUE}$ITERATIONS${MAGENTA} test iterations${RESET}"

# Main test loop
for ITERATION in $(seq 1 $ITERATIONS); do
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${CYAN}🔄 Test ${ORANGE}$ITERATION${CYAN} of ${ORANGE}$ITERATIONS${RESET}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

  # Generate a random sequence of button clicks (0-9, A-F)
  SEQUENCE_LENGTH=$(( (RANDOM % MAX_SEQUENCE_LENGTH) + 1 ))
  BUTTON_SEQUENCE=""
  for i in $(seq 1 $SEQUENCE_LENGTH); do
    # Generate a random button ID (0-9, A-F for hexadecimal)
    BUTTON_ID=$(( RANDOM % 16 ))
    if [ $BUTTON_ID -lt 10 ]; then
      BUTTON_SEQUENCE="${BUTTON_SEQUENCE}${BUTTON_ID}"
    else
      # Convert to A-F
      CHAR_CODE=$(( BUTTON_ID - 10 + 65 ))  # ASCII 'A' starts at 65
      BUTTON_CHAR=$(printf \\$(printf '%03o' $CHAR_CODE))
      BUTTON_SEQUENCE="${BUTTON_SEQUENCE}${BUTTON_CHAR}"
    fi
  done


  # Create temporary log files for this iteration
  LOG_FILE=$(mktemp)
  TEST_EVENTS_LOG=$(mktemp)
  RESULT_FILE=$(mktemp)
  
  # Start the test server
  echo -e "${CYAN}🚀 Starting test server...${RESET}"
  cd "$(dirname "$0")/.."
  
  # Remove any old port file
  rm -f test/server-port.txt
  
  # Start the server and capture output while displaying it in real-time
  node test/test-server.js 2>&1 | tee "$TEST_EVENTS_LOG" &
  SERVER_PID=$!
  
  # Wait for server to be ready and port file to be created
  echo -e "${YELLOW}⏳ Waiting for server...${RESET}"
  MAX_WAIT=10
  for i in $(seq 1 $MAX_WAIT); do
    if [ -f "test/server-port.txt" ]; then
      break
    fi
    sleep 1
    
    # If we've waited too long, abort
    if [ $i -eq $MAX_WAIT ]; then
      echo -e "${RED}❌ Server start failed after $MAX_WAIT seconds${RESET}"
      cat "$TEST_EVENTS_LOG"
      cleanup 1
    fi
  done
  # Ensure a clear new line before server messages appear
  echo -e "\n"
  
  # Read the server port
  SERVER_PORT=$(cat test/server-port.txt)
  echo -e "${GREEN}✓ Server running on port ${CYAN}$SERVER_PORT${RESET}"
  
  # Reset test data
  curl -s "http://localhost:$SERVER_PORT/api/reset" > /dev/null
  
  # Start Chrome with the test server
  echo -e "${BLUE}🌐 Opening Chrome with test panel...${RESET}"
  if [[ -n "$WSL_DISTRO_NAME" || "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" --start-fullscreen "http://localhost:$SERVER_PORT" &
  else
    # Linux
    google-chrome --start-fullscreen "http://localhost:$SERVER_PORT" &
  fi
  CHROME_PID=$!
  
  # Wait for Chrome to initialize
  sleep 3
  
  # Create temporary prompt file for Claude
  PROMPT_FILE=$(mktemp)
  cat > "$PROMPT_FILE" << EOL
I need you to click buttons on the test panel in the following sequence: "$BUTTON_SEQUENCE"

1. The buttons have hexadecimal labels 0-9 and A-F, with text labels like "Button 0", "Button A", etc.
2. Click each button in the sequence exactly once, in the order provided.
3. Be precise - only click the buttons in the specified sequence.
4. After completing the sequence, respond with this EXACT confirmation message:
   "MCPTEST_DONE: Clicked button sequence $BUTTON_SEQUENCE"

Each button has a counter underneath showing how many times it's been clicked.
This test verifies MCPControl's ability to precisely automate UI interactions.
EOL

  CONFIG_FILE=$(mktemp)
  cat > "$CONFIG_FILE" << EOL
{
  "mcpServers": {
    "mcpcontrol": {
      "type": "stdio",
      "command": "./mcpcontrol-wrapper.sh",
      "args": [],
      "env": {}
    }
  }
}
EOL

  echo -e "${PURPLE}🤖 Testing with Claude & MCPControl...${RESET}"
  echo -e "${BOLD}${PINK}🎲 Test sequence: ${YELLOW}$BUTTON_SEQUENCE ${CYAN}(${ORANGE}$SEQUENCE_LENGTH${CYAN} buttons)${RESET}"
  cd "$(dirname "$0")/.."
  
  # Launch Claude with verbose output
  echo -e "${PURPLE}Claude's Response: ${RESET}"
  claude --print --mcp-config "$CONFIG_FILE" \
    --allowedTools \
      "mcp__mcpcontrol__click_at" \
      "mcp__mcpcontrol__click_mouse" \
      "mcp__mcpcontrol__double_click" \
      "mcp__mcpcontrol__focus_window" \
      "mcp__mcpcontrol__get_active_window" \
      "mcp__mcpcontrol__get_cursor_position" \
      "mcp__mcpcontrol__get_screen_size" \
      "mcp__mcpcontrol__get_screenshot" \
      "mcp__mcpcontrol__hold_key" \
      "mcp__mcpcontrol__move_mouse" \
      "mcp__mcpcontrol__press_key" \
      "mcp__mcpcontrol__press_key_combination" \
      "mcp__mcpcontrol__scroll_mouse" \
      "mcp__mcpcontrol__type_text" \
    < "$PROMPT_FILE" 2>&1 | tee -a "$LOG_FILE"

  echo -e "\n"
  
  # Kill Chrome
  if [ -n "$CHROME_PID" ]; then
    kill $CHROME_PID 2>/dev/null
  fi
  
  # Get the test results from the server
  echo -e "${BLUE}🔍 Collecting results...${RESET}"
  RESULTS_FILE="test/test-results.json"
  
  # Fetch the latest test results
  curl -s "http://localhost:$SERVER_PORT/api/test-data" > "$RESULTS_FILE"
  
  # Extract the final sequence
  if [ -f "$RESULTS_FILE" ]; then
    # Check if we have a finalSequence
    if grep -q "finalSequence" "$RESULTS_FILE"; then
      # Use jq if available, otherwise use grep/sed
      if command -v jq &> /dev/null; then
        ACTUAL_SEQUENCE=$(jq -r '.finalSequence' "$RESULTS_FILE")
      else
        ACTUAL_SEQUENCE=$(grep -o '"finalSequence":"[^"]*"' "$RESULTS_FILE" | cut -d'"' -f4)
      fi
    else
      echo -e "${RED}⚠️ No sequence found in results${RESET}"
    fi
  else
    echo -e "${RED}⚠️ Failed to retrieve test results${RESET}"
  fi
  
  # If we still don't have a sequence, we have a problem
  if [ -z "$ACTUAL_SEQUENCE" ]; then
    ACTUAL_SEQUENCE=""
  fi
  
  echo -e "${BOLD}${MAGENTA}▶ Results${RESET}"
  echo -e "  ${CYAN}Expected: ${YELLOW}$BUTTON_SEQUENCE${RESET}"
  echo -e "  ${CYAN}Actual:   ${YELLOW}$ACTUAL_SEQUENCE${RESET}"
  
  # Verify test results
  TEST_RESULT="FAILED"
  if [ "$ACTUAL_SEQUENCE" = "$BUTTON_SEQUENCE" ]; then
    echo -e "${BOLD}${GREEN}✅ TEST PASSED${RESET}"
    TEST_RESULT="PASSED"
    ((SUCCESS_COUNT++))
    
    # Save success evidence to a result log
    echo "RESULT: PASS" > "$RESULT_FILE"
    echo "Expected: $BUTTON_SEQUENCE" >> "$RESULT_FILE" 
    echo "Actual: $ACTUAL_SEQUENCE" >> "$RESULT_FILE"
  else
    echo -e "${BOLD}${RED}❌ TEST FAILED${RESET}"
    TEST_RESULT="FAILED"
    ((FAILURE_COUNT++))
    
    # Save failure information to result log
    echo "RESULT: FAIL" > "$RESULT_FILE"
    echo "Expected: $BUTTON_SEQUENCE" >> "$RESULT_FILE"
    echo "Actual: $ACTUAL_SEQUENCE" >> "$RESULT_FILE"
  fi

done  # End of iteration loop

# Print final test summary
echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${CYAN}🏁 Test Summary${RESET}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${BLUE}Total iterations:${RESET} ${ORANGE}$ITERATIONS${RESET}"
echo -e "${BOLD}${GREEN}Successful tests:${RESET} ${ORANGE}$SUCCESS_COUNT${RESET}"
echo -e "${BOLD}${RED}Failed tests:${RESET} ${ORANGE}$FAILURE_COUNT${RESET}"
SUCCESS_RATE=$(( (SUCCESS_COUNT * 100) / ITERATIONS ))
echo -e "${BOLD}${CYAN}Success rate:${RESET} ${YELLOW}$SUCCESS_RATE%${RESET}"

# Exit with appropriate code
if [ "$FAILURE_COUNT" -eq 0 ]; then
  echo -e "${BOLD}${GREEN}✅ ALL TESTS PASSED${RESET}"
  cleanup 0
else
  echo -e "${BOLD}${RED}❌ SOME TESTS FAILED${RESET}"
  cleanup 1
fi
