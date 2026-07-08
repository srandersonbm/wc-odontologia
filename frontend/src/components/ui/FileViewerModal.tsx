import { useEffect, useState } from 'react';
import { fetchFileBlob } from '../../api/client';
import { Modal } from './Modal';
import { Button } from './Button';

export function FileViewerModal({
  open,
  onClose,
  title,
  fileUrl,
  fileName,
  mimeType,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string;
  fileName: string;
  mimeType?: string;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlobUrl(null);
    setError('');
    setLoading(true);
    fetchFileBlob(fileUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar o arquivo.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, fileUrl]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  return (
    <Modal open={open} onClose={onClose} title={title} width={760}>
      <div className="flex flex-col gap-4">
        <div
          className="rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: 'var(--line-soft)', minHeight: 320, maxHeight: 560 }}
        >
          {loading && (
            <p className="text-sm py-16" style={{ color: 'var(--ink-faint)' }}>
              Carregando…
            </p>
          )}
          {!loading && error && (
            <p className="text-sm py-16" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
          {!loading && !error && blobUrl && isImage && (
            <img
              src={blobUrl}
              alt={fileName}
              style={{ maxWidth: '100%', maxHeight: 560, objectFit: 'contain' }}
            />
          )}
          {!loading && !error && blobUrl && isPdf && (
            <iframe
              src={blobUrl}
              title={fileName}
              style={{ width: '100%', height: 560, border: 'none', display: 'block' }}
            />
          )}
          {!loading && !error && blobUrl && !isImage && !isPdf && (
            <div className="text-center py-16 px-8">
              <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                Pré-visualização não disponível para este tipo de arquivo.
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
                {fileName}
              </p>
            </div>
          )}
        </div>
        <Button variant="honey" onClick={handleDownload} disabled={!blobUrl}>
          ⬇ Baixar arquivo
        </Button>
      </div>
    </Modal>
  );
}
