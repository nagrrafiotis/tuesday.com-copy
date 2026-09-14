import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { attachUndo } from '@/lib/entityUndoWrapper';

const { appId, serverUrl, token, functionsVersion } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});

// Attach global undo recording to all entity mutations (create/update/delete/...)
attachUndo(base44);