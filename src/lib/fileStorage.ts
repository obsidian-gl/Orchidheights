import { db, collection, getDocs, query, where, doc, getDoc, setDoc } from './firebase';

export interface FileMetadata {
  fileId: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

/**
 * Uploads any file to Firestore in ~750KB chunks to prevent the 1MB document size limit.
 * Saves chunk metadata to `file_metadata` and chunk parts to `file_chunks`.
 */
export async function uploadFileInChunks(
  file: File,
  onProgress?: (progress: number) => void
): Promise<FileMetadata> {
  const fileId = 'file_' + Math.random().toString(36).substring(2, 15);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64String = reader.result as string;
        const chunkSize = 700 * 1024; // 700KB chunks of base64 characters (~500KB binary data, well under 1MB)
        const totalChunks = Math.ceil(base64String.length / chunkSize);

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, base64String.length);
          const chunkData = base64String.substring(start, end);

          // Write each chunk as its own document
          await setDoc(doc(db, 'file_chunks', `${fileId}_chunk_${i}`), {
            fileId,
            chunkIndex: i,
            totalChunks,
            data: chunkData,
            createdAt: new Date().toISOString()
          });

          if (onProgress) {
            onProgress(Math.round(((i + 1) / totalChunks) * 100));
          }
        }

        const metadata: FileMetadata = {
          fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        };

        // Write the overall metadata
        await setDoc(doc(db, 'file_metadata', fileId), metadata);

        resolve(metadata);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Reconstructs a file from chunks and returns its filename, mime type, and a download URL (object URL or data URL)
 */
export async function downloadChunkedFile(fileId: string): Promise<{ name: string; type: string; base64: string }> {
  const metaDoc = await getDoc(doc(db, 'file_metadata', fileId));
  if (!metaDoc.exists()) {
    throw new Error('File metadata not found in database');
  }
  const meta = metaDoc.data() as FileMetadata;

  // Retrieve all chunks
  const chunksQuery = query(
    collection(db, 'file_chunks'),
    where('fileId', '==', fileId)
  );
  const snapshot = await getDocs(chunksQuery);
  const chunks: Array<{ chunkIndex: number; data: string }> = [];
  snapshot.forEach((d) => {
    const data = d.data();
    chunks.push({ chunkIndex: data.chunkIndex, data: data.data });
  });

  if (chunks.length === 0) {
    throw new Error('No chunks found for the requested file');
  }

  // Order chunks correctly
  chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

  // Re-join parts
  const base64 = chunks.map((c) => c.data).join('');

  return {
    name: meta.name,
    type: meta.type,
    base64
  };
}

/**
 * Trigger browser file download from base64 string
 */
export function triggerFileDownload(base64: string, filename: string) {
  const link = document.createElement('a');
  link.href = base64;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
