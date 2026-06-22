// lib/uploadFile.ts — SDK 54 compatible
// Uses expo-file-system legacy API with string encoding literal.
// Avoids importing EncodingType (moved in v19) by passing 'base64' directly —
// the type signature is `EncodingType | 'utf8' | 'base64'` so strings work fine.

import * as FileSystem from 'expo-file-system';

/**
 * Upload a local file URI to a signed URL using fetch.
 * Replaces FileSystem.uploadAsync which broke in SDK 54.
 */
export const uploadFileToSignedUrl = async (
  signedUrl: string,
  fileUri: string,
  mimeType: string
): Promise<void> => {
  // Pass 'base64' as a string literal — accepted by the API without importing EncodingType
  const base64 = await (FileSystem as any).readAsStringAsync(fileUri, {
    encoding: 'base64',
  });

  // Decode base64 → binary bytes
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: bytes,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Upload failed: ${response.status}${text ? ' — ' + text : ''}`
    );
  }
};

/**
 * Full helper: gets a signed upload URL from Supabase, uploads the file,
 * and returns the public URL.
 */
export const uploadToSupabaseStorage = async (
  supabase: any,
  bucket: string,
  fileName: string,
  fileUri: string,
  mimeType: string
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(fileName);

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create signed upload URL');
  }

  await uploadFileToSignedUrl(data.signedUrl, fileUri, mimeType);

  const { data: publicData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicData.publicUrl;
};