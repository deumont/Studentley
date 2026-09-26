import React, { useRef, useState } from 'react'
import { Download, File, FileText, FolderOpen, Image, MoreVertical, Search, Trash2, UploadCloud, WandSparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { deleteDocument, openDocument, uploadDocument } from '../lib/data'
import { AiUnavailable, Button, EmptyState, Field, Modal, PageHeading, formatDate } from '../components/UI'

const size = bytes => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

export default function Upload() {
  const { user, data, refresh, notify, update } = useApp()
  const [dragging, setDragging] = useState(false), [progress, setProgress] = useState(null), [subjectId, setSubjectId] = useState(''), [category, setCategory] = useState('study_material'), [query, setQuery] = useState(''), [ai, setAi] = useState(false), [editing, setEditing] = useState(null)
  const input = useRef()
  const subjects = data?.subjects?.filter(item => !item.archived_at) || [], documents = data?.documents || []
  const visible = documents.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
  const selectFiles = async files => {
    const list = [...files]; if (!list.length) return
    for (const file of list) {
      setProgress({ name: file.name, value: 0 })
      try { await uploadDocument({ userId: user.id, file, subjectId: subjectId || null, category, onProgress: value => setProgress({ name: file.name, value }) }); notify(`${file.name} uploaded.`) }
      catch (error) { notify(error.message || 'Upload failed. Please try again.', 'error') }
    }
    setProgress(null); await refresh(); if (input.current) input.current.value = ''
  }
  const remove = async document => { if (!window.confirm(`Delete “${document.name}”? This cannot be undone.`)) return; try { await deleteDocument(document); await refresh(); notify('Document deleted.') } catch (error) { notify(error.message, 'error') } }
  const saveEdit = async event => { event.preventDefault(); await update('documents', editing.id, { name: editing.name, subject_id: editing.subject_id || null }); setEditing(null); notify('Document updated.') }
  return <>
    <PageHeading eyebrow="Your material" title="Upload a document" text="Store school material securely and keep every file connected to the right subject." />
    <div className="upload-grid"><section><div className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); selectFiles(event.dataTransfer.files) }}><span className="upload-icon"><UploadCloud /></span><h2>Drop your school material here</h2><p>PDF, PowerPoint, Word, TXT, JPG or PNG · maximum 25 MB</p><Button onClick={() => input.current?.click()}>Choose files</Button><input ref={input} hidden type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png" onChange={event => selectFiles(event.target.files)} /></div>{progress && <div className="upload-progress"><div><File /><span><b>Uploading…</b><small>{progress.name}</small></span><strong>{progress.value}%</strong></div><div className="progress-bar"><span style={{ width: `${progress.value}%` }} /></div></div>}</section>
      <aside className="card upload-settings"><h3>File details</h3><Field label="Subject"><select value={subjectId} onChange={event => setSubjectId(event.target.value)}><option value="">No subject</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></Field><Field label="Document type"><select value={category} onChange={event => setCategory(event.target.value)}><option value="study_material">Study material</option><option value="timetable">Timetable</option><option value="exam_schedule">Exam schedule</option><option value="notes">Notes</option></select></Field><div className="secure-note"><FolderOpen /><p><b>Private storage</b><br />Only your signed-in account can access these files.</p></div></aside>
    </div>
    <section className="card library"><div className="library-header"><div><span className="icon-bubble blue"><FileText /></span><div><h2>Document library</h2><p>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</p></div></div><label className="search"><Search /><input aria-label="Search documents" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search files" /></label></div>
      {visible.length ? <div className="document-table"><div className="table-head"><span>Name</span><span>Subject</span><span>Uploaded</span><span>Status</span><span /></div>{visible.map(document => <div className="document-row" key={document.id}><span className="document-name"><span className="file-icon">{document.mime_type?.startsWith('image') ? <Image /> : <FileText />}</span><span><b>{document.name}</b><small>{size(document.size_bytes)} · {document.mime_type?.split('/').pop()?.toUpperCase()}</small></span></span><span>{document.subjects?.name || 'Unassigned'}</span><span>{formatDate(document.created_at)}</span><span className="status-pill"><i />{document.status === 'uploaded' ? 'Waiting for AI analysis' : document.status}</span><span className="row-actions"><button aria-label="Open document" onClick={() => openDocument(document)}><Download /></button><button aria-label="Edit document" onClick={() => setEditing({ ...document })}><MoreVertical /></button><button className="danger" aria-label="Delete document" onClick={() => remove(document)}><Trash2 /></button></span></div>)}</div> : <EmptyState icon={FileText} title={query ? 'No matching documents' : 'No study material yet'} text={query ? 'Try another search term.' : 'Upload your first document to get started.'} />}
    </section>
    <section className="ai-strip"><span className="icon-bubble violet"><WandSparkles /></span><div><h3>Analyze your study material</h3><p>Summaries, quizzes and flashcards will use only the documents you choose.</p></div><Button variant="secondary" disabled={!documents.length} onClick={() => setAi(true)}>Analyze a document</Button></section>
    {ai && <AiUnavailable onClose={() => setAi(false)} />}{editing && <Modal title="Edit document" onClose={() => setEditing(null)}><form onSubmit={saveEdit}><Field label="File name"><input value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></Field><Field label="Subject"><select value={editing.subject_id || ''} onChange={event => setEditing({ ...editing, subject_id: event.target.value })}><option value="">No subject</option>{subjects.map(subject => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></Field><Button className="full">Save changes</Button></form></Modal>}
  </>
}
