import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const A4 = [595.28, 841.89]
const MARGIN = 46
const ink = rgb(0.035, 0.11, 0.24)
const muted = rgb(0.35, 0.43, 0.56)
const white = rgb(1, 1, 1)
const line = rgb(0.84, 0.88, 0.94)
const pale = rgb(0.95, 0.97, 1)
const colors = [rgb(0.08, 0.43, 0.96), rgb(0.49, 0.2, 0.93), rgb(0.02, 0.72, 0.59), rgb(1, 0.57, 0.08), rgb(0.96, 0.24, 0.48)]

const clean = value => String(value ?? '')
  .replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  .replace(/→/g, '->').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/•/g, '-')
  .split('').map(character => character.charCodeAt(0) <= 255 ? character : '?').join('')

function wrap(text, font, size, width) {
  const lines = []
  for (const paragraph of clean(text).split(/\r?\n/)) {
    if (!paragraph.trim()) { lines.push(''); continue }
    let current = ''
    for (const word of paragraph.split(/\s+/)) {
      const next = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= width) current = next
      else { if (current) lines.push(current); current = word }
    }
    if (current) lines.push(current)
  }
  return lines
}

function textBlock(page, text, { x, y, width, font, size = 10, leading = 14, color = ink, maxLines = 20 }) {
  const lines = wrap(text, font, size, width).slice(0, maxLines)
  lines.forEach((value, index) => page.drawText(value, { x, y: y - index * leading, font, size, color }))
  return y - lines.length * leading
}

function box(page, x, y, width, height, color, border = color) {
  page.drawRectangle({ x, y, width, height, color, borderColor: border, borderWidth: 0.8 })
}

function header(page, fonts, guide, pageNumber, accent) {
  page.drawText('STUDENTLEY', { x: MARGIN, y: A4[1] - 30, font: fonts.bold, size: 8, color: accent })
  const label = clean(guide.config?.subjectName || guide.title)
  page.drawText(label, { x: A4[0] - MARGIN - fonts.regular.widthOfTextAtSize(label, 8), y: A4[1] - 30, font: fonts.regular, size: 8, color: muted })
  page.drawLine({ start: { x: MARGIN, y: A4[1] - 39 }, end: { x: A4[0] - MARGIN, y: A4[1] - 39 }, thickness: 0.7, color: line })
  page.drawText(String(pageNumber).padStart(2, '0'), { x: A4[0] - MARGIN - 15, y: 24, font: fonts.bold, size: 8, color: accent })
}

function drawBars(page, labels, values, x, y, width, height, fonts, accent) {
  const count = Math.min(6, Math.max(labels.length, values.length, 3))
  const numbers = Array.from({ length: count }, (_, index) => Math.abs(Number(values[index])) || index + 1)
  const maximum = Math.max(...numbers, 1), gap = 9, barWidth = (width - gap * (count - 1)) / count
  page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 1, color: line })
  numbers.forEach((value, index) => {
    const barHeight = Math.max(12, value / maximum * (height - 24))
    page.drawRectangle({ x: x + index * (barWidth + gap), y, width: barWidth, height: barHeight, color: index % 2 ? colors[2] : accent, opacity: 0.88 })
    page.drawText(clean(labels[index] || `${index + 1}`).slice(0, 11), { x: x + index * (barWidth + gap), y: y - 14, font: fonts.regular, size: 6.5, color: muted })
  })
}

function drawLineGraph(page, labels, values, x, y, width, height, fonts, accent, coordinate = false) {
  for (let index = 0; index <= 5; index += 1) page.drawLine({ start: { x, y: y + index * height / 5 }, end: { x: x + width, y: y + index * height / 5 }, thickness: 0.35, color: line })
  for (let index = 0; index <= 6; index += 1) page.drawLine({ start: { x: x + index * width / 6, y }, end: { x: x + index * width / 6, y: y + height }, thickness: 0.35, color: line })
  page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 1.1, color: muted }); page.drawLine({ start: { x, y }, end: { x, y: y + height }, thickness: 1.1, color: muted })
  const count = Math.min(7, Math.max(values.length, labels.length, 4))
  const numbers = Array.from({ length: count }, (_, index) => Number.isFinite(Number(values[index])) ? Number(values[index]) : (coordinate ? index * index : index + 1))
  const minimum = Math.min(...numbers), maximum = Math.max(...numbers), range = maximum - minimum || 1
  const points = numbers.map((value, index) => ({ x: x + index * width / Math.max(1, count - 1), y: y + 8 + (value - minimum) / range * (height - 16) }))
  points.forEach((point, index) => {
    if (index) page.drawLine({ start: points[index - 1], end: point, thickness: 2.2, color: accent })
    page.drawCircle({ x: point.x, y: point.y, size: 3.5, color: white, borderColor: accent, borderWidth: 2 })
    page.drawText(clean(labels[index] || `${index + 1}`).slice(0, 9), { x: Math.min(point.x - 8, x + width - 18), y: y - 14, font: fonts.regular, size: 6.5, color: muted })
  })
}

function drawSteps(page, steps, x, y, width, height, fonts, accent, cycle = false) {
  const items = (steps?.length ? steps : ['Start', 'Understand', 'Apply', 'Check']).slice(0, 6)
  if (cycle) {
    const centerX = x + width / 2, centerY = y + height / 2, radius = Math.min(width, height) * .31
    items.forEach((item, index) => {
      const angle = Math.PI / 2 - index * Math.PI * 2 / items.length
      const nodeX = centerX + Math.cos(angle) * radius, nodeY = centerY + Math.sin(angle) * radius
      page.drawCircle({ x: nodeX, y: nodeY, size: 21, color: index % 2 ? colors[2] : accent })
      page.drawText(String(index + 1), { x: nodeX - 3.5, y: nodeY - 4, font: fonts.bold, size: 10, color: white })
      textBlock(page, item, { x: nodeX - 43, y: nodeY - 31, width: 86, font: fonts.bold, size: 6.5, leading: 8, maxLines: 2 })
    })
    return
  }
  const rowHeight = height / items.length
  items.forEach((item, index) => {
    const nodeY = y + height - (index + .5) * rowHeight
    if (index < items.length - 1) page.drawLine({ start: { x: x + 22, y: nodeY - 18 }, end: { x: x + 22, y: nodeY - rowHeight + 18 }, thickness: 2, color: line })
    page.drawCircle({ x: x + 22, y: nodeY, size: 17, color: index % 2 ? colors[1] : accent })
    page.drawText(String(index + 1).padStart(2, '0'), { x: x + 14, y: nodeY - 3.5, font: fonts.bold, size: 8, color: white })
    textBlock(page, item, { x: x + 50, y: nodeY + 4, width: width - 50, font: fonts.bold, size: 8.5, leading: 11, maxLines: 2 })
  })
}

function drawComparison(page, labels, steps, x, y, width, height, fonts) {
  const headings = labels.length >= 2 ? labels.slice(0, 2) : ['Idea A', 'Idea B'], columnWidth = (width - 12) / 2
  headings.forEach((heading, index) => {
    const left = x + index * (columnWidth + 12)
    box(page, left, y, columnWidth, height, index ? rgb(0.91, 0.99, 0.96) : rgb(0.93, 0.96, 1), index ? colors[2] : colors[0])
    textBlock(page, heading, { x: left + 12, y: y + height - 24, width: columnWidth - 24, font: fonts.bold, size: 10, leading: 12, maxLines: 2 })
    steps.filter((_, itemIndex) => itemIndex % 2 === index).slice(0, 4).forEach((detail, detailIndex) => {
      page.drawCircle({ x: left + 16, y: y + height - 62 - detailIndex * 38, size: 3, color: index ? colors[2] : colors[0] })
      textBlock(page, detail, { x: left + 25, y: y + height - 58 - detailIndex * 38, width: columnWidth - 37, font: fonts.regular, size: 7.5, leading: 9.5, maxLines: 3 })
    })
  })
}

function drawDiagram(page, labels, steps, x, y, width, height, fonts, accent) {
  const items = (labels.length ? labels : steps).slice(0, 5), center = { x: x + width / 2, y: y + height / 2 }
  page.drawCircle({ x: center.x, y: center.y, size: 42, color: accent }); page.drawText('KEY', { x: center.x - 13, y: center.y - 4, font: fonts.bold, size: 12, color: white })
  items.forEach((item, index) => {
    const angle = Math.PI / 2 - index * Math.PI * 2 / Math.max(items.length, 1), node = { x: center.x + Math.cos(angle) * width * .37, y: center.y + Math.sin(angle) * height * .34 }
    page.drawLine({ start: center, end: node, thickness: 1.4, color: line }); page.drawCircle({ x: node.x, y: node.y, size: 15, color: index % 2 ? colors[2] : colors[1] })
    page.drawText(String(index + 1), { x: node.x - 3, y: node.y - 3.5, font: fonts.bold, size: 8, color: white })
    textBlock(page, item, { x: node.x - 42, y: node.y - 23, width: 84, font: fonts.bold, size: 6.5, leading: 8, maxLines: 2 })
  })
}

function visual(page, section, x, y, width, height, fonts, accent) {
  box(page, x, y, width, height, pale, line)
  page.drawText(clean(section.visual_title || 'See the idea'), { x: x + 16, y: y + height - 24, font: fonts.bold, size: 10, color: accent })
  const vx = x + 20, vy = y + 34, vw = width - 40, vh = height - 80
  const labels = Array.isArray(section.labels) ? section.labels.map(clean) : [], values = Array.isArray(section.values) ? section.values : [], steps = Array.isArray(section.steps) ? section.steps.map(clean) : []
  if (section.visual_type === 'bar_chart') drawBars(page, labels, values, vx, vy + 14, vw, vh - 12, fonts, accent)
  else if (section.visual_type === 'line_graph' || section.visual_type === 'coordinate_graph') drawLineGraph(page, labels, values, vx, vy + 12, vw, vh - 10, fonts, accent, section.visual_type === 'coordinate_graph')
  else if (section.visual_type === 'comparison') drawComparison(page, labels, steps, vx, vy, vw, vh, fonts)
  else if (section.visual_type === 'labeled_diagram') drawDiagram(page, labels, steps, vx, vy, vw, vh, fonts, accent)
  else drawSteps(page, steps.length ? steps : labels, vx, vy, vw, vh, fonts, accent, section.visual_type === 'cycle')
}

function cover(pdf, fonts, guide) {
  const page = pdf.addPage(A4)
  page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: rgb(0.94, 0.96, 1) })
  page.drawCircle({ x: 525, y: 755, size: 155, color: colors[0], opacity: .14 }); page.drawCircle({ x: 505, y: 115, size: 115, color: colors[1], opacity: .12 }); page.drawCircle({ x: 70, y: 315, size: 95, color: colors[2], opacity: .13 })
  box(page, MARGIN, 735, 118, 32, colors[0]); page.drawText('VISUAL EXPLAINER', { x: MARGIN + 13, y: 746, font: fonts.bold, size: 8.5, color: white })
  let y = textBlock(page, guide.title || 'Visual explanation', { x: MARGIN, y: 665, width: 490, font: fonts.bold, size: 31, leading: 36, color: ink, maxLines: 4 }) - 12
  y = textBlock(page, guide.config?.subtitle || 'A simple, visual guide made for you.', { x: MARGIN, y, width: 465, font: fonts.regular, size: 14, leading: 19, color: muted, maxLines: 3 }) - 35
  ;(guide.config?.keyIdeas || []).slice(0, 5).forEach((idea, index) => {
    const nodeY = y - index * 61
    page.drawCircle({ x: MARGIN + 22, y: nodeY, size: 21, color: colors[index % colors.length] }); page.drawText(String(index + 1).padStart(2, '0'), { x: MARGIN + 14, y: nodeY - 4, font: fonts.bold, size: 9, color: white })
    page.drawLine({ start: { x: MARGIN + 43, y: nodeY }, end: { x: MARGIN + 72, y: nodeY }, thickness: 2, color: colors[index % colors.length] })
    textBlock(page, idea, { x: MARGIN + 82, y: nodeY + 5, width: 390, font: fonts.bold, size: 10.5, leading: 13, maxLines: 2 })
  })
  page.drawText(clean(`${guide.config?.subjectName || 'Study guide'} | ${guide.config?.level || 'Personalized level'}`), { x: MARGIN, y: 55, font: fonts.bold, size: 9, color: colors[0] })
  page.drawText('Generated from the source or topic selected by the student.', { x: MARGIN, y: 39, font: fonts.regular, size: 7.5, color: muted })
}

function sectionPage(pdf, fonts, guide, section, index) {
  const page = pdf.addPage(A4), accent = colors[index % colors.length]
  header(page, fonts, guide, index + 2, accent)
  page.drawCircle({ x: MARGIN + 30, y: 748, size: 29, color: accent }); page.drawText(String(index + 1).padStart(2, '0'), { x: MARGIN + 17, y: 738, font: fonts.bold, size: 21, color: white })
  textBlock(page, section.heading, { x: MARGIN + 76, y: 759, width: 420, font: fonts.bold, size: 21, leading: 25, maxLines: 2 })
  let y = textBlock(page, section.explanation, { x: MARGIN, y: 684, width: A4[0] - MARGIN * 2, font: fonts.regular, size: 11, leading: 16, color: ink, maxLines: 7 }) - 12
  const visualHeight = Math.min(300, Math.max(215, y - 315)); visual(page, section, MARGIN, y - visualHeight, A4[0] - MARGIN * 2, visualHeight, fonts, accent)
  const lowerY = y - visualHeight - 25
  box(page, MARGIN, lowerY - 105, 305, 105, rgb(0.98, 0.985, 1), line); page.drawText('WORKED EXAMPLE', { x: MARGIN + 15, y: lowerY - 22, font: fonts.bold, size: 7.5, color: accent })
  textBlock(page, section.example, { x: MARGIN + 15, y: lowerY - 42, width: 275, font: fonts.regular, size: 8.8, leading: 12, maxLines: 5 })
  box(page, MARGIN + 319, lowerY - 105, 176, 105, rgb(0.94, 0.99, 0.97), colors[2]); page.drawText('REMEMBER', { x: MARGIN + 334, y: lowerY - 22, font: fonts.bold, size: 7.5, color: colors[2] })
  textBlock(page, section.takeaway, { x: MARGIN + 334, y: lowerY - 43, width: 146, font: fonts.bold, size: 8.8, leading: 12, maxLines: 5 })
  const checkY = Math.max(55, lowerY - 140); page.drawText('QUICK CHECK', { x: MARGIN, y: checkY, font: fonts.bold, size: 7.5, color: colors[1] })
  textBlock(page, section.review_question, { x: MARGIN + 82, y: checkY + 1, width: 410, font: fonts.bold, size: 8.5, leading: 11, maxLines: 2 })
}

function glossaryPage(pdf, fonts, guide) {
  const entries = guide.config?.glossary || []
  if (!entries.length) return
  const page = pdf.addPage(A4); header(page, fonts, guide, pdf.getPageCount(), colors[1])
  page.drawText('Quick glossary', { x: MARGIN, y: 752, font: fonts.bold, size: 25, color: ink }); page.drawText('The important words, explained simply.', { x: MARGIN, y: 726, font: fonts.regular, size: 11, color: muted })
  let y = 682
  entries.slice(0, 12).forEach((entry, index) => {
    const accent = colors[index % colors.length]
    page.drawCircle({ x: MARGIN + 16, y: y + 2, size: 13, color: accent }); page.drawText(String(index + 1), { x: MARGIN + 12.5, y: y - 1.5, font: fonts.bold, size: 7.5, color: white })
    page.drawText(clean(entry.term).slice(0, 48), { x: MARGIN + 40, y: y + 6, font: fonts.bold, size: 10, color: ink })
    y = textBlock(page, entry.meaning, { x: MARGIN + 40, y: y - 10, width: 440, font: fonts.regular, size: 8.5, leading: 11, color: muted, maxLines: 3 }) - 18
  })
}

export async function buildVisualExplanationPdfBytes(guide) {
  const pdf = await PDFDocument.create()
  const fonts = { regular: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold) }
  pdf.setTitle(clean(guide.title || 'Studentley visual explanation')); pdf.setAuthor('Studentley'); pdf.setSubject(clean(guide.config?.topic || guide.config?.subjectName || 'Visual study guide'))
  cover(pdf, fonts, guide); (guide.items || []).forEach((section, index) => sectionPage(pdf, fonts, guide, section, index)); glossaryPage(pdf, fonts, guide)
  return pdf.save()
}

export async function downloadVisualExplanationPdf(guide) {
  const bytes = await buildVisualExplanationPdfBytes(guide), blob = new Blob([bytes], { type: 'application/pdf' }), url = URL.createObjectURL(blob), anchor = document.createElement('a')
  anchor.href = url; anchor.download = `${clean(guide.title || 'visual-explanation').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'visual-explanation'}.pdf`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
