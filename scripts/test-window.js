// Direct test script for window handling
// Use CommonJS require for keysender
const keysender = require('keysender');
const { Hardware } = keysender;
const getAllWindows = keysender.getAllWindows;

console.log("Testing keysender window handling directly");

// Get all windows
const allWindows = getAllWindows();
console.log("\nAll windows:");
allWindows.forEach(window => {
  console.log(`- "${window.title}" (handle: ${window.handle}, class: ${window.className})`);
});

// Try to find Notepad
console.log("\nLooking for Notepad...");
const notepad = allWindows.find(w => w.title && w.title.includes('Notepad'));

if (notepad) {
  console.log(`Found Notepad: "${notepad.title}" (handle: ${notepad.handle})`);
  
  // Create hardware instance for Notepad
  try {
    const hw = new Hardware(notepad.handle);
    console.log("Created Hardware instance for Notepad");
    
    // Try to get window view
    try {
      const view = hw.workwindow.getView();
      console.log("Notepad view:", view);
    } catch (e) {
      console.error("Error getting Notepad view:", e.message);
    }
    
    // Try to set as foreground
    try {
      hw.workwindow.setForeground();
      console.log("Set Notepad as foreground window");
    } catch (e) {
      console.error("Error setting Notepad as foreground:", e.message);
    }
    
    // Try to resize
    try {
      hw.workwindow.setView({
        x: 200,
        y: 200,
        width: 800,
        height: 600
      });
      console.log("Resized Notepad to 800x600 at position (200, 200)");
      
      // Get updated view
      const updatedView = hw.workwindow.getView();
      console.log("Updated Notepad view:", updatedView);
    } catch (e) {
      console.error("Error resizing Notepad:", e.message);
    }
  } catch (e) {
    console.error("Error creating Hardware instance for Notepad:", e.message);
  }
} else {
  console.log("Notepad not found. Please make sure Notepad is running.");
}

// Try with default Hardware instance
console.log("\nTesting default Hardware instance:");
try {
  const defaultHw = new Hardware();
  console.log("Created default Hardware instance");
  
  // Try to get current window
  try {
    const currentWindow = defaultHw.workwindow.get();
    console.log("Current window:", currentWindow);
  } catch (e) {
    console.error("Error getting current window:", e.message);
  }
  
  // Try to get view
  try {
    const view = defaultHw.workwindow.getView();
    console.log("Current view:", view);
  } catch (e) {
    console.error("Error getting current view:", e.message);
  }
} catch (e) {
  console.error("Error creating default Hardware instance:", e.message);
}
