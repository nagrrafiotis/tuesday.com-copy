import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ROOT_FOLDER_NAME = "Project Invoices";

async function findFolder(name, parentId, accessToken) {
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

async function createFolder(name, parentId, accessToken) {
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

async function findOrCreateFolder(name, parentId, accessToken) {
  const existing = await findFolder(name, parentId, accessToken);
  if (existing) return existing;
  return await createFolder(name, parentId, accessToken);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { projectName, fileUrl, fileName, mimeType } = await req.json();
    if (!projectName || !fileUrl || !fileName) {
      return Response.json({ error: "Missing projectName, fileUrl or fileName" }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");

    const rootFolderId = await findOrCreateFolder(ROOT_FOLDER_NAME, null, accessToken);
    const projectFolderId = await findOrCreateFolder(projectName, rootFolderId, accessToken);

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) return Response.json({ error: "Failed to fetch source file" }, { status: 500 });
    const fileBlob = await fileRes.blob();

    const metadata = {
      name: fileName,
      parents: [projectFolderId],
    };

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
      return Response.json({ error: `Drive upload failed: ${errText}` }, { status: 500 });
    }

    const uploaded = await uploadRes.json();
    return Response.json({ success: true, driveFileId: uploaded.id, driveViewLink: uploaded.webViewLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});