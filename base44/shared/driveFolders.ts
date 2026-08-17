// Shared Google Drive folder helpers used by Drive-related backend functions.
// All functions require an OAuth access token for the "googledrive" connector.

export const ROOT_FOLDER_NAME = "Project Invoices";

async function findFolder(name: string, parentId: string | null, accessToken: string): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false` +
    (parentId ? ` and '${parentId}' in parents` : "")
  );
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

async function createFolder(name: string, parentId: string | null, accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });
  const data = await res.json();
  return data.id;
}

export async function findOrCreateFolder(name: string, parentId: string | null, accessToken: string): Promise<string> {
  const existing = await findFolder(name, parentId, accessToken);
  if (existing) return existing;
  return await createFolder(name, parentId, accessToken);
}

// Returns the id of the per-project folder (under the app root), creating it if needed.
export async function getProjectFolderId(projectName: string, accessToken: string): Promise<string> {
  const rootFolderId = await findOrCreateFolder(ROOT_FOLDER_NAME, null, accessToken);
  return await findOrCreateFolder(projectName, rootFolderId, accessToken);
}

// Find a non-trashed file by name inside a parent folder.
export async function findFile(name: string, parentId: string, accessToken: string): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and trashed=false and '${parentId}' in parents`
  );
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

export async function deleteFile(fileId: string, accessToken: string): Promise<void> {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// Upload a file blob to a parent folder. If a file with the same name already exists
// it is replaced (old deleted, new uploaded) so each project keeps a single current copy.
export async function uploadFileToFolder(
  fileName: string,
  parentId: string,
  fileBlob: Blob,
  accessToken: string
): Promise<{ driveFileId: string; driveViewLink?: string }> {
  const existingId = await findFile(fileName, parentId, accessToken);
  if (existingId) {
    try { await deleteFile(existingId, accessToken); } catch (_) { /* ignore */ }
  }

  const metadata = { name: fileName, parents: [parentId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", fileBlob, fileName);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Drive upload failed: ${errText}`);
  }

  const uploaded = await uploadRes.json();
  return { driveFileId: uploaded.id, driveViewLink: uploaded.webViewLink };
}