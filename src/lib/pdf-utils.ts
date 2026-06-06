/**
 * PDF generation utilities.
 * Uses dynamic import for jspdf to avoid bundling the large package
 * when not needed. Install jspdf separately if PDF generation is required.
 */

export async function generatePDF(htmlContent: string, filename: string): Promise<Buffer> {
  try {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.html(htmlContent, {
      callback: (doc) => {
        return Buffer.from(doc.output('arraybuffer'))
      },
      x: 10,
      y: 10,
      width: 190,
    })
    return Buffer.from(doc.output('arraybuffer'))
  } catch (err) {
    console.error('[pdf-utils] jspdf not available:', (err as Error).message)
    throw new Error('PDF generation unavailable - jspdf not installed')
  }
}
