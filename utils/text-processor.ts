/**
 * Clean and normalize extracted text
 */
export function cleanAndNormalizeText(text: string): string {
  // Remove excessive whitespace
  let cleanedText = text.replace(/\s+/g, ' ');
  
  // Remove PDF artifacts and control characters
  cleanedText = cleanedText.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Remove common PDF artifacts
  cleanedText = cleanedText.replace(/endobj|startxref|xref|trailer|\%PDF|\%EOF/g, '');
  
  // Replace multiple line breaks with a single one
  cleanedText = cleanedText.replace(/(\r\n|\n|\r){2,}/g, '\n');
  
  // Trim whitespace
  cleanedText = cleanedText.trim();
  
  return cleanedText;
}

/**
 * Detect if the document is a structured document like financial statement, insurance letter, etc.
 */
export function detectStructuredDocument(text: string): { type: string; confidence: number } {
  // Financial document patterns
  const financialPatterns = [
    /\baccount\s+statement\b/i,
    /\bbalance\s+sheet\b/i,
    /\bincome\s+statement\b/i,
    /\bstatement\s+of\s+financial\s+position\b/i,
    /\bbank\s+statement\b/i,
    /\btransaction\s+history\b/i,
    /\bdebit\b.*\bcredit\b/i,
    /\bbeginning\s+balance\b.*\bending\s+balance\b/i,
    /\bportfolio\s+summary\b/i,
    /\binvestment\s+account\b/i
  ];
  
  // Insurance document patterns
  const insurancePatterns = [
    /\binsurance\s+policy\b/i,
    /\bpolicy\s+number\b/i,
    /\bcoverage\s+summary\b/i,
    /\bpremium\b/i,
    /\bdeductible\b/i,
    /\bpolicy\s+period\b/i,
    /\binsured\s+party\b/i,
    /\bliability\s+coverage\b/i,
    /\bclaim\s+form\b/i,
    /\bbenefits\s+summary\b/i
  ];
  
  // Legal document patterns
  const legalPatterns = [
    /\bagreement\s+between\b/i,
    /\bcontract\b/i,
    /\bterms\s+and\s+conditions\b/i,
    /\bhereby\s+agrees\b/i,
    /\bin\s+witness\s+whereof\b/i,
    /\bparties\s+agree\b/i,
    /\bexecuted\s+as\s+of\b/i,
    /\blegal\s+notice\b/i,
    /\bsignature\b.*\bdate\b/i,
    /\beffective\s+date\b/i
  ];
  
  // Tax document patterns
  const taxPatterns = [
    /\btax\s+return\b/i,
    /\bform\s+1040\b/i,
    /\bw-2\b/i,
    /\bw-4\b/i,
    /\btaxable\s+income\b/i,
    /\btax\s+year\b/i,
    /\badjusted\s+gross\s+income\b/i,
    /\birs\b/i,
    /\bschedule\s+[a-e]\b/i,
    /\btax\s+credit\b/i
  ];
  
  // Count matches for each document type
  const financialMatches = financialPatterns.filter(pattern => pattern.test(text)).length;
  const insuranceMatches = insurancePatterns.filter(pattern => pattern.test(text)).length;
  const legalMatches = legalPatterns.filter(pattern => pattern.test(text)).length;
  const taxMatches = taxPatterns.filter(pattern => pattern.test(text)).length;
  
  // Calculate confidence scores (0-1)
  const financialConfidence = financialMatches / financialPatterns.length;
  const insuranceConfidence = insuranceMatches / insurancePatterns.length;
  const legalConfidence = legalMatches / legalPatterns.length;
  const taxConfidence = taxMatches / taxPatterns.length;
  
  // Find the document type with the highest confidence
  const confidenceScores = [
    { type: 'financial', confidence: financialConfidence },
    { type: 'insurance', confidence: insuranceConfidence },
    { type: 'legal', confidence: legalConfidence },
    { type: 'tax', confidence: taxConfidence }
  ];
  
  const highestConfidence = confidenceScores.reduce((prev, current) => 
    (prev.confidence > current.confidence) ? prev : current
  );
  
  // Return unknown if confidence is too low
  if (highestConfidence.confidence < 0.2) {
    return { type: 'unknown', confidence: 0 };
  }
  
  return highestConfidence;
}

/**
 * Clean structured text based on document type
 */
export function cleanStructuredText(text: string, documentType: string): string {
  // First apply basic cleaning
  let cleanedText = cleanAndNormalizeText(text);
  
  // Apply document-specific cleaning
  switch (documentType) {
    case 'financial':
      // Preserve dollar amounts and dates
      cleanedText = cleanedText.replace(/(\$\s*[\d,]+\.\d+)/g, ' $1 ');
      cleanedText = cleanedText.replace(/(\d{1,2}\/\d{1,2}\/\d{2,4})/g, ' $1 ');
      break;
      
    case 'insurance':
      // Preserve policy numbers and coverage amounts
      cleanedText = cleanedText.replace(/(\bpolicy\s+number\s*[:;]?\s*[\w\d-]+)/gi, ' $1 ');
      cleanedText = cleanedText.replace(/(\$\s*[\d,]+\.\d+)/g, ' $1 ');
      break;
      
    case 'legal':
      // Preserve section numbering and legal formatting
      cleanedText = cleanedText.replace(/(\b\d+\.\d+\.\d+\b)/g, '\n$1 ');
      cleanedText = cleanedText.replace(/(\bsection\s+\d+\b)/gi, '\n$1 ');
      break;
      
    case 'tax':
      // Preserve form numbers and line references
      cleanedText = cleanedText.replace(/(\bform\s+[\w-]+\b)/gi, ' $1 ');
      cleanedText = cleanedText.replace(/(\bline\s+\d+\b)/gi, ' $1 ');
      break;
      
    default:
      // No special processing for unknown document types
      break;
  }
  
  return cleanedText;
}
