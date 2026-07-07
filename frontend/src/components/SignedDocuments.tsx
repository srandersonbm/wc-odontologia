import { useEffect, useRef, useState } from 'react';
import { api, downloadFile } from '../api/client';
import type { SignedDocument, SignedDocumentType } from '../api/types';

export function SignedDocuments({
  patientId,
  type,
  planId,
  label = 'Enviar arquivo assinado',
}: {
  patientId: number;
  type: SignedDocumentType;
  planId?: number;
  label?: string;
}) {
  const [docs, setDocs] = useState<SignedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api.get<SignedDocument[]>(`/patients/${patientId}/documents`).then((all) =>
      setDocs(all.filter((d) => d.type === type && (planId ? d.planId === planId : true)))
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, type, planId]);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Envie um arquivo em PDF.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      if (planId) fd.append('planId', String(planId));
      await api.upload(`/patients/${patientId}/documents`, fd);
      load();
    } finally {
      setUploading(false);
    }
  };

  const remove = async (docId: number) => {
    await api.delete(`/patients/${patientId}/documents/${docId}`);
    load();
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
        style={{ color: 'var(--sage)', background: 'var(--line-soft)' }}
      >
        {uploading ? 'Enviando…' : `+ ${label}`}
      </button>
      {docs.length > 0 && (
        <ul className="flex flex-col gap-1 mt-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => downloadFile(`/patients/${patientId}/documents/${d.id}/file`, d.fileName)}
                className="underline truncate text-left"
                style={{ color: 'var(--honey-deep)' }}
              >
                📎 {d.fileName}
              </button>
              <button
                type="button"
                onClick={() => remove(d.id)}
                className="shrink-0"
                style={{ color: 'var(--danger)' }}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
