import { useState } from 'react';
import type { AnamnesisData } from '../api/types';
import { Field, Input, Textarea } from './ui/Field';
import { Button } from './ui/Button';

const conditionOptions = [
  'Anemia',
  'Úlcera',
  'Sífilis',
  'Problemas cardíacos',
  'Osteoporose',
  'Hepatite',
  'Tuberculose',
  'Doença de chagas',
  'Distúrbios psíquicos',
  'Diabete',
  'Febre reumática',
  'Hemofilia',
  'Problemas hepáticos',
  'Nefrite',
  'Epilepsia',
  'Hipertensão',
  'Sinusite',
  'HIV',
  'Problema gastrointestinal',
  'Câncer',
];

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: 'sim' | 'nao') => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm" style={{ color: 'var(--ink)' }}>
        {label}
      </span>
      <div className="flex gap-1.5 shrink-0">
        {(['sim', 'nao'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: value === opt ? 'var(--honey)' : 'var(--line-soft)',
              color: value === opt ? '#2b2205' : 'var(--ink-soft)',
            }}
          >
            {opt === 'sim' ? 'Sim' : 'Não'}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="text-xs font-semibold uppercase tracking-wide mb-2 pb-1.5 border-b"
        style={{ color: 'var(--honey-deep)', borderColor: 'var(--line-soft)' }}
      >
        {title}
      </h3>
      <div className="flex flex-col divide-y" style={{ borderColor: 'var(--line-soft)' }}>
        {children}
      </div>
    </div>
  );
}

export function AnamnesisForm({
  initial,
  onSave,
  saving,
}: {
  initial?: AnamnesisData;
  onSave: (data: AnamnesisData) => void;
  saving?: boolean;
}) {
  const [data, setData] = useState<AnamnesisData>(initial || {});

  const set = <K extends keyof AnamnesisData>(key: K, value: AnamnesisData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const toggleCondition = (name: string) => {
    setData((d) => {
      const list = d.condicoes || [];
      const has = list.includes(name);
      return { ...d, condicoes: has ? list.filter((c) => c !== name) : [...list, name] };
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(data);
      }}
      className="flex flex-col gap-6"
    >
      <Section title="Queixa e histórico odontológico">
        <div className="py-2">
          <Field label="Queixa principal / motivo da consulta">
            <Textarea
              value={data.queixaPrincipal || ''}
              onChange={(e) => set('queixaPrincipal', e.target.value)}
            />
          </Field>
        </div>
        <div className="py-2">
          <Field label="Há quanto tempo não vai ao dentista">
            <Input value={data.ultimaConsulta || ''} onChange={(e) => set('ultimaConsulta', e.target.value)} />
          </Field>
        </div>
        <YesNo
          label="Sente ansiedade em tratamentos odontológicos?"
          value={data.ansiedadeTratamento}
          onChange={(v) => set('ansiedadeTratamento', v)}
        />
        <div className="py-2">
          <Field label="Quantas vezes escova os dentes por dia">
            <Input value={data.escovacaoPorDia || ''} onChange={(e) => set('escovacaoPorDia', e.target.value)} />
          </Field>
        </div>
        <YesNo label="Usa fio dental?" value={data.usaFioDental} onChange={(v) => set('usaFioDental', v)} />
        <YesNo
          label="Sangramento na gengiva ao escovar?"
          value={data.sangramentoGengival}
          onChange={(v) => set('sangramentoGengival', v)}
        />
        <div className="flex items-center justify-between gap-3 py-1.5">
          <span className="text-sm" style={{ color: 'var(--ink)' }}>
            Range ou aperta os dentes (bruxismo)?
          </span>
          <div className="flex gap-1.5 shrink-0">
            {(['nao', 'diurno', 'noturno'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set('bruxismo', opt)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: data.bruxismo === opt ? 'var(--honey)' : 'var(--line-soft)',
                  color: data.bruxismo === opt ? '#2b2205' : 'var(--ink-soft)',
                }}
              >
                {opt === 'nao' ? 'Não' : opt === 'diurno' ? 'Diurno' : 'Noturno'}
              </button>
            ))}
          </div>
        </div>
        <YesNo label="Usa prótese?" value={data.usaProtese} onChange={(v) => set('usaProtese', v)} />
        {data.usaProtese === 'sim' && (
          <div className="py-2">
            <Field label="Qual">
              <Input value={data.usaProteseQual || ''} onChange={(e) => set('usaProteseQual', e.target.value)} />
            </Field>
          </div>
        )}
        <YesNo
          label="Usa aparelho ortodôntico?"
          value={data.usaAparelhoOrtodontico}
          onChange={(v) => set('usaAparelhoOrtodontico', v)}
        />
        <YesNo label="Usa implante?" value={data.usaImplante} onChange={(v) => set('usaImplante', v)} />
        <YesNo label="Já fez tratamento de canal?" value={data.jaFezCanal} onChange={(v) => set('jaFezCanal', v)} />
      </Section>

      <Section title="Histórico médico geral">
        <YesNo
          label="Está ou esteve sob cuidados médicos?"
          value={data.sobCuidadosMedicos}
          onChange={(v) => set('sobCuidadosMedicos', v)}
        />
        {data.sobCuidadosMedicos === 'sim' && (
          <div className="py-2">
            <Field label="Por quê">
              <Input
                value={data.sobCuidadosMedicosMotivo || ''}
                onChange={(e) => set('sobCuidadosMedicosMotivo', e.target.value)}
              />
            </Field>
          </div>
        )}
        <YesNo
          label="Toma algum medicamento continuamente?"
          value={data.tomaMedicamento}
          onChange={(v) => set('tomaMedicamento', v)}
        />
        {data.tomaMedicamento === 'sim' && (
          <div className="py-2">
            <Field label="Qual(is)">
              <Input
                value={data.tomaMedicamentoQual || ''}
                onChange={(e) => set('tomaMedicamentoQual', e.target.value)}
              />
            </Field>
          </div>
        )}
        <div className="py-3">
          <span className="text-sm block mb-2" style={{ color: 'var(--ink)' }}>
            Já foi acometido(a) de alguma destas doenças?
          </span>
          <div className="flex flex-wrap gap-2">
            {conditionOptions.map((c) => {
              const active = (data.condicoes || []).includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCondition(c)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: active ? 'var(--honey)' : 'var(--line-soft)',
                    color: active ? '#2b2205' : 'var(--ink-soft)',
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <div className="py-2">
          <Field label="Outra doença ou condição não citada acima">
            <Input value={data.outraCondicao || ''} onChange={(e) => set('outraCondicao', e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Sintomas e cuidados">
        <YesNo
          label="Toma bebidas alcoólicas habitualmente?"
          value={data.bebidasAlcoolicas}
          onChange={(v) => set('bebidasAlcoolicas', v)}
        />
        <YesNo label="Fumante?" value={data.fumante} onChange={(v) => set('fumante', v)} />
        {data.fumante === 'sim' && (
          <div className="py-2">
            <Field label="Quantos cigarros por dia">
              <Input value={data.fumanteQuantos || ''} onChange={(e) => set('fumanteQuantos', e.target.value)} />
            </Field>
          </div>
        )}
        <YesNo
          label="Sente náuseas frequentes?"
          value={data.nauseasFrequentes}
          onChange={(v) => set('nauseasFrequentes', v)}
        />
        <YesNo
          label="Salivação abundante?"
          value={data.salivacaoAbundante}
          onChange={(v) => set('salivacaoAbundante', v)}
        />
        <YesNo
          label="Sente falta de ar frequentemente?"
          value={data.faltaArFrequente}
          onChange={(v) => set('faltaArFrequente', v)}
        />
        <YesNo
          label="Já teve problemas hemorrágicos?"
          value={data.problemasHemorragicos}
          onChange={(v) => set('problemasHemorragicos', v)}
        />
        <YesNo
          label="Já teve problemas de cicatrização?"
          value={data.problemasCicatrizacao}
          onChange={(v) => set('problemasCicatrizacao', v)}
        />
        <YesNo
          label="Mal-estar ao receber anestésicos odontológicos?"
          value={data.malEstarAnestesico}
          onChange={(v) => set('malEstarAnestesico', v)}
        />
        <YesNo label="Seus tornozelos incham?" value={data.tornozelosIncham} onChange={(v) => set('tornozelosIncham', v)} />
        <YesNo label="Tem alguma alergia?" value={data.alergias} onChange={(v) => set('alergias', v)} />
        {data.alergias === 'sim' && (
          <div className="py-2">
            <Field label="A quê">
              <Input value={data.alergiasQuais || ''} onChange={(e) => set('alergiasQuais', e.target.value)} />
            </Field>
          </div>
        )}
        <YesNo label="Está grávida?" value={data.gravida} onChange={(v) => set('gravida', v)} />
        {data.gravida === 'sim' && (
          <div className="py-2">
            <Field label="De quantos meses">
              <Input value={data.gravidaMeses || ''} onChange={(e) => set('gravidaMeses', e.target.value)} />
            </Field>
          </div>
        )}
        <YesNo label="Está amamentando?" value={data.amamentando} onChange={(v) => set('amamentando', v)} />
      </Section>

      <Section title="Observações">
        <div className="py-2">
          <Textarea
            rows={3}
            placeholder="Observações, experiências anteriores, motivações…"
            value={data.observacoes || ''}
            onChange={(e) => set('observacoes', e.target.value)}
          />
        </div>
      </Section>

      <Button type="submit" variant="honey" disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar anamnese'}
      </Button>
    </form>
  );
}
