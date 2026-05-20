# Call Sign Generator — Setup Instructions

The web page (`index.html`) is a static file. On its own it cannot save
submissions to a spreadsheet — a browser page has no access to files. To
collect entries to a Google Sheet, you deploy the Google Apps Script below. It
is a small, free service that runs on Google's servers.

Until the script is deployed, the page still works: every submission is saved
in the browser's local storage as a fallback (see "Fallback" at the bottom).

---

## What you need

- A Google account (a regular Gmail account is fine).
- About 10 minutes.

---

## Step 1 — Create the Google Sheet

1. Go to <https://sheets.google.com> and create a new, blank spreadsheet.
2. Name it something like **Call Sign Generator — Entries**.
3. Leave it empty. The script adds the header row automatically.

## Step 2 — Open the Apps Script editor

1. In the Sheet, click **Extensions ▸ Apps Script**.
2. A new tab opens with a file called `Code.gs` containing an empty
   `function myFunction() {}`.
3. Delete everything in that file and paste in the **entire script** from
   Step 3 below.
4. Click the **Save** icon (💾).

## Step 3 — The script

Paste this into `Code.gs`:

```javascript
/**
 * Blue Angels Foundation — Call Sign Generator
 * Receives a submission from the web page and appends it to this Sheet.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // avoid two submissions writing at once

  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Write the header row once, on the first submission.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Hometown', 'Hobby',
                       'Trait', 'Animal', 'Weather', 'Motto', 'Call Sign',
                       'Story']);
    }

    sheet.appendRow([data.timestamp, data.name, data.email, data.hometown,
                     data.hobby, data.trait, data.animal, data.weather,
                     data.motto, data.callsign, data.story]);

    return ContentService.createTextOutput('OK');
  } catch (err) {
    return ContentService.createTextOutput('ERROR: ' + err);
  } finally {
    lock.releaseLock();
  }
}
```

## Step 4 — Deploy as a Web App

1. In the Apps Script editor, click **Deploy ▸ New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** `Call sign generator`
   - **Execute as:** **Me** (your account)
   - **Who has access:** **Anyone**
4. Click **Deploy**.
5. Google asks you to **authorize**. Click through, choose your account, and
   on the "Google hasn't verified this app" screen click **Advanced ▸ Go to
   (project name)**, then **Allow**. You are granting the script permission to
   edit the Sheet *as you* — this is expected.
6. Copy the **Web app URL**. It looks like
   `https://script.google.com/macros/s/AKfy...../exec`.

## Step 5 — Connect the web page

1. Open `index.html` in a text editor.
2. Find this line near the top of the `<script>` section:

   ```javascript
   const SHEET_ENDPOINT = 'PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```

3. Replace the placeholder with the Web app URL from Step 4:

   ```javascript
   const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfy...../exec';
   ```

4. Save the file.

## Step 6 — Test

1. Open `index.html` and complete the quiz.
2. Confirm a new row appears in the Google Sheet.

Done.

---

## Important notes

- **Editing the script later:** after any change to `Code.gs`, the live web
  app does **not** update automatically. Go to **Deploy ▸ Manage deployments**,
  click the pencil ✏️, set **Version** to **New version**, and **Deploy**. The
  URL stays the same.
- The page sends data "fire-and-forget" (it does not wait for a reply), so a
  slow script never blocks the participant from seeing their call sign.

---

## Fallback (before the script is deployed)

Every submission is always saved in the browser's local storage too, so no
entry is ever lost. To download what's been collected on a device:

1. Open the page with `#admin` added to the URL, e.g.
   `…/index.html#admin`.
2. A bar appears at the bottom — click **Download entries.csv**.
3. The file lands in your Downloads folder.

Note that entries live in the storage of the *specific browser* they were
collected on — export from the same device. `entries.csv` is intentionally
listed in `.gitignore` because it contains email addresses.
