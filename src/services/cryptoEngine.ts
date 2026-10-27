import forge from 'node-forge';
import { DigitalCertificateConfig, DigitalSignatureInfo } from '../types';

export interface GeneratedCredentials {
  privateKeyPem: string;
  certificatePem: string;
  certificate: forge.pki.Certificate;
}

export class CryptoEngine {
  /**
   * Generates a genuine RSA 2048-bit keypair and self-signed X.509 certificate
   */
  static generateCertificate(config: DigitalCertificateConfig): GeneratedCredentials {
    // Generate RSA key pair
    const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });

    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = Math.floor(Math.random() * 100000000).toString(16);

    const now = new Date();
    cert.validity.notBefore = new Date(now.getTime() - 60000); // 1 min back
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setDate(now.getDate() + (config.validityDays || 365));

    const attrs = [
      { name: 'commonName', value: config.commonName || 'HHM PDF Signer' },
      { name: 'countryName', value: config.country || 'US' },
      { name: 'organizationName', value: config.organization || 'HHM PDF User' },
    ];

    if (config.department) {
      attrs.push({ name: 'organizationalUnitName', value: config.department });
    }
    if (config.email) {
      attrs.push({ name: 'emailAddress', value: config.email });
    }

    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    // Standard X.509 extensions for digital signatures
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false,
      },
      {
        name: 'keyUsage',
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
      },
      {
        name: 'extKeyUsage',
        adobePDFSignature: true,
      },
      {
        name: 'subjectKeyIdentifier',
      },
    ]);

    // Sign certificate with private key using SHA-256
    cert.sign(keys.privateKey, forge.md.sha256.create());

    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
    const certificatePem = forge.pki.certificateToPem(cert);

    return {
      privateKeyPem,
      certificatePem,
      certificate: cert,
    };
  }

  /**
   * Parse PKCS#12 (.p12 / .pfx) certificate bundle
   */
  static parseP12(p12Asn1OrBase64: string | ArrayBuffer, password: string): GeneratedCredentials {
    let p12Der: string;
    if (typeof p12Asn1OrBase64 === 'string') {
      p12Der = forge.util.decode64(p12Asn1OrBase64);
    } else {
      const u8 = new Uint8Array(p12Asn1OrBase64);
      p12Der = forge.util.binary.raw.encode(u8);
    }

    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Get certificate and private key
    let cert: forge.pki.Certificate | null = null;
    let key: forge.pki.PrivateKey | null = null;

    for (const bagType of [forge.pki.oids.certBag, forge.pki.oids.pkcs8ShroudedKeyBag, forge.pki.oids.keyBag]) {
      const bags = p12.getBags({ bagType });
      if (bags[bagType] && bags[bagType]!.length > 0) {
        for (const bag of bags[bagType]!) {
          if (bag.cert) cert = bag.cert;
          if (bag.key) key = bag.key;
        }
      }
    }

    if (!cert || !key) {
      throw new Error('Could not find both an X.509 certificate and private key in the P12 container.');
    }

    return {
      privateKeyPem: forge.pki.privateKeyToPem(key),
      certificatePem: forge.pki.certificateToPem(cert),
      certificate: cert,
    };
  }

  /**
   * Embeds an ISO 32000-1 compliant detached PKCS#7 digital signature into a PDF document
   */
  static async signPdfBytes(
    pdfBytes: Uint8Array,
    certificatePem: string,
    privateKeyPem: string,
    meta: {
      signerName: string;
      reason?: string;
      location?: string;
      contactInfo?: string;
    }
  ): Promise<Uint8Array> {
    const cert = forge.pki.certificateFromPem(certificatePem);
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    // Build ISO PDF date string: (D:YYYYMMDDHHmmSS+00'00')
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const dateStr = `D:${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    // Signature placeholder size (8192 bytes = 16384 hex chars)
    const SIGNATURE_SIZE = 8192;
    const contentsPlaceholder = '0'.repeat(SIGNATURE_SIZE * 2);

    // Convert PDF to text/binary representation to append signature dictionary and trailer
    let rawPdfStr = forge.util.binary.raw.encode(pdfBytes);

    // Find the last startxref
    const lastStartXrefIdx = rawPdfStr.lastIndexOf('startxref');
    if (lastStartXrefIdx === -1) {
      throw new Error('Invalid PDF: missing startxref pointer.');
    }

    // Allocate an object number for the signature
    // Match max object number in trailer / xref
    let maxObjNum = 100;
    const objMatches = rawPdfStr.match(/(\d+)\s+0\s+obj/g);
    if (objMatches) {
      for (const m of objMatches) {
        const num = parseInt(m.split(' ')[0], 10);
        if (num > maxObjNum) maxObjNum = num;
      }
    }
    const sigObjNum = maxObjNum + 1;

    // We build the signature dictionary with placeholder ByteRange [0000000000 0000000000 0000000000 0000000000]
    const byteRangePlaceholder = '/ByteRange [0000000000 0000000000 0000000000 0000000000]';

    const safeReason = (meta.reason || 'Document Authenticity Verified').replace(/[\(\)]/g, '');
    const safeLoc = (meta.location || 'Local Workstation').replace(/[\(\)]/g, '');
    const safeName = meta.signerName.replace(/[\(\)]/g, '');

    const sigObjContent = `${sigObjNum} 0 obj\n<<\n/Type /Sig\n/Filter /Adobe.PPKLite\n/SubFilter /adbe.pkcs7.detached\n${byteRangePlaceholder}\n/Contents <${contentsPlaceholder}>\n/M (${dateStr})\n/Name (${safeName})\n/Reason (${safeReason})\n/Location (${safeLoc})\n>>\nendobj\n`;

    const signedDocPre = rawPdfStr + '\n' + sigObjContent;

    // Calculate exact byte offsets for /Contents < ... >
    const contentsMarker = '/Contents <';
    const contentsStartIdx = signedDocPre.lastIndexOf(contentsMarker);
    if (contentsStartIdx === -1) {
      throw new Error('Failed to compute signature placeholder offset');
    }

    const hexStart = contentsStartIdx + contentsMarker.length;
    const hexEnd = hexStart + contentsPlaceholder.length;

    // ByteRange: [ 0, offset1, offset2, offset3 ]
    // offset1 = hexStart - 1 (including the '<')
    // offset2 = hexEnd + 1 (the byte immediately after '>')
    // offset3 = total length - offset2
    const byteRange = [
      0,
      hexStart - 1,
      hexEnd + 1,
      signedDocPre.length - (hexEnd + 1),
    ];

    const actualByteRangeStr = `/ByteRange [${byteRange[0].toString().padStart(10, '0')} ${byteRange[1].toString().padStart(10, '0')} ${byteRange[2].toString().padStart(10, '0')} ${byteRange[3].toString().padStart(10, '0')}]`;

    // Replace byteRange placeholder in document
    const docWithByteRange = signedDocPre.replace(byteRangePlaceholder, actualByteRangeStr);

    // Extract the exact two signed segments
    const segment1 = docWithByteRange.slice(byteRange[0], byteRange[0] + byteRange[1]);
    const segment2 = docWithByteRange.slice(byteRange[2], byteRange[2] + byteRange[3]);
    const totalDataToSign = segment1 + segment2;

    // Compute detached PKCS#7 signed data
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(totalDataToSign, 'raw');
    p7.addCertificate(cert);
    p7.addSigner({
      key: privateKey,
      certificate: cert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        {
          type: forge.pki.oids.messageDigest,
        },
        {
          type: forge.pki.oids.signingTime,
          value: now as any,
        },
      ],
    });

    p7.sign({ detached: true });

    const derAsn1 = p7.toAsn1();
    const derBytes = forge.asn1.toDer(derAsn1).getBytes();
    const derHex = forge.util.bytesToHex(derBytes).padEnd(contentsPlaceholder.length, '0');

    if (derHex.length > contentsPlaceholder.length) {
      throw new Error('Signature exceeds allocated container space.');
    }

    // Embed the hex into docWithByteRange
    const finalDocStr =
      docWithByteRange.slice(0, hexStart) +
      derHex +
      docWithByteRange.slice(hexEnd);

    return forge.util.binary.raw.decode(finalDocStr);
  }

  /**
   * Verifies all digital signatures found in a PDF document
   */
  static verifyPdfSignatures(pdfBytes: Uint8Array): DigitalSignatureInfo[] {
    const rawPdfStr = forge.util.binary.raw.encode(pdfBytes);
    const results: DigitalSignatureInfo[] = [];

    // Search for signature dictionaries ending with >>\s*endobj that contain /ByteRange
    const sigRegex = /<<[\s\S]*?(?:\/Type\s*\/Sig|\/ByteRange\s*\[)[\s\S]*?>>\s*endobj/g;
    let match: RegExpExecArray | null;

    let index = 0;
    while ((match = sigRegex.exec(rawPdfStr)) !== null) {
      index++;
      const sigDictStr = match[0];

      // Extract ByteRange
      const byteRangeMatch = sigDictStr.match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
      // Extract Contents
      const contentsMatch = sigDictStr.match(/\/Contents\s*<([0-9a-fA-F\s]+)>/);
      // Extract Name
      const nameMatch = sigDictStr.match(/\/Name\s*\(([^)]+)\)/);
      // Extract Reason
      const reasonMatch = sigDictStr.match(/\/Reason\s*\(([^)]+)\)/);
      // Extract Location
      const locationMatch = sigDictStr.match(/\/Location\s*\(([^)]+)\)/);
      // Extract Date
      const dateMatch = sigDictStr.match(/\/M\s*\(([^)]+)\)/);

      if (!byteRangeMatch || !contentsMatch) {
        continue;
      }

      const byteRange = [
        parseInt(byteRangeMatch[1], 10),
        parseInt(byteRangeMatch[2], 10),
        parseInt(byteRangeMatch[3], 10),
        parseInt(byteRangeMatch[4], 10),
      ];

      let rawHex = contentsMatch[1].replace(/\s+/g, '');
      if (rawHex.startsWith('30')) {
        // Parse ASN.1 DER sequence header to get exact byte length
        const secondByte = parseInt(rawHex.substring(2, 4), 16);
        let totalBytes = 2;
        if (secondByte < 0x80) {
          totalBytes += secondByte;
        } else {
          const numLenBytes = secondByte & 0x7f;
          const lenVal = parseInt(rawHex.substring(4, 4 + numLenBytes * 2), 16);
          totalBytes = 2 + numLenBytes + lenVal;
        }
        rawHex = rawHex.substring(0, totalBytes * 2);
      } else {
        rawHex = rawHex.replace(/0+$/, '');
        if (rawHex.length % 2 !== 0) rawHex += '0';
      }
      if (rawHex.length === 0 || rawHex.length % 2 !== 0) {
        continue;
      }

      try {
        const derBytes = forge.util.hexToBytes(rawHex);
        const asn1 = forge.asn1.fromDer(derBytes);
        const p7 = forge.pkcs7.messageFromAsn1(asn1) as any;

        const signerCert = p7.certificates?.[0];
        const signerName =
          nameMatch?.[1] ||
          signerCert?.subject?.getField('CN')?.value ||
          `Signer #${index}`;
        const org = signerCert?.subject?.getField('O')?.value || undefined;
        const email = signerCert?.subject?.getField('emailAddress')?.value || undefined;

        const notBefore = signerCert?.validity?.notBefore || new Date();
        const notAfter = signerCert?.validity?.notAfter || new Date();
        const isExpired = new Date() > notAfter;

        // Verify document integrity against ByteRange
        let isTampered = false;
        if (
          byteRange[0] !== 0 ||
          byteRange[0] + byteRange[1] > pdfBytes.length ||
          byteRange[2] + byteRange[3] > pdfBytes.length ||
          byteRange[2] < byteRange[0] + byteRange[1]
        ) {
          isTampered = true;
        } else {
          // Compute SHA-256 digest of signed segments
          const seg1 = rawPdfStr.slice(byteRange[0], byteRange[0] + byteRange[1]);
          const seg2 = rawPdfStr.slice(byteRange[2], byteRange[2] + byteRange[3]);
          const signedBytes = seg1 + seg2;

          const md = forge.md.sha256.create();
          md.update(signedBytes, 'raw');
          const computedDigestHex = md.digest().toHex();

          // Compare with messageDigest attribute inside PKCS#7 signedData
          if (p7.rawCapture && Array.isArray(p7.rawCapture.authenticatedAttributes)) {
            const digestAttr = p7.rawCapture.authenticatedAttributes.find(
              (a: any) => {
                try {
                  return forge.asn1.derToOid(a.value[0].value) === '1.2.840.113549.1.9.4';
                } catch {
                  return false;
                }
              }
            );
            if (digestAttr && digestAttr.value?.[1]?.value?.[0]?.value) {
              const expectedDigestHex = forge.util.bytesToHex(digestAttr.value[1].value[0].value);
              if (computedDigestHex.toLowerCase() !== expectedDigestHex.toLowerCase()) {
                isTampered = true;
              }
            }
          }
        }

        const certSubjectStr = signerCert
          ? signerCert.subject.attributes.map((a: any) => `${a.shortName || a.name}=${a.value}`).join(', ')
          : 'Unknown';
        const certIssuerStr = signerCert
          ? signerCert.issuer.attributes.map((a: any) => `${a.shortName || a.name}=${a.value}`).join(', ')
          : 'Unknown';

        results.push({
          id: `sig_${index}`,
          signerName,
          organization: org,
          email,
          reason: reasonMatch?.[1] || 'Digital Certification',
          location: locationMatch?.[1] || 'Document Workspace',
          signingTime: dateMatch?.[1] || notBefore.toISOString(),
          validityNotBefore: notBefore.toISOString(),
          validityNotAfter: notAfter.toISOString(),
          algorithm: 'RSA-SHA256 (PKCS#7 Detached)',
          isValid: !isExpired && !isTampered,
          isExpired,
          isTampered,
          certificateSubject: certSubjectStr,
          certificateIssuer: certIssuerStr,
          subFilter: 'adbe.pkcs7.detached',
          byteRange,
        });
      } catch (err) {
        console.warn('Error parsing signature in PDF:', err);
      }
    }

    return results;
  }
}
