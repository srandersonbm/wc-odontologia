import { jsPDF } from 'jspdf';
import { api } from '../api/client';
import type { AnamnesisData, AuthUser, Patient, TreatmentPlan } from '../api/types';

// A geração de PDF é 100% local (client-side) — sem esse aviso ao backend, a emissão
// de documentos nunca apareceria no histórico do paciente. Falha aqui não deve travar
// o download do PDF, por isso os erros são apenas ignorados.
function logDocumentGenerated(patientId: number, documentLabel: string) {
  api.post(`/patients/${patientId}/events/document-generated`, { documentLabel }).catch(() => {});
}

const PAGE_WIDTH = 210;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BAR_HEIGHT = 6; // mm — faixa colorida do timbrado (~25px)

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function loadImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'));
    img.src = dataUrl;
  });
}

// Timbrado: logo centralizada (se houver), nome do dentista, faixa colorida
// (cor escolhida em Configurações) e o título do documento.
async function drawLetterhead(doc: jsPDF, dentist: AuthUser, title: string): Promise<number> {
  let y = 14;

  if (dentist.logoDataUrl) {
    try {
      const { width, height } = await loadImageSize(dentist.logoDataUrl);
      const maxH = 16;
      let h = maxH;
      let w = (width / height) * h;
      if (w > 60) {
        w = 60;
        h = (height / width) * w;
      }
      doc.addImage(dentist.logoDataUrl, 'PNG', (PAGE_WIDTH - w) / 2, y, w, h);
      y += h + 4;
    } catch {
      // segue sem a logo se ela não puder ser carregada
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 28, 24);
  doc.text(dentist.name, PAGE_WIDTH / 2, y + 5, { align: 'center' });
  y += 9;

  const subLines: string[] = [];
  if (dentist.specialty) subLines.push(dentist.specialty);
  const contact = [dentist.phone, dentist.instagram ? `@${dentist.instagram.replace(/^@/, '')}` : '', dentist.address]
    .filter(Boolean)
    .join(' · ');
  if (contact) subLines.push(contact);
  if (subLines.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110, 100, 90);
    subLines.forEach((line, i) => {
      doc.text(line, PAGE_WIDTH / 2, y + 3 + i * 4, { align: 'center' });
    });
    y += 3 + subLines.length * 4;
  }

  y += 5;
  const [r, g, b] = hexToRgb(dentist.color || '#c9a24b');
  doc.setFillColor(r, g, b);
  doc.rect(0, y, PAGE_WIDTH, BAR_HEIGHT, 'F');
  y += BAR_HEIGHT + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 28, 24);
  doc.text(title, PAGE_WIDTH / 2, y, { align: 'center' });

  return y + 10;
}

// Texto do documento (já editado pelo usuário) — parágrafos separados por
// linha em branco, cada um quebrado automaticamente na largura da página.
function drawBodyText(doc: jsPDF, y: number, text: string): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(40, 38, 34);
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p, CONTENT_WIDTH);
    y = ensureSpace(doc, y, lines.length * 5 + 5);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 5;
  }
  return y;
}

function drawSignatureLine(doc: jsPDF, y: number, label: string, x = MARGIN, width = CONTENT_WIDTH): number {
  doc.setDrawColor(60, 55, 50);
  doc.line(x, y, x + width, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 85, 80);
  doc.text(label, x + width / 2, y + 5, { align: 'center' });
  return y + 5;
}

// Desenha a assinatura do dentista (imagem, se cadastrada) sobre a linha, e o
// carimbo (nome + CRO) logo abaixo — usado nos documentos assinados pelo dentista.
async function drawDentistSignatureBlock(
  doc: jsPDF,
  dentist: AuthUser,
  y: number,
  x = MARGIN,
  width = CONTENT_WIDTH
): Promise<number> {
  if (dentist.signatureDataUrl) {
    try {
      const { width: iw, height: ih } = await loadImageSize(dentist.signatureDataUrl);
      const maxW = Math.min(55, width * 0.7);
      const maxH = 16;
      let w = maxW;
      let h = (ih / iw) * w;
      if (h > maxH) {
        h = maxH;
        w = (iw / ih) * h;
      }
      doc.addImage(dentist.signatureDataUrl, 'PNG', x + (width - w) / 2, y - h - 2, w, h);
    } catch {
      // segue sem a imagem se ela não puder ser carregada
    }
  }

  doc.setDrawColor(60, 55, 50);
  doc.line(x, y, x + width, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 85, 80);
  doc.text(dentist.stampName || dentist.name, x + width / 2, y + 5, { align: 'center' });

  if (dentist.croNumber || dentist.croUf) {
    doc.setFontSize(8);
    doc.text(`CRO - ${dentist.croNumber || '_____'} - ${dentist.croUf || '__'}`, x + width / 2, y + 9.5, {
      align: 'center',
    });
    return y + 9.5;
  }
  return y + 5;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 280) {
    doc.addPage();
    return 20;
  }
  return y;
}

// --- Plano de tratamento ---------------------------------------------------

export function buildTreatmentPlanText(patient: Patient, plan: TreatmentPlan): string {
  const items =
    plan.items.map((item, i) => `${i + 1}. ${item.title} — ${formatCents(item.priceCents)}`).join('\n') ||
    'Nenhum procedimento incluído neste plano.';
  return [
    `Paciente: ${patient.name}`,
    `Plano: ${plan.title}`,
    items,
    `Total: ${formatCents(plan.totalCents)}`,
    plan.notes ? `Observações: ${plan.notes}` : '',
    'IMPORTANTE: os tratamentos serão iniciados mediante o pagamento de 50% (ou o que for combinado) e concluídos quando totalmente pagos.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function generateTreatmentPlanPdf(patient: Patient, dentist: AuthUser, bodyText: string) {
  const doc = new jsPDF();
  let y = await drawLetterhead(doc, dentist, 'Plano de Tratamento Odontológico');
  y = drawBodyText(doc, y, bodyText);

  y += 6;
  y = ensureSpace(doc, y, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 38, 34);
  doc.text('Data: ____ / ____ / ________', MARGIN, y);
  y += 20;

  drawSignatureLine(doc, y, 'Assinatura do paciente ou responsável', MARGIN, CONTENT_WIDTH);

  doc.save(`plano-de-tratamento-${slug(patient.name)}.pdf`);
  logDocumentGenerated(patient.id, 'Plano de tratamento');
}

// --- Anamnese ----------------------------------------------------------------

const anamnesisFields: Array<{ key: keyof AnamnesisData; label: string }> = [
  { key: 'queixaPrincipal', label: 'Queixa principal / motivo da consulta' },
  { key: 'ultimaConsulta', label: 'Há quanto tempo não vai ao dentista' },
  { key: 'ansiedadeTratamento', label: 'Sente ansiedade em tratamentos odontológicos' },
  { key: 'escovacaoPorDia', label: 'Vezes que escova os dentes por dia' },
  { key: 'usaFioDental', label: 'Usa fio dental' },
  { key: 'sangramentoGengival', label: 'Sangramento na gengiva ao escovar' },
  { key: 'bruxismo', label: 'Range ou aperta os dentes (bruxismo)' },
  { key: 'usaProtese', label: 'Usa prótese' },
  { key: 'usaProteseQual', label: 'Qual' },
  { key: 'usaAparelhoOrtodontico', label: 'Usa aparelho ortodôntico' },
  { key: 'usaImplante', label: 'Usa implante' },
  { key: 'jaFezCanal', label: 'Já fez tratamento de canal' },
  { key: 'sobCuidadosMedicos', label: 'Está ou esteve sob cuidados médicos' },
  { key: 'sobCuidadosMedicosMotivo', label: 'Por quê' },
  { key: 'tomaMedicamento', label: 'Toma medicamento continuamente' },
  { key: 'tomaMedicamentoQual', label: 'Qual(is)' },
  { key: 'outraCondicao', label: 'Outra doença ou condição' },
  { key: 'bebidasAlcoolicas', label: 'Bebidas alcoólicas habitualmente' },
  { key: 'fumante', label: 'Fumante' },
  { key: 'fumanteQuantos', label: 'Cigarros por dia' },
  { key: 'nauseasFrequentes', label: 'Náuseas frequentes' },
  { key: 'salivacaoAbundante', label: 'Salivação abundante' },
  { key: 'faltaArFrequente', label: 'Falta de ar frequente' },
  { key: 'problemasHemorragicos', label: 'Problemas hemorrágicos' },
  { key: 'problemasCicatrizacao', label: 'Problemas de cicatrização' },
  { key: 'malEstarAnestesico', label: 'Mal-estar com anestésicos odontológicos' },
  { key: 'tornozelosIncham', label: 'Tornozelos incham' },
  { key: 'alergias', label: 'Tem alguma alergia' },
  { key: 'alergiasQuais', label: 'A quê' },
  { key: 'gravida', label: 'Está grávida' },
  { key: 'amamentando', label: 'Está amamentando' },
  { key: 'observacoes', label: 'Observações / experiências anteriores / motivações' },
];

const yesNoLabel: Record<string, string> = { sim: 'Sim', nao: 'Não', diurno: 'Diurno', noturno: 'Noturno' };

export function buildAnamnesisText(patient: Patient, data: AnamnesisData): string {
  const condicoes = (data.condicoes || []).join(', ');
  const lines = anamnesisFields
    .map((f) => {
      const raw = data[f.key];
      if (raw === undefined || raw === null || raw === '') return null;
      const value = typeof raw === 'string' && yesNoLabel[raw] ? yesNoLabel[raw] : String(raw);
      return `${f.label}: ${value}`;
    })
    .filter((l): l is string => l !== null);

  if (condicoes) lines.splice(9, 0, `Já foi acometido de alguma doença: ${condicoes}`);

  return [
    `Paciente: ${patient.name}${patient.birthDate ? ` — nascido(a) em ${patient.birthDate}` : ''}`,
    lines.join('\n'),
    'Declaro que as informações acima prestadas são verdadeiras e que fui devidamente esclarecido(a) sobre o planejamento e os procedimentos odontológicos a serem realizados em meu caso.',
  ].join('\n\n');
}

export async function generateAnamnesisPdf(patient: Patient, dentist: AuthUser, bodyText: string) {
  const doc = new jsPDF();
  let y = await drawLetterhead(doc, dentist, 'Ficha de Anamnese Odontológica');
  y = drawBodyText(doc, y, bodyText);

  y += 6;
  y = ensureSpace(doc, y, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 38, 34);
  doc.text('Data: ____ / ____ / ________', MARGIN, y);
  y += 16;
  drawSignatureLine(doc, y, 'Nome por extenso e assinatura (paciente ou responsável)', MARGIN, CONTENT_WIDTH);

  doc.save(`anamnese-${slug(patient.name)}.pdf`);
  logDocumentGenerated(patient.id, 'Anamnese');
}

// --- Termo de consentimento --------------------------------------------------

export function buildTermoText(patient: Patient, dentist: AuthUser): string {
  const intro =
    `O presente documento é firmado entre o(a) cirurgião-dentista ${dentist.name} e o(a) Sr.(a) ` +
    `${patient.name}, profissão ${patient.profession || '_______________'}, CPF ${
      patient.cpf || '_______________'
    }, residente e domiciliado(a) à ${
      patient.address || '_______________'
    }, na cidade de ${patient.city || '_____________'}, estado de ${patient.state || '___'}.`;

  return [
    intro,
    'Neste documento, o(a) paciente acima citado(a) declara que todas as informações por ele(a) prestadas são verdadeiras e que está consciente e devidamente informado(a). O paciente concorda que seja providenciada a ficha clínica com seus dados pessoais e informações pertinentes, exames clínicos e laboratoriais, radiografias e fotografias, diagnósticos e plano de tratamento.',
    'Também se declara ciente e concorda que o(a) cirurgião-dentista utilize informações e dados referentes ao seu caso — mantida a privacidade pessoal — para fins de estudo, aprendizado e publicação em redes sociais, livros, revistas ou outras atividades científicas, respeitando a legislação vigente.',
    'Declaro que a ficha de anamnese foi por mim preenchida e assinada, apresentando informações verdadeiras, especialmente quanto às minhas condições de saúde geral e bucal, não tendo omitido dados sobre doenças pré-existentes ou uso de medicamentos, ciente de que a omissão pode interferir negativamente no planejamento e andamento do tratamento.',
    'Considerando minha queixa principal e, após avaliação clínica, o(a) profissional me esclareceu sobre o diagnóstico e planejamento de tratamento, com alternativas e informações claras sobre objetivos e riscos, bem como sobre minha responsabilidade de colaborar com o tratamento a ser executado.',
    'Estou ciente de que eventuais ausências às consultas e o não atendimento das orientações profissionais prejudicarão o resultado pretendido, uma vez que a Odontologia não é uma ciência exata, e me comprometo a comparecer pontualmente às sessões agendadas, seguindo as prescrições e orientações fornecidas.',
    'É de meu conhecimento que devo informar ao(à) profissional qualquer alteração decorrente do tratamento, insatisfações ou dúvidas, mantendo meus dados cadastrais atualizados. Estou ciente de que o(a) cirurgião-dentista utilizará técnicas e materiais com efetiva comprovação científica, adequados ao meu caso.',
    'Estou ciente de que os resultados esperados podem não se concretizar em face da resposta biológica do meu organismo e de minha colaboração, sendo certo que o(a) profissional se compromete a utilizar as técnicas adequadas, assumindo responsabilidade pelos serviços prestados e resguardando minha privacidade e sigilo profissional.',
    'Declaro estar ciente do plano de tratamento odontológico em anexo, bem como de possíveis alterações que venham a ocorrer, e concordo com a possibilidade, se necessária, de extrações parciais ou totais de dentes, que somente serão realizadas após meu consentimento expresso.',
  ].join('\n\n');
}

export async function generateTermoPdf(patient: Patient, dentist: AuthUser, bodyText: string) {
  const doc = new jsPDF();
  let y = await drawLetterhead(doc, dentist, 'Termo de Consentimento Livre e Esclarecido');
  y = drawBodyText(doc, y, bodyText);

  y = ensureSpace(doc, y, 40);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 38, 34);
  doc.text('Imperatriz/MA, ____ / ____ / ________', MARGIN, y);
  y += 20;

  const half = CONTENT_WIDTH / 2 - 5;
  y = ensureSpace(doc, y, 20);
  await drawDentistSignatureBlock(doc, dentist, y, MARGIN, half);
  drawSignatureLine(doc, y, 'Paciente', MARGIN + half + 10, half);

  doc.save(`termo-consentimento-${slug(patient.name)}.pdf`);
  logDocumentGenerated(patient.id, 'Termo de consentimento');
}

// --- Atestado ------------------------------------------------------------------

export interface AtestadoOptions {
  finalidade: string;
  date: string;
  startTime: string;
  endTime: string;
  days: string;
}

export function buildAtestadoText(patient: Patient, opts: AtestadoOptions): string {
  return `Atesto para fins ${opts.finalidade || '_______________________'} que ${patient.name}, residente e domiciliado(a) à ${
    patient.address || '_______________________'
  }, esteve sob tratamento odontológico neste consultório, no período das ${opts.startTime || '_____'} às ${
    opts.endTime || '_____'
  } horas do dia ${opts.date || '____/____/________'}, necessitando de ${opts.days || '____'} dia(s) de convalescença.`;
}

export async function generateAtestadoPdf(patient: Patient, dentist: AuthUser, bodyText: string) {
  const doc = new jsPDF();
  let y = await drawLetterhead(doc, dentist, 'Atestado');
  y = drawBodyText(doc, y, bodyText);

  y = ensureSpace(doc, y, 40);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 38, 34);
  doc.text('Imperatriz-MA, ____ / ____ / ________', MARGIN, y);
  y += 24;

  await drawDentistSignatureBlock(doc, dentist, y, MARGIN, CONTENT_WIDTH);

  doc.save(`atestado-${slug(patient.name)}.pdf`);
  logDocumentGenerated(patient.id, 'Atestado');
}

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
