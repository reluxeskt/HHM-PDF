import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface SampleDocMeta {
  id: string;
  title: string;
  description: string;
  pages: number;
  tags: string[];
}

export const SAMPLE_DOCS: SampleDocMeta[] = [
  {
    id: 'contract-nda',
    title: 'Mutual Non-Disclosure Agreement (NDA)',
    description: 'Corporate agreement with execution terms, confidential clauses, and signature line for Fill & Sign.',
    pages: 3,
    tags: ['Legal', 'Signature', 'Forms'],
  },
  {
    id: 'financial-report',
    title: 'Quarterly Financial & Performance Report',
    description: 'Executive summary with KPI tables, balance overview, and confidential watermark.',
    pages: 2,
    tags: ['Finance', 'Tables', 'Watermark'],
  },
  {
    id: 'scanned-invoice',
    title: 'Scanned Commercial Invoice & Bill of Lading',
    description: 'Simulated high-contrast scanned document ideal for testing OCR, Redaction, and Stamps.',
    pages: 1,
    tags: ['OCR', 'Redaction', 'Invoice'],
  },
];

export async function generateSamplePdf(id: string): Promise<{ data: Uint8Array; name: string }> {
  if (id === 'financial-report') {
    return await generateFinancialReport();
  } else if (id === 'scanned-invoice') {
    return await generateScannedInvoice();
  } else {
    return await generateContractNda();
  }
}

async function generateContractNda(): Promise<{ data: Uint8Array; name: string }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Page 1: Introduction & Definitions
  const p1 = doc.addPage([595.28, 841.89]);
  const blue = rgb(0.07, 0.44, 0.84);
  const dark = rgb(0.12, 0.15, 0.2);
  const gray = rgb(0.4, 0.45, 0.5);

  p1.drawText('MUTUAL NON-DISCLOSURE AGREEMENT', {
    x: 50,
    y: 770,
    size: 18,
    font: boldFont,
    color: blue,
  });
  p1.drawText('CONFIDENTIAL LEGAL INSTRUMENT — REFERENCE # NDA-2026-9081', {
    x: 50,
    y: 748,
    size: 9,
    font: boldFont,
    color: gray,
  });
  p1.drawLine({
    start: { x: 50, y: 735 },
    end: { x: 545, y: 735 },
    thickness: 1.5,
    color: rgb(0.8, 0.85, 0.9),
  });

  p1.drawText('This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of the Effective Date by and between:', {
    x: 50,
    y: 710,
    size: 10,
    font,
    color: dark,
  });

  // Parties box
  p1.drawRectangle({
    x: 50,
    y: 620,
    width: 495,
    height: 75,
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
    color: rgb(0.97, 0.98, 1),
  });
  p1.drawText('PARTY A (Disclosing & Receiving Party):', { x: 65, y: 675, size: 9, font: boldFont, color: blue });
  p1.drawText('Apex Global Technologies Corp., a Delaware Corporation (Address: 450 Innovation Parkway, Suite 800)', {
    x: 65,
    y: 660,
    size: 9,
    font,
    color: dark,
  });
  p1.drawText('PARTY B (Disclosing & Receiving Party):', { x: 65, y: 642, size: 9, font: boldFont, color: blue });
  p1.drawText('Partner Innovations International Ltd. (Address: 12 Commercial Way, London, UK)', {
    x: 65,
    y: 628,
    size: 9,
    font,
    color: dark,
  });

  p1.drawText('1. PURPOSE OF DISCLOSURE', { x: 50, y: 590, size: 11, font: boldFont, color: dark });
  p1.drawText(
    'The parties wish to explore a potential business relationship concerning AI software engineering and enterprise cloud integration ("Purpose"). Each party may disclose confidential proprietary technical and business information.',
    { x: 50, y: 568, size: 9.5, font, color: dark, maxWidth: 495, lineHeight: 14 }
  );

  p1.drawText('2. CONFIDENTIAL INFORMATION DEFINED', { x: 50, y: 515, size: 11, font: boldFont, color: dark });
  p1.drawText(
    '"Confidential Information" shall include all information, whether written, oral, electronic, or visual, including source code, algorithmic designs, business forecasts, customer metrics, API specifications, and security protocols disclosed by one party to the other.',
    { x: 50, y: 493, size: 9.5, font, color: dark, maxWidth: 495, lineHeight: 14 }
  );

  p1.drawText('3. OBLIGATIONS & STANDARD OF CARE', { x: 50, y: 435, size: 11, font: boldFont, color: dark });
  p1.drawText(
    'Each receiving party agrees to maintain the strict confidentiality of all Disclosed Materials using at least the degree of care used for its own confidential assets of similar nature, but no less than reasonable standard commercial care.',
    { x: 50, y: 413, size: 9.5, font, color: dark, maxWidth: 495, lineHeight: 14 }
  );

  p1.drawText('Page 1 of 3 — Mutual NDA', { x: 50, y: 35, size: 8, font: italicFont, color: gray });

  // Page 2: Terms and Conditions
  const p2 = doc.addPage([595.28, 841.89]);
  p2.drawText('MUTUAL NON-DISCLOSURE AGREEMENT (CONTINUED)', { x: 50, y: 770, size: 14, font: boldFont, color: blue });
  p2.drawText('4. EXCLUSIONS FROM CONFIDENTIALITY', { x: 50, y: 720, size: 11, font: boldFont, color: dark });
  p2.drawText(
    'The obligations of Section 3 shall not apply to information that: (a) was already in the lawful possession of the recipient prior to disclosure; (b) is or becomes publicly available through no breach of this agreement; or (c) is independently developed without reference to the Disclosing Party\'s information.',
    { x: 50, y: 695, size: 9.5, font, color: dark, maxWidth: 495, lineHeight: 14 }
  );

  p2.drawText('5. TERM & SURVIVAL', { x: 50, y: 620, size: 11, font: boldFont, color: dark });
  p2.drawText(
    'This Agreement and the obligations hereunder shall govern disclosures made within three (3) years of the Effective Date. Trade secret protections shall survive perpetually until such information ceases to be a trade secret.',
    { x: 50, y: 595, size: 9.5, font, color: dark, maxWidth: 495, lineHeight: 14 }
  );

  p2.drawText('6. GOVERNING LAW & JURISDICTION', { x: 50, y: 520, size: 11, font: boldFont, color: dark });
  p2.drawText(
    'This Agreement shall be construed and enforced in accordance with the laws of the State of New York, without regard to conflict of law principles. Any dispute shall be resolved through binding expedited arbitration.',
    { x: 50, y: 495, size: 9.5, font, color: dark, maxWidth: 495, lineHeight: 14 }
  );
  p2.drawText('Page 2 of 3 — Mutual NDA', { x: 50, y: 35, size: 8, font: italicFont, color: gray });

  // Page 3: Signatures & Execution
  const p3 = doc.addPage([595.28, 841.89]);
  p3.drawText('EXECUTION & SIGNATURE PAGE', { x: 50, y: 770, size: 15, font: boldFont, color: blue });
  p3.drawText('IN WITNESS WHEREOF, the authorized representatives have executed this Agreement.', {
    x: 50,
    y: 740,
    size: 10,
    font,
    color: dark,
  });

  // Signature Block 1
  p3.drawRectangle({
    x: 50,
    y: 530,
    width: 235,
    height: 180,
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 1,
    color: rgb(0.98, 0.99, 1),
  });
  p3.drawText('ON BEHALF OF PARTY A:', { x: 65, y: 685, size: 9, font: boldFont, color: blue });
  p3.drawText('Authorized Officer: Alexander Vance, CEO', { x: 65, y: 665, size: 9, font, color: dark });
  p3.drawText('Signature:', { x: 65, y: 635, size: 9, font: boldFont, color: dark });
  p3.drawLine({ start: { x: 65, y: 575 }, end: { x: 260, y: 575 }, thickness: 1, color: rgb(0.6, 0.6, 0.6) });
  p3.drawText('[ Alexander Vance ]', { x: 90, y: 585, size: 12, font: italicFont, color: rgb(0.1, 0.3, 0.7) });
  p3.drawText('Date: October 21, 2026', { x: 65, y: 550, size: 9, font, color: gray });

  // Signature Block 2 (Blank for user to sign!)
  p3.drawRectangle({
    x: 310,
    y: 530,
    width: 235,
    height: 180,
    borderColor: blue,
    borderWidth: 1.5,
    color: rgb(0.97, 0.99, 1),
  });
  p3.drawText('ON BEHALF OF PARTY B (Sign Here):', { x: 325, y: 685, size: 9, font: boldFont, color: blue });
  p3.drawText('Authorized Officer: [ Click Fill & Sign Tool ]', { x: 325, y: 665, size: 9, font: italicFont, color: gray });
  p3.drawText('Signature Required:', { x: 325, y: 635, size: 9, font: boldFont, color: dark });
  p3.drawLine({ start: { x: 325, y: 575 }, end: { x: 520, y: 575 }, thickness: 1, color: rgb(0.6, 0.6, 0.6) });
  p3.drawText('Date: ________________________', { x: 325, y: 550, size: 9, font, color: gray });

  p3.drawText('Page 3 of 3 — Mutual NDA', { x: 50, y: 35, size: 8, font: italicFont, color: gray });

  doc.setTitle('Mutual Non-Disclosure Agreement');
  doc.setAuthor('Apex Legal Dept');
  doc.setSubject('Commercial Confidentiality');
  doc.setKeywords(['NDA', 'Contract', 'Legal', 'Commercial']);

  const bytes = await doc.save();
  return { data: bytes, name: 'Mutual_NDA_Agreement_2026.pdf' };
}

async function generateFinancialReport(): Promise<{ data: Uint8Array; name: string }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const p1 = doc.addPage([595.28, 841.89]);
  const blue = rgb(0.08, 0.45, 0.82);
  const dark = rgb(0.1, 0.12, 0.15);

  p1.drawText('QUARTERLY FINANCIAL PERFORMANCE REPORT', {
    x: 50,
    y: 770,
    size: 16,
    font: boldFont,
    color: blue,
  });
  p1.drawText('Fiscal Year 2026 — Quarter 3 Summary & Operating Margins', {
    x: 50,
    y: 750,
    size: 10,
    font,
    color: rgb(0.4, 0.45, 0.5),
  });

  // Table Header
  p1.drawRectangle({
    x: 50,
    y: 690,
    width: 495,
    height: 30,
    color: rgb(0.08, 0.45, 0.82),
  });
  p1.drawText('Segment / Metric', { x: 60, y: 702, size: 10, font: boldFont, color: rgb(1, 1, 1) });
  p1.drawText('Q1 2026', { x: 230, y: 702, size: 10, font: boldFont, color: rgb(1, 1, 1) });
  p1.drawText('Q2 2026', { x: 320, y: 702, size: 10, font: boldFont, color: rgb(1, 1, 1) });
  p1.drawText('Q3 2026 (Actual)', { x: 410, y: 702, size: 10, font: boldFont, color: rgb(1, 1, 1) });

  const rows = [
    ['Enterprise Cloud Revenue', '$14,250,000', '$16,800,000', '$21,450,000'],
    ['Software Subscription ARR', '$8,900,000', '$9,650,000', '$11,200,000'],
    ['Cost of Goods Sold (COGS)', '($4,200,000)', '($4,600,000)', '($5,100,000)'],
    ['Gross Operating Margin', '81.8%', '82.6%', '84.3%'],
    ['R&D Innovation Expenditures', '($3,100,000)', '($3,400,000)', '($3,900,000)'],
    ['Net Operating Profit (EBITDA)', '$7,250,000', '$8,850,000', '$12,450,000'],
  ];

  let currentY = 665;
  rows.forEach((row, idx) => {
    if (idx % 2 === 0) {
      p1.drawRectangle({
        x: 50,
        y: currentY - 5,
        width: 495,
        height: 24,
        color: rgb(0.96, 0.97, 0.99),
      });
    }
    p1.drawText(row[0], { x: 60, y: currentY, size: 9, font: boldFont, color: dark });
    p1.drawText(row[1], { x: 230, y: currentY, size: 9, font, color: dark });
    p1.drawText(row[2], { x: 320, y: currentY, size: 9, font, color: dark });
    p1.drawText(row[3], { x: 410, y: currentY, size: 9, font: boldFont, color: blue });
    currentY -= 26;
  });

  // Page 2
  const p2 = doc.addPage([595.28, 841.89]);
  p2.drawText('KEY PERFORMANCE INDICATORS & FORECAST', { x: 50, y: 770, size: 14, font: boldFont, color: blue });
  p2.drawText(
    'Total active enterprise seats crossed 420,000 with a net revenue retention rate (NRR) of 134%. Customer churn reduced to a historical low of 0.8% annually.',
    { x: 50, y: 730, size: 10, font, color: dark, maxWidth: 495, lineHeight: 15 }
  );

  doc.setTitle('Quarterly Financial Report Q3 2026');
  doc.setAuthor('Corporate Finance Office');
  return { data: await doc.save(), name: 'Financial_Report_Q3_2026.pdf' };
}

async function generateScannedInvoice(): Promise<{ data: Uint8Array; name: string }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const boldFont = await doc.embedFont(StandardFonts.CourierBold);

  const p1 = doc.addPage([595.28, 841.89]);
  const dark = rgb(0.15, 0.15, 0.15);

  p1.drawText('COMMERCIAL INVOICE / FREIGHT VOUCHER', { x: 60, y: 760, size: 14, font: boldFont, color: dark });
  p1.drawText('INVOICE NO: INV-88492-X | DATE: 2026-10-14', { x: 60, y: 740, size: 10, font, color: dark });
  p1.drawText('TRACKING CODE: DHL-AIR-772910398', { x: 60, y: 725, size: 10, font, color: dark });

  p1.drawRectangle({
    x: 60,
    y: 500,
    width: 475,
    height: 200,
    borderWidth: 1,
    borderColor: dark,
  });

  p1.drawText('BILL TO: ACME LOGISTICS & WAREHOUSING LLC', { x: 75, y: 670, size: 10, font: boldFont, color: dark });
  p1.drawText('TAX IDENTIFIER: 44-99201948 (CONFIDENTIAL)', { x: 75, y: 650, size: 10, font, color: dark });
  p1.drawText('ACCOUNT NUMBER: 9028-1102-4491-002', { x: 75, y: 630, size: 10, font, color: dark });
  p1.drawText('ITEM DESCRIPTION: High-Density Server Racks x 12', { x: 75, y: 600, size: 10, font, color: dark });
  p1.drawText('TOTAL AMOUNT DUE: $48,750.00 USD', { x: 75, y: 570, size: 11, font: boldFont, color: dark });
  p1.drawText('STATUS: PENDING COMPLIANCE AUDIT', { x: 75, y: 530, size: 10, font: boldFont, color: dark });

  doc.setTitle('Scanned Commercial Invoice');
  return { data: await doc.save(), name: 'Scanned_Invoice_88492.pdf' };
}
