import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api, ApiError } from '../api/client';
import type { PatientDocument } from '../api/types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { FileViewerModal } from './ui/FileViewerModal';
import { Field, Input } from './ui/Field';

export function PatientExtraDocuments({ patientId }: { patientId: number }) {
  const [docs, setDocs] = useState<PatientDocument[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<PatientDocument | null>(null);

  const load = () => {
    api.get<PatientDocument[]>(`/patients/${patientId}/extra-documents`).then(setDocs);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const remove = async (docId: number) => {
    await api.delete(`/patients/${patientId}/extra-documents/${docId}`);
    load();
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>
          Documentação extra
        </h2>
        <Button variant="ghost" onClick={() => setAddOpen(true)}>
          + Adicionar documento
        </Button>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>
        Fotos, exames, laudos ou outros arquivos relacionados a este paciente.
      </p>

      {docs.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>
          Nenhum documento enviado ainda.
        </p>
      ) : (
        <ul className="flex flex-col divide-y" style={{ borderColor: 'var(--line-soft)' }}>
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 py-2.5">
              <button type="button" onClick={() => setViewingDoc(doc)} className="min-w-0 text-left">
                <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>
                  📎 {doc.title}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--ink-faint)' }}>
                  {doc.fileName} ·{' '}
                  {format(new Date(doc.uploadedAt.replace(' ', 'T')), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                </p>
              </button>
              <button
                type="button"
                onClick={() => remove(doc.id)}
                className="text-xs shrink-0"
                style={{ color: 'var(--danger)' }}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      <AddDocumentModal
        open={addOpen}
        patientId={patientId}
        onClose={() => setAddOpen(false)}
        onCreated={(doc) => {
          setAddOpen(false);
          load();
          setViewingDoc(doc);
        }}
      />

      <FileViewerModal
        open={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        title={viewingDoc?.title || ''}
        fileUrl={viewingDoc ? `/patients/${patientId}/extra-documents/${viewingDoc.id}/file` : ''}
        fileName={viewingDoc?.fileName || ''}
        mimeType={viewingDoc?.mimeType}
      />
    </div>
  );
}

function AddDocumentModal({
  open,
  patientId,
  onClose,
  onCreated,
}: {
  open: boolean;
  patientId: number;
  onClose: () => void;
  onCreated: (doc: PatientDocument) => void;
}) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle('');
    setFile(null);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Selecione um arquivo.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('file', file);
      const res = await api.upload<{ id: number }>(`/patients/${patientId}/extra-documents`, fd);
      const created: PatientDocument = {
        id: res.id,
        title,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
      };
      reset();
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao enviar documento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Adicionar documento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Título">
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Radiografia panorâmica"
          />
        </Field>
        <Field label="Arquivo">
          <input
            required
            type="file"
            className="input"
            style={{ paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </Field>
        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <Button type="submit" variant="honey" disabled={saving}>
          {saving ? 'Enviando…' : 'Adicionar'}
        </Button>
      </form>
    </Modal>
  );
}
