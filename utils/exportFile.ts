import { saveAs } from 'file-saver'
import { asBlob } from 'html-docx-js-typescript'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export const exportToMarkdown = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  saveAs(blob, `${filename}.md`)
}

export const exportToWord = async (elementId: string, filename: string, content?: string) => {
  const element = document.getElementById(elementId)

  let htmlContent = ''

  if (element) {
    const clone = element.cloneNode(true) as HTMLElement

    htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.5; color: #333; }
            h1 { font-size: 24px; font-weight: bold; margin-bottom: 16px; }
            h2 { font-size: 20px; font-weight: bold; margin-bottom: 12px; margin-top: 24px; }
            h3 { font-size: 18px; font-weight: bold; margin-bottom: 8px; margin-top: 16px; }
            p { margin-bottom: 12px; }
            ul { margin-bottom: 12px; padding-left: 24px; }
            li { margin-bottom: 4px; }
            a { color: #0066cc; text-decoration: none; }
          </style>
        </head>
        <body>
          ${clone.innerHTML}
        </body>
      </html>
    `
  } else if (content) {
    htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>body { font-family: 'Arial', sans-serif; white-space: pre-wrap; }</style>
        </head>
        <body>
          ${content.replace(/\n/g, '<br>')}
        </body>
      </html>
    `
  } else {
    console.error(`Element with id ${elementId} not found and no content provided`)
    return
  }

  try {
    // @ts-ignore
    const buffer = await asBlob(htmlContent)
    saveAs(buffer as Blob, `${filename}.docx`)
  } catch (error) {
    console.error('Failed to export to Word:', error)
    throw error
  }
}

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error('Element not found. Please ensure the summary is visible.')
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    })

    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(`${filename}.pdf`)
  } catch (error) {
    console.error('Failed to export to PDF:', error)
    throw error
  }
}

export const exportToMindMapHTML = (content: string, filename: string) => {
  // Escape backticks and other special characters for the template string
  const escapedContent = content.replace(/`/g, '\\`').replace(/\$/g, '\\$')

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${filename} - Mind Map</title>
<style>
* { margin: 0; padding: 0; }
#mindmap { display: block; width: 100vw; height: 100vh; }
</style>
</head>
<body>
<svg id="mindmap"></svg>
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="https://cdn.jsdelivr.net/npm/markmap-view"></script>
<script src="https://cdn.jsdelivr.net/npm/markmap-lib"></script>
<script>
    const { markmap } = window;
    const { Markmap, loadCSS, loadJS } = markmap;
    const transformer = new markmap.Transformer();
    
    const markdown = \`${escapedContent}\`;
    
    const { root, features } = transformer.transform(markdown);
    const { styles, scripts } = transformer.getAssets(features);
    
    if (styles) loadCSS(styles);
    if (scripts) loadJS(scripts, { getMarkmap: () => markmap });
    
    Markmap.create('#mindmap', null, root);
</script>
</body>
</html>
    `

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
  saveAs(blob, `${filename}.html`)
}
