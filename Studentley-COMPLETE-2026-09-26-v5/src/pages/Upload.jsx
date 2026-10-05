import React, { Fragment, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Download, File, FileText, FolderOpen, Image, MoreVertical, Search, Sparkles, Trash2, UploadCloud, WandSparkles } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { deleteDocument, loadDocumentAiResults, openDocument, uploadDocument } from '../lib/data'
import { analyzeDocument, analyzeTimetable, extractExamSchedule, generateSummary } from '../services/ai'
import { Button, EmptyState, Field, Modal, PageHeading, formatDate } from '../components/UI'

const size = bytes => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

export default function Upload() {
  const location = useLocation(), navigate = useNavigate()
  const { user, data, refresh, notify, update } = useApp()
  const [dragging, setDragging] = useState(false), [progress, setProgress] = useState(null), [subjectId, setSubjectId] = useState(''), [topicId, setTopicId] = useState(location.state?.topicId || ''), [category, setCategory] = useState('study_material'), [query, setQuery] = useState(''), [ai, setAi] = useState(location.state?.analyzeDocumentId || null), [editing, setEditing] = useState(null)
  const [aiResults, setAiResults] = useState([]), [expandedResult, setExpandedResult] = useState('')
  const input = useRef()
  const subjects = data?.subjects?.filter(item => !item.archived_at) || [], topics = data?.topics || [], documents = data?.documents || []
  const visible = documents.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
  const loadResults = async () => { try { setAiResults(await loadDocumentAiResults()) } catch (error) { notify(error.message || 'Saved document results could not be loaded.', 'error') } }
  useEffect(() => { loadResults() }, [])
  useEffect(() => {
    const target = location.state?.openDocumentResult
    if (!target || !aiResults.length) return
    const saved = aiResults.find(item => item.document_id === target.documentId && item.operation === target.operation)
    if (!saved) return
    setExpandedResult(saved.id)
    navigate('/upload', { replace: true })
    requestAnimationFrame(() => document.getElementById(`document-result-${saved.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [aiResults, location.state, navigate])
  const selectFiles = async files => {
    const list = [...files]; if (!list.length) return
    for (const file of list) {
      setProgress({ name: file.name, value: 0 })
      try { await uploadDocument({ userId: user.id, file, subjectId: subjectId || null, topicId: topicId || null, category, onProgress: value => setProgress({ name: file.name, value }) }); notify(`${file.name} uploaded.`) }
      catch (error) { notify(error.message || 'Upload failed. Please try again.', 'error') }
    }
    setProgress(null); await refresh(); if (input.current) input.current.value = ''
  }
  const remove = async document => { if (!window.confirm(`Delete “${document.name}”? This cannot be undone.`)) return; try { await deleteDocument(document); await refresh(); notify('Document deleted.') } catch (error) { notify(error.message, 'error') } }
  const saveEdit = async event => { event.preventDefault(); const changes = { name: editing.name, subject_id: editing.subject_id || null }; if (Object.prototype.hasOwnProperty.call(editing, 'topic_id')) changes.topic_id = editing.topic_id || null; await update('documents', editing.id, changes); setEditing(null); notify('Document updated.') }
  return <>
    <PageHeading eyebrow="Your material" title="Upload a document" text="Store school material securely and keep every file connected to the right subject." />
    <div className="upload-grid"><section><div className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); selectFiles(event.dataTransfer.files) }}><span className="upload-icon"><UploadCloud /></span><h2>Drop your school material here</h2><p>PDF, PowerPoint, Word, TXT, JPG or PNG · maximum 25 MB</p><Button onClick={() => input.current?.click()}>Choose files</Button><input ref={input} hidden type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png" onChange={event => selectFiles(event.target.files)} /></div>{progress && <div className="upload-progress"><div><File /><span><b>Uploading…</b><small>{progress.name}</small></span><strong>{progress.value}%</strong></div><div className="progress-bar"><span style={{ width: `${progress.value}%` }} /></div></div>}</section>
      <aside className="card upload-settings"><h3>File details</h3><Field label="Subject"><select value={subjectId} onChange={event => setSubjectId(event.target.value)}><option value="">No subject</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></Field><Field label="Topic"><select value={topicId} onChange={event => { const value = event.target.value; const topic = topics.find(item => item.id === value); setTopicId(value); if (topic?.subject_id) setSubjectId(topic.subject_id) }}><option value="">No topic</option>{topics.map(topic => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></Field><Field label="Document type"><select value={category} onChange={event => setCategory(event.target.value)}><option value="study_material">Study material</option><option value="timetable">Timetable</option><option value="exam_schedule">Exam schedule</option><option value="notes">Notes</option></select></Field><div className="secure-note"><FolderOpen /><p><b>Private storage</b><br />Only your signed-in account can access these files.</p></div></aside>
    </div>
    <section className="card library"><div className="library-header"><div><span className="icon-bubble blue"><FileText /></span><div><h2>Document library</h2><p>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</p></div></div><label className="search"><Search /><input aria-label="Search documents" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search files" /></label></div>
      {visible.length ? <div className="document-table"><div className="table-head"><span>Name</span><span>Subject</span><span>Uploaded</span><span>Status</span><span /></div>{visible.map(document => {
        const saved = aiResults.filter(item => item.document_id === document.id)
        const topic = topics.find(item => item.id === document.topic_id)
        return <Fragment key={document.id}><div className="document-row"><span className="document-name"><span className="file-icon">{document.mime_type?.startsWith('image') ? <Image /> : <FileText />}</span><span><b>{document.name}</b><small>{size(document.size_bytes)} · {document.mime_type?.split('/').pop()?.toUpperCase()}{topic ? ` · ${topic.title}` : ''}</small></span></span><span>{document.subjects?.name || 'Unassigned'}</span><span>{formatDate(document.created_at)}</span><span className={`status-pill ${document.status}`}><i />{document.status === 'uploaded' ? 'Ready to analyze' : document.status === 'ready' ? 'AI analyzed' : document.status}</span><span className="row-actions"><button aria-label="Open document" onClick={() => openDocument(document)}><Download /></button><button aria-label="Analyze document" onClick={() => setAi(document.id)}><WandSparkles /></button><button aria-label="Edit document" onClick={() => setEditing({ ...document })}><MoreVertical /></button><button className="danger" aria-label="Delete document" onClick={() => remove(document)}><Trash2 /></button></span></div>{saved.map(savedResult => <SavedDocumentResult key={savedResult.id} saved={savedResult} expanded={expandedResult === savedResult.id} onToggle={() => setExpandedResult(value => value === savedResult.id ? '' : savedResult.id)} />)}</Fragment>
      })}</div> : <EmptyState icon={FileText} title={query ? 'No matching documents' : 'No study material yet'} text={query ? 'Try another search term.' : 'Upload your first document to get started.'} />}
    </section>
    <section className="ai-strip"><span className="icon-bubble violet"><WandSparkles /></span><div><h3>Analyze your study material</h3><p>Create summaries and key points, or import a timetable or exam schedule from the document.</p></div><Button variant="secondary" disabled={!documents.length} onClick={() => setAi(documents[0]?.id)}>Analyze a document</Button></section>
    {ai && <DocumentAnalysisModal documents={documents} initialDocumentId={ai} onClose={() => setAi(null)} onComplete={async message => { await Promise.all([refresh(), loadResults()]); notify(message) }} />}{editing && <Modal title="Edit document" onClose={() => setEditing(null)}><form onSubmit={saveEdit}><Field label="File name"><input value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></Field><Field label="Subject"><select value={editing.subject_id || ''} onChange={event => setEditing({ ...editing, subject_id: event.target.value })}><option value="">No subject</option>{subjects.map(subject => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></Field><Field label="Topic"><select value={editing.topic_id || ''} onChange={event => setEditing({ ...editing, topic_id: event.target.value })}><option value="">No topic</option>{topics.map(topic => <option value={topic.id} key={topic.id}>{topic.title}</option>)}</select></Field><Button className="full">Save changes</Button></form></Modal>}
  </>
}

function SavedDocumentResult({ saved, expanded, onToggle }) {
  const result = saved.result || {}
  const toggleFromKeyboard = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onToggle() } }
  return <div id={`document-result-${saved.id}`} className={`document-insight ${expanded ? 'expanded' : ''}`} role="button" tabIndex={0} aria-expanded={expanded} onClick={onToggle} onKeyDown={toggleFromKeyboard}><span className="document-insight-icon"><Sparkles /></span><div><div className="document-insight-heading"><span><b>{saved.operation === 'summary' ? 'Saved summary' : 'Saved analysis'} · {result.title || 'AI result'}</b><small>{formatDate(saved.updated_at, { hour: 'numeric', minute: '2-digit' })}</small></span><span className="document-insight-toggle">{expanded ? 'Hide details' : 'View details'}{expanded ? <ChevronUp /> : <ChevronDown />}</span></div><p>{result.summary}</p>{expanded && <div className="document-insight-details">{result.key_points?.length > 0 && <section><h4>Key points</h4><ul>{result.key_points.map(point => <li key={point}>{point}</li>)}</ul></section>}{result.topics?.length > 0 && <p className="ai-tags">{result.topics.map(topic => <span key={topic}>{topic}</span>)}</p>}{result.review_questions?.length > 0 && <section><h4>Review questions</h4><ol>{result.review_questions.map(question => <li key={question}>{question}</li>)}</ol></section>}</div>}</div></div>
}

function DocumentAnalysisModal({ documents, initialDocumentId, onClose, onComplete }) {
  const [documentId, setDocumentId] = useState(initialDocumentId || documents[0]?.id || '')
  const selected = documents.find(document => document.id === documentId)
  const suggestedMode = selected?.category === 'timetable' ? 'timetable' : selected?.category === 'exam_schedule' ? 'exams' : 'analysis'
  const [mode, setMode] = useState(suggestedMode)
  const [customInstructions, setCustomInstructions] = useState('')
  const [loading, setLoading] = useState(false), [result, setResult] = useState(null), [error, setError] = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const prompt = customInstructions.trim()
      const value = mode === 'summary' ? await generateSummary({ documentId, customInstructions: prompt }) : mode === 'timetable' ? await analyzeTimetable({ documentId, customInstructions: prompt }) : mode === 'exams' ? await extractExamSchedule({ documentId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, customInstructions: prompt }) : await analyzeDocument({ documentId, customInstructions: prompt })
      setResult(value)
      await onComplete(mode === 'timetable' ? `${value.imported} timetable entries imported.` : mode === 'exams' ? `${value.imported} exams imported.` : 'Document analysis complete.')
    } catch (problem) { setError(problem.message || 'The document could not be analyzed.') }
    finally { setLoading(false) }
  }

  return <Modal title="Analyze a document" description="Studentley sends only the selected file to the secure AI endpoint." onClose={onClose} wide>
    <div className="form-grid"><Field label="Document"><select value={documentId} onChange={event => { const id = event.target.value; const document = documents.find(item => item.id === id); setDocumentId(id); setMode(document?.category === 'timetable' ? 'timetable' : document?.category === 'exam_schedule' ? 'exams' : 'analysis'); setResult(null) }}>{documents.map(document => <option value={document.id} key={document.id}>{document.name}</option>)}</select></Field><Field label="Action"><select value={mode} onChange={event => { setMode(event.target.value); setResult(null) }}><option value="analysis">Full study analysis</option><option value="summary">Summary and review questions</option><option value="timetable">Import timetable entries</option><option value="exams">Import exam schedule</option></select></Field></div>
    <Field label="Your prompt" hint="Optional — tell the AI what to focus on or how to format the result."><textarea value={customInstructions} onChange={event => setCustomInstructions(event.target.value)} placeholder="e.g. Focus on the key definitions and include short exam-style review questions." /></Field>
    {error && <p className="ai-error">{error}</p>}
    {result && <div className="ai-result"><h3>{result.title || (mode === 'timetable' ? 'Timetable imported' : mode === 'exams' ? 'Exam schedule imported' : 'AI result')}</h3>{result.summary && <p>{result.summary}</p>}{result.key_points?.length > 0 && <><h4>Key points</h4><ul>{result.key_points.map(point => <li key={point}>{point}</li>)}</ul></>}{result.topics?.length > 0 && <p className="ai-tags">{result.topics.map(topic => <span key={topic}>{topic}</span>)}</p>}{result.review_questions?.length > 0 && <><h4>Review questions</h4><ol>{result.review_questions.map(question => <li key={question}>{question}</li>)}</ol></>}{Number.isInteger(result.imported) && <p><b>{result.imported}</b> new items were added to your workspace.</p>}</div>}
    <Button className="full" loading={loading} disabled={!documentId} onClick={run}>{result ? 'Run again' : 'Start AI analysis'}</Button>
  </Modal>
}
