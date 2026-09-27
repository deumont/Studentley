import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const A4 = [595.28, 841.89]
const MARGIN = 52
const BOTTOM = 48
const ink = rgb(0.08, 0.12, 0.2)
const muted = rgb(0.35, 0.4, 0.49)
const line = rgb(0.73, 0.76, 0.81)
const blue = rgb(0.12, 0.43, 0.91)
const paleBlue = rgb(0.93, 0.96, 1)
const noGenericAnswerLineTypes = new Set(['multiple_choice', 'matching', 'fill_blank', 'table_completion', 'classification', 'label_diagram'])

function safeText(value) {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/→/g, '->')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/×/g, 'x')
    .replace(/÷/g, '/')
    .replace(/•/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
}

function wrapText(text, font, size, width) {
  const paragraphs = safeText(text).split(/\r?\n/)
  const lines = []
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) { lines.push(''); continue }
    let current = ''
    for (const word of paragraph.split(/\s+/)) {
      const next = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= width) current = next
      else {
        if (current) lines.push(current)
        if (font.widthOfTextAtSize(word, size) <= width) current = word
        else {
          let part = ''
          for (const character of word) {
            if (font.widthOfTextAtSize(part + character, size) > width && part) { lines.push(part); part = character }
            else part += character
          }
          current = part
        }
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

function drawWrapped(page, text, { x, y, width, font, size = 10, lineHeight = 14, color = ink }) {
  const lines = wrapText(text, font, size, width)
  lines.forEach((entry, index) => page.drawText(entry, { x, y: y - index * lineHeight, font, size, color }))
  return y - lines.length * lineHeight
}

function drawPageHeader(page, fonts, exam) {
  const qualification = safeText(exam.config?.qualification || 'Personalized')
  const subject = safeText(exam.config?.subjectName || exam.title || 'Mock examination')
  page.drawText('STUDENTLEY', { x: MARGIN, y: A4[1] - 35, font: fonts.bold, size: 9, color: blue })
  const header = `${qualification} | ${subject}`
  page.drawText(header, { x: A4[0] - MARGIN - fonts.regular.widthOfTextAtSize(header, 8), y: A4[1] - 35, font: fonts.regular, size: 8, color: muted })
  page.drawLine({ start: { x: MARGIN, y: A4[1] - 43 }, end: { x: A4[0] - MARGIN, y: A4[1] - 43 }, thickness: 0.7, color: line })
}

function drawFooter(page, fonts, pageNumber, pageCount, markScheme) {
  page.drawLine({ start: { x: MARGIN, y: 35 }, end: { x: A4[0] - MARGIN, y: 35 }, thickness: 0.5, color: line })
  const left = markScheme ? 'Studentley generated mark scheme' : 'Studentley generated practice paper'
  page.drawText(left, { x: MARGIN, y: 22, font: fonts.regular, size: 7, color: muted })
  const count = `Page ${pageNumber} of ${pageCount}`
  page.drawText(count, { x: A4[0] - MARGIN - fonts.regular.widthOfTextAtSize(count, 7), y: 22, font: fonts.regular, size: 7, color: muted })
}

function drawCandidateBox(page, fonts, y) {
  page.drawText('CANDIDATE NAME', { x: MARGIN, y: y + 15, font: fonts.bold, size: 8, color: ink })
  page.drawRectangle({ x: MARGIN + 95, y, width: A4[0] - MARGIN * 2 - 95, height: 34, borderColor: muted, borderWidth: 0.7 })
  page.drawText('CANDIDATE NUMBER', { x: MARGIN, y: y - 32, font: fonts.bold, size: 8, color: ink })
  for (let index = 0; index < 6; index += 1) page.drawRectangle({ x: MARGIN + 95 + index * 29, y: y - 47, width: 29, height: 29, borderColor: muted, borderWidth: 0.7 })
}

function drawCover(pdf, fonts, exam, markScheme) {
  const page = pdf.addPage(A4)
  page.drawRectangle({ x: 0, y: A4[1] - 118, width: A4[0], height: 118, color: paleBlue })
  page.drawRectangle({ x: MARGIN, y: A4[1] - 82, width: 38, height: 38, color: blue })
  page.drawText('S', { x: MARGIN + 12, y: A4[1] - 70, font: fonts.bold, size: 22, color: rgb(1, 1, 1) })
  page.drawText('STUDENTLEY', { x: MARGIN + 51, y: A4[1] - 59, font: fonts.bold, size: 16, color: ink })
  page.drawText(markScheme ? 'GENERATED MARK SCHEME' : 'GENERATED MOCK EXAMINATION', { x: MARGIN + 51, y: A4[1] - 76, font: fonts.bold, size: 8, color: blue })
  let y = A4[1] - 164
  y = drawWrapped(page, exam.config?.qualification || 'Personalized school examination', { x: MARGIN, y, width: A4[0] - MARGIN * 2, font: fonts.bold, size: 13, lineHeight: 17 })
  y -= 12
  y = drawWrapped(page, exam.config?.subjectName || exam.title, { x: MARGIN, y, width: A4[0] - MARGIN * 2, font: fonts.bold, size: 22, lineHeight: 27 })
  y -= 10
  y = drawWrapped(page, exam.title, { x: MARGIN, y, width: A4[0] - MARGIN * 2, font: fonts.regular, size: 11, lineHeight: 15, color: muted })
  if (markScheme) {
    page.drawRectangle({ x: MARGIN, y: y - 82, width: A4[0] - MARGIN * 2, height: 58, color: paleBlue, borderColor: blue, borderWidth: 0.7 })
    page.drawText('For checking completed work', { x: MARGIN + 16, y: y - 50, font: fonts.bold, size: 12, color: ink })
    page.drawText('Award marks only for the points described on the following pages.', { x: MARGIN + 16, y: y - 68, font: fonts.regular, size: 9, color: muted })
  } else {
    drawCandidateBox(page, fonts, y - 40)
    y -= 142
    const duration = `${Number(exam.config?.durationMinutes) || 90} minutes`
    const marks = `${Number(exam.config?.totalMarks) || exam.items?.length || 0} marks`
    page.drawText('TIME', { x: MARGIN, y, font: fonts.bold, size: 9, color: ink })
    page.drawText(duration, { x: MARGIN + 70, y, font: fonts.regular, size: 10, color: ink })
    page.drawText('TOTAL', { x: A4[0] / 2 + 15, y, font: fonts.bold, size: 9, color: ink })
    page.drawText(marks, { x: A4[0] / 2 + 82, y, font: fonts.regular, size: 10, color: ink })
    y -= 42
    page.drawLine({ start: { x: MARGIN, y: y + 15 }, end: { x: A4[0] - MARGIN, y: y + 15 }, thickness: 0.7, color: line })
    page.drawText('INSTRUCTIONS', { x: MARGIN, y, font: fonts.bold, size: 10, color: ink })
    y -= 21
    const instructions = exam.config?.instructions?.length ? exam.config.instructions : ['Answer all questions.', 'Write your answers in the spaces provided.', 'Show all working for calculation questions.']
    for (const instruction of instructions) {
      page.drawCircle({ x: MARGIN + 3, y: y + 3, size: 2, color: ink })
      y = drawWrapped(page, instruction, { x: MARGIN + 14, y: y + 7, width: A4[0] - MARGIN * 2 - 14, font: fonts.regular, size: 9, lineHeight: 13 }) - 3
    }
    y -= 12
    page.drawText('INFORMATION', { x: MARGIN, y, font: fonts.bold, size: 10, color: ink })
    y -= 20
    y = drawWrapped(page, `The number of marks for each question or part is shown in brackets. The paper contains ${exam.items?.length || 0} generated questions.`, { x: MARGIN, y, width: A4[0] - MARGIN * 2, font: fonts.regular, size: 9, lineHeight: 13 })
  }
  page.drawText('Independent practice material generated from the student-selected sources. Not affiliated with any examination board.', { x: MARGIN, y: 58, font: fonts.regular, size: 7, color: muted })
}

function drawDiagram(page, item, x, y, width, fonts) {
  const height = 128
  page.drawRectangle({ x, y: y - height, width, height, borderColor: line, borderWidth: 0.8 })
  const type = item.diagram_type
  const labels = item.question_type === 'label_diagram' ? [] : (item.diagram_labels || []).map(safeText)
  let labelTargets = []
  if (type === 'coordinate_grid') {
    for (let index = 1; index < 10; index += 1) page.drawLine({ start: { x: x + index * width / 10, y: y - 8 }, end: { x: x + index * width / 10, y: y - height + 8 }, thickness: 0.25, color: line })
    for (let index = 1; index < 6; index += 1) page.drawLine({ start: { x: x + 8, y: y - index * height / 6 }, end: { x: x + width - 8, y: y - index * height / 6 }, thickness: 0.25, color: line })
    page.drawLine({ start: { x: x + width / 2, y: y - 7 }, end: { x: x + width / 2, y: y - height + 7 }, thickness: 0.8, color: ink })
    page.drawLine({ start: { x: x + 7, y: y - height / 2 }, end: { x: x + width - 7, y: y - height / 2 }, thickness: 0.8, color: ink })
    labelTargets = [{ x: x + width / 2, y: y - 15 }, { x: x + width - 18, y: y - height / 2 }, { x: x + width / 2 + 35, y: y - height / 2 - 35 }]
  } else if (type === 'triangle') {
    const points = [{ x: x + width / 2, y: y - 18 }, { x: x + 55, y: y - height + 36 }, { x: x + width - 55, y: y - height + 36 }]
    page.drawLine({ start: points[0], end: points[1], thickness: 1.2, color: ink }); page.drawLine({ start: points[1], end: points[2], thickness: 1.2, color: ink }); page.drawLine({ start: points[2], end: points[0], thickness: 1.2, color: ink })
    points.forEach((point, index) => page.drawText(item.question_type === 'label_diagram' ? '' : labels[index] || ['A', 'B', 'C'][index], { x: point.x + (index === 0 ? -3 : index === 1 ? -12 : 5), y: point.y + (index === 0 ? 5 : -12), font: fonts.bold, size: 9, color: ink }))
    labelTargets = points
  } else if (type === 'atom') {
    const center = { x: x + width / 2, y: y - height / 2 }
    page.drawCircle({ x: center.x, y: center.y, size: 8, borderColor: ink, borderWidth: 1 })
    page.drawCircle({ x: center.x, y: center.y, size: 29, borderColor: muted, borderWidth: 0.8 })
    page.drawCircle({ x: center.x, y: center.y, size: 49, borderColor: muted, borderWidth: 0.8 })
    ;[[29, 0], [-29, 0], [0, 49], [0, -49]].forEach(([dx, dy]) => page.drawCircle({ x: center.x + dx, y: center.y + dy, size: 3, color: ink }))
    labelTargets = [center, { x: center.x + 49, y: center.y }, { x: center.x, y: center.y + 49 }]
  } else if (type === 'circuit') {
    const left = x + 58, right = x + width - 58, top = y - 30, bottom = y - height + 30
    page.drawLine({ start: { x: left, y: top }, end: { x: right, y: top }, thickness: 1, color: ink }); page.drawLine({ start: { x: right, y: top }, end: { x: right, y: bottom }, thickness: 1, color: ink }); page.drawLine({ start: { x: right, y: bottom }, end: { x: left, y: bottom }, thickness: 1, color: ink }); page.drawLine({ start: { x: left, y: bottom }, end: { x: left, y: top }, thickness: 1, color: ink })
    page.drawLine({ start: { x: x + width / 2 - 5, y: top - 9 }, end: { x: x + width / 2 - 5, y: top + 9 }, thickness: 1, color: ink }); page.drawLine({ start: { x: x + width / 2 + 5, y: top - 14 }, end: { x: x + width / 2 + 5, y: top + 14 }, thickness: 1.5, color: ink })
    labelTargets = [{ x: x + width / 2, y: top }, { x: right, y: y - height / 2 }, { x: left, y: bottom }]
  } else {
    page.drawText('DIAGRAM / WORKING SPACE', { x: x + 12, y: y - 20, font: fonts.bold, size: 8, color: muted })
    labelTargets = [{ x: x + width * .35, y: y - 40 }, { x: x + width * .55, y: y - 68 }, { x: x + width * .4, y: y - 96 }]
  }
  if (item.question_type === 'label_diagram') {
    const count = Math.min(item.options?.length || 3, 3)
    const calloutX = x + width - 88
    labelTargets.slice(0, count).forEach((target, index) => {
      const calloutY = y - 22 - index * 36
      page.drawLine({ start: target, end: { x: calloutX, y: calloutY }, thickness: 0.7, color: blue })
      page.drawRectangle({ x: calloutX, y: calloutY - 9, width: 74, height: 18, borderColor: blue, borderWidth: 0.7, color: rgb(1, 1, 1) })
      page.drawText(String(index + 1), { x: calloutX + 5, y: calloutY - 3, font: fonts.bold, size: 7, color: blue })
    })
  }
  if (item.diagram_caption) drawWrapped(page, item.diagram_caption, { x: x + 10, y: y - height + 9, width: width - 20, font: fonts.regular, size: 7, lineHeight: 9, color: muted })
  return y - height
}

function drawWordBank(page, fonts, options, y) {
  if (!options?.length) return y
  const text = options.map((option, index) => `${String.fromCharCode(65 + index)}. ${safeText(option)}`).join('     ')
  const lines = wrapText(text, fonts.regular, 8.5, A4[0] - MARGIN * 2 - 24)
  const height = Math.max(34, lines.length * 12 + 20)
  page.drawRectangle({ x: MARGIN + 34, y: y - height, width: A4[0] - MARGIN * 2 - 34, height, color: paleBlue, borderColor: line, borderWidth: 0.6 })
  page.drawText('WORD BANK', { x: MARGIN + 46, y: y - 14, font: fonts.bold, size: 7, color: blue })
  lines.forEach((entry, index) => page.drawText(entry, { x: MARGIN + 46, y: y - 29 - index * 12, font: fonts.regular, size: 8.5, color: ink }))
  return y - height - 5
}

function drawMatching(page, fonts, item, y) {
  const left = (item.matching_left || []).slice(0, 8)
  const right = (item.matching_right || []).slice(0, left.length)
  if (!left.length || right.length !== left.length) return y
  const startX = MARGIN + 34
  const width = A4[0] - MARGIN * 2 - 34
  const columnWidth = (width - 78) / 2
  const rowHeight = 42
  page.drawText('DRAW A LINE TO MATCH EACH PAIR', { x: startX, y, font: fonts.bold, size: 7, color: blue })
  y -= 18
  left.forEach((entry, index) => {
    const rowY = y - index * rowHeight
    page.drawRectangle({ x: startX, y: rowY - 30, width: columnWidth, height: 34, borderColor: line, borderWidth: 0.7, color: index % 2 ? rgb(0.985, 0.99, 1) : paleBlue })
    page.drawText(String(index + 1), { x: startX + 8, y: rowY - 10, font: fonts.bold, size: 8, color: blue })
    drawWrapped(page, entry, { x: startX + 24, y: rowY - 6, width: columnWidth - 33, font: fonts.regular, size: 8, lineHeight: 10 })
    page.drawCircle({ x: startX + columnWidth + 7, y: rowY - 13, size: 2.4, color: ink })
    const rightX = startX + columnWidth + 78
    page.drawCircle({ x: rightX - 7, y: rowY - 13, size: 2.4, color: ink })
    page.drawRectangle({ x: rightX, y: rowY - 30, width: columnWidth, height: 34, borderColor: line, borderWidth: 0.7, color: index % 2 ? rgb(0.985, 0.99, 1) : paleBlue })
    page.drawText(String.fromCharCode(65 + index), { x: rightX + 8, y: rowY - 10, font: fonts.bold, size: 8, color: blue })
    drawWrapped(page, right[index], { x: rightX + 24, y: rowY - 6, width: columnWidth - 33, font: fonts.regular, size: 8, lineHeight: 10 })
  })
  return y - left.length * rowHeight - 2
}

function drawCompletionTable(page, fonts, item, y) {
  const headers = (item.table_headers || []).slice(0, 5)
  const rows = (item.table_rows || []).slice(0, 6)
  if (!headers.length || !rows.length) return y
  const x = MARGIN + 34
  const width = A4[0] - MARGIN * 2 - 34
  const columnWidth = width / headers.length
  const headerHeight = 29
  const rowHeight = 39
  headers.forEach((header, column) => {
    page.drawRectangle({ x: x + column * columnWidth, y: y - headerHeight, width: columnWidth, height: headerHeight, color: paleBlue, borderColor: muted, borderWidth: 0.7 })
    drawWrapped(page, header, { x: x + column * columnWidth + 6, y: y - 11, width: columnWidth - 12, font: fonts.bold, size: 7.5, lineHeight: 9, color: ink })
  })
  let rowY = y - headerHeight
  rows.forEach((row, rowIndex) => {
    headers.forEach((_, column) => {
      const value = row[column] ?? ''
      page.drawRectangle({ x: x + column * columnWidth, y: rowY - rowHeight, width: columnWidth, height: rowHeight, color: value ? rgb(1, 1, 1) : rgb(0.985, 0.99, 1), borderColor: line, borderWidth: 0.6 })
      if (value) drawWrapped(page, value, { x: x + column * columnWidth + 6, y: rowY - 13, width: columnWidth - 12, font: fonts.regular, size: 7.5, lineHeight: 9 })
    })
    rowY -= rowHeight
  })
  return rowY - 5
}

function drawClassification(page, fonts, item, y) {
  const entries = (item.options || []).slice(0, 7)
  const categories = (item.matching_right || []).slice(0, 4)
  if (!entries.length || categories.length < 2) return y
  const x = MARGIN + 34
  const width = A4[0] - MARGIN * 2 - 34
  const labelWidth = Math.min(205, width * 0.48)
  const categoryWidth = (width - labelWidth) / categories.length
  const headerHeight = 34
  const rowHeight = 31
  page.drawRectangle({ x, y: y - headerHeight, width: labelWidth, height: headerHeight, color: paleBlue, borderColor: line, borderWidth: 0.6 })
  page.drawText('ITEM', { x: x + 7, y: y - 19, font: fonts.bold, size: 7, color: blue })
  categories.forEach((category, index) => {
    const cellX = x + labelWidth + index * categoryWidth
    page.drawRectangle({ x: cellX, y: y - headerHeight, width: categoryWidth, height: headerHeight, color: paleBlue, borderColor: line, borderWidth: 0.6 })
    drawWrapped(page, category, { x: cellX + 4, y: y - 11, width: categoryWidth - 8, font: fonts.bold, size: 6.5, lineHeight: 8, color: ink })
  })
  let rowY = y - headerHeight
  entries.forEach((entry, rowIndex) => {
    page.drawRectangle({ x, y: rowY - rowHeight, width: labelWidth, height: rowHeight, borderColor: line, borderWidth: 0.6, color: rowIndex % 2 ? rgb(0.985, 0.99, 1) : rgb(1, 1, 1) })
    drawWrapped(page, `${rowIndex + 1}. ${entry}`, { x: x + 7, y: rowY - 11, width: labelWidth - 14, font: fonts.regular, size: 7.5, lineHeight: 9 })
    categories.forEach((_, column) => {
      const cellX = x + labelWidth + column * categoryWidth
      page.drawRectangle({ x: cellX, y: rowY - rowHeight, width: categoryWidth, height: rowHeight, borderColor: line, borderWidth: 0.6 })
      page.drawRectangle({ x: cellX + categoryWidth / 2 - 5, y: rowY - 20, width: 10, height: 10, borderColor: ink, borderWidth: 0.7 })
    })
    rowY -= rowHeight
  })
  return rowY - 5
}

function drawQuestionPaper(pdf, fonts, exam) {
  let page
  let y
  let section = ''
  const newPage = () => { page = pdf.addPage(A4); drawPageHeader(page, fonts, exam); y = A4[1] - 68 }
  const ensure = height => { if (!page || y - height < BOTTOM) newPage() }
  newPage()
  for (const [index, item] of (exam.items || []).entries()) {
    const questionType = item.question_type || (item.options?.length ? 'multiple_choice' : 'written')
    const nextSection = safeText(item.section || 'Questions')
    const requestedLines = Number.isFinite(Number(item.answer_lines)) ? Number(item.answer_lines) : Number(item.marks) * 2
    const estimatedLines = noGenericAnswerLineTypes.has(questionType) ? 0 : Math.max(0, Math.min(requestedLines, 24))
    const formatHeight = questionType === 'multiple_choice' ? Math.min(item.options?.length || 0, 4) * 25
      : questionType === 'matching' ? 25 + Math.min(item.matching_left?.length || 0, 8) * 42
        : questionType === 'table_completion' ? 38 + Math.min(item.table_rows?.length || 0, 6) * 39
          : questionType === 'classification' ? 42 + Math.min(item.options?.length || 0, 7) * 31
            : questionType === 'fill_blank' || questionType === 'label_diagram' ? 55 : 0
    const diagramHeight = item.diagram_type && item.diagram_type !== 'none' ? 150 : 0
    ensure(Math.min(700, 90 + formatHeight + diagramHeight + estimatedLines * 22 + (nextSection !== section ? 42 : 0)))
    if (nextSection !== section) {
      ensure(48)
      page.drawRectangle({ x: MARGIN, y: y - 24, width: A4[0] - MARGIN * 2, height: 28, color: paleBlue })
      page.drawText(nextSection.toUpperCase(), { x: MARGIN + 10, y: y - 15, font: fonts.bold, size: 10, color: ink })
      y -= 42
      section = nextSection
    }
    ensure(95)
    const number = safeText(item.number || String(index + 1))
    page.drawText(number, { x: MARGIN, y, font: fonts.bold, size: 11, color: ink })
    const marks = `[${Number(item.marks) || 1}]`
    page.drawText(marks, { x: A4[0] - MARGIN - fonts.bold.widthOfTextAtSize(marks, 9), y, font: fonts.bold, size: 9, color: ink })
    let contentY = y
    if (item.context) contentY = drawWrapped(page, item.context, { x: MARGIN + 34, y: contentY, width: A4[0] - MARGIN * 2 - 65, font: fonts.oblique, size: 9, lineHeight: 13, color: muted }) - 4
    const prompt = questionType === 'fill_blank' ? safeText(item.prompt).replace(/\[blank\]/gi, '____________') : item.prompt
    contentY = drawWrapped(page, prompt, { x: MARGIN + 34, y: contentY, width: A4[0] - MARGIN * 2 - 65, font: fonts.regular, size: 10, lineHeight: 14 })
    y = contentY - 8
    if (questionType === 'multiple_choice' && item.options?.length) {
      for (const [optionIndex, option] of item.options.entries()) {
        ensure(25)
        page.drawRectangle({ x: MARGIN + 36, y: y - 4, width: 10, height: 10, borderColor: ink, borderWidth: 0.8 })
        y = drawWrapped(page, `${String.fromCharCode(65 + optionIndex)}  ${option}`, { x: MARGIN + 55, y: y + 3, width: A4[0] - MARGIN * 2 - 58, font: fonts.regular, size: 9, lineHeight: 13 }) - 5
      }
    }
    if (questionType === 'matching') {
      ensure(35 + Math.min(item.matching_left?.length || 0, 8) * 42)
      y = drawMatching(page, fonts, item, y)
    }
    if (questionType === 'fill_blank') {
      ensure(55)
      y = drawWordBank(page, fonts, item.options, y)
    }
    if (questionType === 'table_completion') {
      ensure(40 + Math.min(item.table_rows?.length || 0, 6) * 39)
      y = drawCompletionTable(page, fonts, item, y)
    }
    if (questionType === 'classification') {
      ensure(45 + Math.min(item.options?.length || 0, 7) * 31)
      y = drawClassification(page, fonts, item, y)
    }
    if (item.diagram_type && item.diagram_type !== 'none') {
      ensure(150)
      y = drawDiagram(page, item, MARGIN + 34, y, A4[0] - MARGIN * 2 - 34, fonts) - 10
    }
    if (questionType === 'label_diagram') {
      ensure(55)
      y = drawWordBank(page, fonts, item.options, y)
    }
    const lineCount = noGenericAnswerLineTypes.has(questionType) ? 0 : Math.max(0, Math.min(requestedLines, 24))
    if (questionType === 'extended_response' && lineCount) {
      ensure(30)
      page.drawRectangle({ x: MARGIN + 34, y: y - 20, width: A4[0] - MARGIN * 2 - 34, height: 22, color: paleBlue })
      page.drawText('EXTENDED RESPONSE - structure your answer clearly', { x: MARGIN + 44, y: y - 12, font: fonts.bold, size: 7.5, color: blue })
      y -= 31
    }
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      if (y - 24 < BOTTOM) {
        newPage()
        page.drawText(`${number} continued`, { x: MARGIN, y, font: fonts.bold, size: 9, color: muted })
        y -= 28
      }
      page.drawLine({ start: { x: MARGIN + 34, y }, end: { x: A4[0] - MARGIN, y }, thickness: 0.45, color: line })
      y -= 22
    }
    y -= 13
  }
}

function drawMarkScheme(pdf, fonts, exam) {
  let page
  let y
  const newPage = () => { page = pdf.addPage(A4); drawPageHeader(page, fonts, exam); y = A4[1] - 70 }
  const ensure = height => { if (!page || y - height < BOTTOM) newPage() }
  newPage()
  for (const [index, item] of (exam.items || []).entries()) {
    const points = item.mark_scheme?.length ? item.mark_scheme : item.explanation ? [item.explanation] : ['Accept any accurate response supported by the selected material.']
    ensure(45 + points.length * 18)
    const number = safeText(item.number || String(index + 1))
    page.drawText(number, { x: MARGIN, y, font: fonts.bold, size: 11, color: ink })
    const markCount = Number(item.marks) || 1
    const marks = `${markCount} ${markCount === 1 ? 'mark' : 'marks'}`
    page.drawText(marks, { x: A4[0] - MARGIN - fonts.bold.widthOfTextAtSize(marks, 9), y, font: fonts.bold, size: 9, color: ink })
    y -= 20
    for (const point of points) {
      page.drawCircle({ x: MARGIN + 5, y: y - 4, size: 2, color: blue })
      y = drawWrapped(page, point, { x: MARGIN + 16, y, width: A4[0] - MARGIN * 2 - 16, font: fonts.regular, size: 9, lineHeight: 13 }) - 4
    }
    y -= 12
    page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 0.4, color: line })
    y -= 18
  }
}

export async function buildMockExamPdfBytes(exam, { markScheme = false } = {}) {
  const pdf = await PDFDocument.create()
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    oblique: await pdf.embedFont(StandardFonts.HelveticaOblique),
  }
  pdf.setTitle(`${exam.title}${markScheme ? ' - Mark Scheme' : ''}`)
  pdf.setAuthor('Studentley')
  pdf.setSubject('Personalized generated practice examination')
  pdf.setCreator('Studentley')
  drawCover(pdf, fonts, exam, markScheme)
  if (markScheme) drawMarkScheme(pdf, fonts, exam)
  else drawQuestionPaper(pdf, fonts, exam)
  const pages = pdf.getPages()
  pages.forEach((page, index) => drawFooter(page, fonts, index + 1, pages.length, markScheme))
  return pdf.save()
}

function filename(value) {
  return safeText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'studentley-mock-exam'
}

export async function downloadMockExamPdf(exam, { markScheme = false } = {}) {
  const bytes = await buildMockExamPdfBytes(exam, { markScheme })
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename(exam.title)}${markScheme ? '-mark-scheme' : ''}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
