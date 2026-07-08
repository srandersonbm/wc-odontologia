import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AnamnesisData, AuthUser, Patient, TreatmentPlan } from '../api/types';

const PAGE_WIDTH = 210;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function drawHeader(doc: jsPDF, dentist: AuthUser, title: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 28, 24);
  doc.text('WC Odontologia', MARGIN, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110, 100, 90);
  doc.text(`${dentist.name}${dentist.specialty ? ' · ' + dentist.specialty : ''}`, MARGIN, 26);

  const contactLines: string[] = [];
  if (dentist.phone) contactLines.push(dentist.phone);
  if (dentist.instagram) contactLines.push(`@${dentist.instagram.replace(/^@/, '')}`);
  if (dentist.address) contactLines.push(dentist.address);
  doc.setFontSize(9);
  contactLines.forEach((line, i) => {
    doc.text(line, PAGE_WIDTH - MARGIN, 16 + i * 4.5, { align: 'right' });
  });

  doc.setDrawColor(220, 210, 190);
  doc.line(MARGIN, 31, PAGE_WIDTH - MARGIN, 31);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(30, 28, 24);
  doc.text(title, PAGE_WIDTH / 2, 42, { align: 'center' });

  return 50;
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

function loadImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Não foi possível carregar a assinatura.'));
    img.src = dataUrl;
  });
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

export function generateTreatmentPlanPdf(patient: Patient, dentist: AuthUser, plan: TreatmentPlan) {
  const doc = new jsPDF();
  let y = drawHeader(doc, dentist, 'Plano de Tratamento Odontológico');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(40, 38, 34);
  doc.text(`Paciente: ${patient.name}`, MARGIN, y);
  doc.text(`Telefone: ${patient.phone || '—'}`, PAGE_WIDTH - MARGIN, y, { align: 'right' });
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Tratamento a ser realizado', 'Valor']],
    body: plan.items.map((item) => [item.title, formatCents(item.priceCents)]),
    foot: [['Total', formatCents(plan.totalCents)]],
    headStyles: { fillColor: [42, 60, 66], textColor: 255 },
    footStyles: { fillColor: [243, 230, 196], textColor: [40, 34, 5], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
    styles: { fontSize: 10, cellPadding: 3 },
  });

  y = (doc as any).lastAutoTable.finalY + 14;
  y = ensureSpace(doc, y, 40);

  doc.setFillColor(243, 230, 196);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 26, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(80, 60, 10);
  doc.text('IMPORTANTE:', MARGIN + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  const importantText = doc.splitTextToSize(
    'Os tratamentos serão iniciados mediante o pagamento de 50% (ou o que for combinado) e concluídos quando totalmente pagos.',
    CONTENT_WIDTH - 8
  );
  doc.text(importantText, MARGIN + 4, y + 13);

  y += 36;
  y = ensureSpace(doc, y, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 38, 34);
  doc.text('Data: ____ / ____ / ________', MARGIN, y);
  y += 20;

  y = drawSignatureLine(doc, y, 'Assinatura do paciente ou responsável', MARGIN, CONTENT_WIDTH);

  doc.save(`plano-de-tratamento-${slug(patient.name)}.pdf`);
}

const anamnesisFields: Array<{ key: keyof AnamnesisData; label: string }> = [
  { key: 'queixaPrincipal', label: 'Queixa principal / motivo da consulta' },
  { key: 'ultimaConsulta', label: 'Há quanto tempo não vai ao dentista' },
  { key: 'ansiedadeTratamento', label: 'Sente ansiedade em tratamentos odontológicos' },
  { key: 'escovacaoPorDia', label: 'Vezes que escova os dentes por dia' },
  { key: 'usaFioDental', label: 'Usa fio dental' },
  { key: 'sangramentoGengival', label: 'Sangramento na gengiva ao escovar' },
  { key: 'bruxismo', label: 'Range ou aperta os dentes (bruxismo)' },
  { key: 'usaProtese', label: 'Usa prótese, aparelho ou implante' },
  { key: 'usaProteseQual', label: 'Qual' },
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

export function generateAnamnesisPdf(patient: Patient, dentist: AuthUser, data: AnamnesisData) {
  const doc = new jsPDF();
  let y = drawHeader(doc, dentist, 'Ficha de Anamnese Odontológica');

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    body: [
      ['Nome', patient.name, 'Data de nascimento', patient.birthDate || '—'],
      ['Profissão', patient.profession || '—', 'Estado civil', patient.maritalStatus || '—'],
      ['Cidade', patient.city || '—', 'Telefone', patient.phone || '—'],
    ],
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      2: { fontStyle: 'bold', cellWidth: 32 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  const condicoes = (data.condicoes || []).join(', ');
  const rows = anamnesisFields
    .map((f) => {
      const raw = data[f.key];
      if (raw === undefined || raw === null || raw === '') return null;
      const value = typeof raw === 'string' && yesNoLabel[raw] ? yesNoLabel[raw] : String(raw);
      return [f.label, value];
    })
    .filter((r): r is string[] => r !== null);

  if (condicoes) rows.splice(9, 0, ['Já foi acometido de alguma doença', condicoes]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Pergunta', 'Resposta']],
    body: rows,
    headStyles: { fillColor: [42, 60, 66], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 100 } },
  });

  y = (doc as any).lastAutoTable.finalY + 16;
  y = ensureSpace(doc, y, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 65, 60);
  const declaration = doc.splitTextToSize(
    'Declaro que as informações acima prestadas são verdadeiras e que fui devidamente esclarecido(a) sobre o planejamento e os procedimentos odontológicos a serem realizados em meu caso.',
    CONTENT_WIDTH
  );
  doc.text(declaration, MARGIN, y);
  y += declaration.length * 4.5 + 12;

  doc.text('Data: ____ / ____ / ________', MARGIN, y);
  y += 16;
  drawSignatureLine(doc, y, 'Nome por extenso e assinatura (paciente ou responsável)', MARGIN, CONTENT_WIDTH);

  doc.save(`anamnese-${slug(patient.name)}.pdf`);
}

export async function generateTermoPdf(patient: Patient, dentist: AuthUser) {
  const doc = new jsPDF();
  let y = drawHeader(doc, dentist, 'Termo de Consentimento Livre e Esclarecido');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 38, 34);

  const intro =
    `O presente documento é firmado entre o(a) cirurgião-dentista ${dentist.name} e o(a) Sr.(a) ` +
    `${patient.name}, profissão ${patient.profession || '_______________'}, portador(a) do RG ${
      patient.rg || '_______________'
    }, CPF ${patient.cpf || '_______________'}, residente e domiciliado(a) à ${
      patient.address || '_______________'
    }, na cidade de ${patient.city || '_____________'}, estado de ${patient.state || '___'}.`;

  const paragraphs = [
    intro,
    'Neste documento, o(a) paciente acima citado(a) declara que todas as informações por ele(a) prestadas são verdadeiras e que está consciente e devidamente informado(a). O paciente concorda que seja providenciada a ficha clínica com seus dados pessoais e informações pertinentes, exames clínicos e laboratoriais, radiografias e fotografias, diagnósticos e plano de tratamento.',
    'Também se declara ciente e concorda que o(a) cirurgião-dentista utilize informações e dados referentes ao seu caso — mantida a privacidade pessoal — para fins de estudo, aprendizado e publicação em redes sociais, livros, revistas ou outras atividades científicas, respeitando a legislação vigente.',
    'Declaro que a ficha de anamnese foi por mim preenchida e assinada, apresentando informações verdadeiras, especialmente quanto às minhas condições de saúde geral e bucal, não tendo omitido dados sobre doenças pré-existentes ou uso de medicamentos, ciente de que a omissão pode interferir negativamente no planejamento e andamento do tratamento.',
    'Considerando minha queixa principal e, após avaliação clínica, o(a) profissional me esclareceu sobre o diagnóstico e planejamento de tratamento, com alternativas e informações claras sobre objetivos e riscos, bem como sobre minha responsabilidade de colaborar com o tratamento a ser executado.',
    'Estou ciente de que eventuais ausências às consultas e o não atendimento das orientações profissionais prejudicarão o resultado pretendido, uma vez que a Odontologia não é uma ciência exata, e me comprometo a comparecer pontualmente às sessões agendadas, seguindo as prescrições e orientações fornecidas.',
    'É de meu conhecimento que devo informar ao(à) profissional qualquer alteração decorrente do tratamento, insatisfações ou dúvidas, mantendo meus dados cadastrais atualizados. Estou ciente de que o(a) cirurgião-dentista utilizará técnicas e materiais com efetiva comprovação científica, adequados ao meu caso.',
    'Estou ciente de que os resultados esperados podem não se concretizar em face da resposta biológica do meu organismo e de minha colaboração, sendo certo que o(a) profissional se compromete a utilizar as técnicas adequadas, assumindo responsabilidade pelos serviços prestados e resguardando minha privacidade e sigilo profissional.',
    'Declaro estar ciente do plano de tratamento odontológico em anexo, bem como de possíveis alterações que venham a ocorrer, e concordo com a possibilidade, se necessária, de extrações parciais ou totais de dentes, que somente serão realizadas após meu consentimento expresso.',
  ];

  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p, CONTENT_WIDTH);
    y = ensureSpace(doc, y, lines.length * 4.6 + 6);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4.6 + 6;
  }

  y = ensureSpace(doc, y, 40);
  y += 6;
  doc.text('Imperatriz/MA, ____ / ____ / ________', MARGIN, y);
  y += 20;

  const half = CONTENT_WIDTH / 2 - 5;
  y = ensureSpace(doc, y, 20);
  await drawDentistSignatureBlock(doc, dentist, y, MARGIN, half);
  drawSignatureLine(doc, y, 'Paciente', MARGIN + half + 10, half);

  doc.save(`termo-consentimento-${slug(patient.name)}.pdf`);
}

export interface AtestadoOptions {
  finalidade: string;
  date: string;
  startTime: string;
  endTime: string;
  days: string;
  cid: string;
}

export async function generateAtestadoPdf(patient: Patient, dentist: AuthUser, opts: AtestadoOptions) {
  const doc = new jsPDF();
  let y = drawHeader(doc, dentist, 'Atestado');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(40, 38, 34);

  const lines = [
    `Atesto para fins ${opts.finalidade || '_______________________'} que ${patient.name},`,
    `portador(a) do RG nº ${patient.rg || '_______________'}, residente e domiciliado(a) à ${
      patient.address || '_______________________'
    },`,
    `esteve sob tratamento odontológico neste consultório, no período das ${opts.startTime || '_____'} às ${
      opts.endTime || '_____'
    } horas`,
    `do dia ${opts.date || '____/____/________'}, necessitando de ${opts.days || '____'} dia(s) de convalescença.`,
    `C.I.D.: ${opts.cid || '_______________'}`,
  ];

  y += 6;
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 6.5 + 4;
  }

  y += 10;
  doc.text(`Imperatriz-MA, ____ / ____ / ________`, MARGIN, y);
  y += 30;

  await drawDentistSignatureBlock(doc, dentist, y, MARGIN, CONTENT_WIDTH);

  doc.save(`atestado-${slug(patient.name)}.pdf`);
}

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
