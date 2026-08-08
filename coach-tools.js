const syncButton = document.querySelector("#sync-google-drive");
const syncStatus = document.querySelector("#sync-google-drive-status");

async function startGoogleDriveSync() {
  if (!window.confirm("Refresh all seven website tables from Google Drive now?")) return;
  syncButton.disabled = true;
  syncStatus.textContent = "Starting sync…";
  try {
    if (!window.WOLFPACK_AUTH?.syncGoogleDrive) throw new Error("Coach authentication is still loading. Try again in a moment.");
    const result = await window.WOLFPACK_AUTH.syncGoogleDrive();
    if (!result?.started) throw new Error("The sync could not be started.");
    syncStatus.textContent = "Sync started. Website updates usually appear within a few minutes.";
  } catch (error) {
    syncStatus.textContent = error?.message || "The sync could not be started.";
    syncButton.disabled = false;
  }
}

syncButton?.addEventListener("click", startGoogleDriveSync);
