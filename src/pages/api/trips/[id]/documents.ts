import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, supabaseServer } from '@/lib/supabase';
import { TripDocument } from '@/types';

type ResponseData = {
  data?: TripDocument[];
  error?: string;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

const DOCUMENT_BUCKET = 'trip-documents';
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid trip ID' });
  }

  if (req.method === 'GET') {
    return handleGetDocuments(id, res);
  }

  if (req.method === 'POST') {
    return handleCreateDocument(id, req, res);
  }

  if (req.method === 'DELETE') {
    return handleDeleteDocument(id, req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}

function enrichDocumentsWithUrl(documents: TripDocument[]) {
  return documents.map((document) => {
    const { data } = supabase.storage
      .from(DOCUMENT_BUCKET)
      .getPublicUrl(document.file_path);

    return {
      ...document,
      file_url: data.publicUrl,
    };
  });
}

async function handleGetDocuments(tripId: string, res: NextApiResponse<ResponseData>) {
  try {
    const { data, error } = await supabase
      .from('trip_documents')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ data: enrichDocumentsWithUrl((data || []) as TripDocument[]) });
  } catch (err) {
    console.error('Get documents error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}

async function handleCreateDocument(tripId: string, req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { title, fileBase64, fileName, fileMimeType } = req.body;

  if (!title || !fileBase64 || !fileName || !fileMimeType) {
    return res.status(400).json({ error: 'Missing required fields: title, fileBase64, fileName, fileMimeType' });
  }

  if (!supabaseServer) {
    return res.status(500).json({ error: 'Supabase server client is not configured' });
  }

  if (!ALLOWED_MIME_TYPES.includes(fileMimeType)) {
    return res.status(400).json({ error: 'Unsupported file type' });
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64');

    if (buffer.byteLength > MAX_DOCUMENT_SIZE_BYTES) {
      return res.status(400).json({ error: 'File must be 10MB or smaller' });
    }

    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${tripId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabaseServer.storage
      .from(DOCUMENT_BUCKET)
      .upload(filePath, buffer, {
        contentType: fileMimeType,
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message });
    }

    const { data, error } = await supabase
      .from('trip_documents')
      .insert({
        trip_id: tripId,
        title,
        file_path: filePath,
        file_name: fileName,
        file_size: buffer.byteLength,
        file_mime_type: fileMimeType,
      })
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ data: enrichDocumentsWithUrl((data || []) as TripDocument[]) });
  } catch (err) {
    console.error('Create document error:', err);
    res.status(500).json({ error: 'Failed to upload document' });
  }
}

async function handleDeleteDocument(tripId: string, req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { documentId } = req.body;

  if (!documentId) {
    return res.status(400).json({ error: 'Missing required field: documentId' });
  }

  try {
    const { data: document, error: fetchError } = await supabase
      .from('trip_documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('trip_id', tripId)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    const { error } = await supabase
      .from('trip_documents')
      .delete()
      .eq('id', documentId)
      .eq('trip_id', tripId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (document?.file_path && supabaseServer) {
      await supabaseServer.storage.from(DOCUMENT_BUCKET).remove([document.file_path]);
    }

    res.status(200).json({ data: [] });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
}
