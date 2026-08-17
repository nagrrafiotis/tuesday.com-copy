import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getProjectFolderId, uploadFileToFolder } from '../../shared/driveFolders.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { projectName, fileUrl, fileName } = await req.json();
    if (!projectName || !fileUrl || !fileName) {
      return Response.json({ error: "Missing projectName, fileUrl or fileName" }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");

    const projectFolderId = await getProjectFolderId(projectName, accessToken);

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) return Response.json({ error: "Failed to fetch source file" }, { status: 500 });
    const fileBlob = await fileRes.blob();

    const { driveFileId, driveViewLink } = await uploadFileToFolder(fileName, projectFolderId, fileBlob, accessToken);

    return Response.json({ success: true, driveFileId, driveViewLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});