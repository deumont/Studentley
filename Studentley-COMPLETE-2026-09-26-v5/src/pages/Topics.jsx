import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CircleHelp, FileQuestion, FileText, Flag, FolderOpen, Image, Lightbulb, MoreVertical, PartyPopper, Pencil, Plus, Sparkles, Trash2, UploadCloud } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { openDocument, uploadDocument } from '../lib/data'
import { generateExplanation } from '../services/ai'
import { Button, EmptyState, Field, Modal } from '../components/UI'

const practiceTabs = { quiz: 'quizzes', flashcards: 'flashcards', visual: 'visuals', mock: 'mock' }
const kindLabels = { quiz: 'Quiz', flashcards: 'Flashcards', visual_explanation: 'Visual guide', mock_exam: 'Mock exam', topic_summary: 'Focused summary' }

export default function TopicsWorkspace({ initialSelectedId = '' }) {
  const { user, data, create, update, remove, refresh, notify } = useApp()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const topics = data?.topics || []
  const subjects = data?.subjects?.filter(item => !item.archived_at) || []
  const documents = data?.documents || []
  const practiceSets = data?.practice_sets || []
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  const [modal, setModal] = useState(null)
  const [uploading, setUploading] = useState(false)
  const selected = topics.find(topic => topic.id === selectedId)
  useEffect(() => { if (initialSelectedId) setSelectedId(initialSelectedId) }, [initialSelectedId])

  const documentsFor = topicId => documents.filter(document => document.topic_id === topicId)
  const setsFor = topicId => practiceSets.filter(set => set.topic_id === topicId || set.config?.topicId === topicId)
  const saveTopic = async draft => {
    const payload = { title: draft.title.trim(), description: draft.description.trim() || null, subject_id: draft.subject_id || null }
    if (draft.id) await update('topics', draft.id, payload)
    else {
      const created = await create('topics', { user_id: user.id, ...payload })
      setSelectedId(created.id)
    }
    setModal(null)
    notify(draft.id ? 'Topic updated.' : 'Topic created.')
  }
  const deleteTopic = async topic => {
    if (!window.confirm(`Delete “${topic.title}”? Uploaded files and generated material stay saved, but will no longer belong to this topic.`)) return
    await remove('topics', topic.id)
    setSelectedId('')
    notify('Topic deleted.')
  }
  const upload = async event => {
    const files = [...(event.target.files || [])]
    if (!selected || !files.length) return
    setUploading(true)
    try {
      for (const file of files) await uploadDocument({ userId: user.id, file, subjectId: selected.subject_id || null, topicId: selected.id, category: 'study_material' })
      await refresh()
      notify(`${files.length} ${files.length === 1 ? 'file' : 'files'} added to ${selected.title}.`)
    } catch (error) { notify(error.message || 'Upload failed.', 'error') }
    finally { setUploading(false); event.target.value = '' }
  }
  const openGenerator = type => {
    const topicDocuments = documentsFor(selected.id)
    navigate('/practice', { state: {
      openPracticeTab: practiceTabs[type],
      openPracticeGenerator: type,
      generatorDefaults: {
        topic: selected.title,
        topicId: selected.id,
        subject: selected.subject_id || '',
        document: topicDocuments[0]?.id || '',
        documents: topicDocuments.map(document => document.id),
      },
    } })
  }
  const openQuizShow = () => {
    const topicDocuments = documentsFor(selected.id)
    navigate('/rivals/party', { state: { topicDefaults: { topicId: selected.id, topic: selected.title, subject: selected.subjects?.name || '', documentId: topicDocuments[0]?.id || '' } } })
  }

  if (selected) {
    const topicDocuments = documentsFor(selected.id)
    const topicSets = setsFor(selected.id)
    return <section className="topics-detail">
      <button className="topics-back" onClick={() => setSelectedId('')}><ArrowLeft /> All topics</button>
      <header className="card topics-detail-hero">
        <span className="topics-hero-icon"><FolderOpen /></span>
        <div><small>{selected.subjects?.name || 'Independent topic'}</small><h2>{selected.title}</h2><p>{selected.description || 'Keep every file and generated study tool for this topic together.'}</p></div>
        <div className="topics-hero-actions"><Button variant="ghost" onClick={() => setModal(selected)}><Pencil /> Edit</Button><button className="delete-button" aria-label="Delete topic" onClick={() => deleteTopic(selected)}><Trash2 /></button></div>
      </header>

      <section className="topics-actions">
        <header><span>CREATE FROM THIS TOPIC</span><h3>What do you want to make?</h3><p>Every generator opens with this topic, subject and attached material already selected. You can add your own prompt before generating.</p></header>
        <div className="topics-action-grid">
          <button onClick={() => inputRef.current?.click()}><span className="blue"><UploadCloud /></span><b>{uploading ? 'Uploading…' : 'Upload material'}</b><small>Add PDFs, notes, slides or images</small><ArrowRight /></button>
          <button onClick={() => setModal({ type: 'summary' })}><span className="orange"><CircleHelp /></span><b>Explain something</b><small>Summarize what you don’t understand</small><ArrowRight /></button>
          <button onClick={() => openGenerator('quiz')}><span className="green"><FileQuestion /></span><b>Generate quiz</b><small>Multiple-choice practice</small><ArrowRight /></button>
          <button onClick={() => openGenerator('flashcards')}><span className="violet"><BookOpen /></span><b>Generate flashcards</b><small>Definitions or translations</small><ArrowRight /></button>
          <button onClick={() => openGenerator('visual')}><span className="orange"><Lightbulb /></span><b>Visual guide</b><small>Illustrated explanation PDF</small><ArrowRight /></button>
          <button onClick={() => openGenerator('mock')}><span className="blue"><Flag /></span><b>Mock exam</b><small>Full paper and mark scheme</small><ArrowRight /></button>
          <button onClick={openQuizShow}><span className="green"><PartyPopper /></span><b>Quizz Show</b><small>AI-hosted game with friends</small><ArrowRight /></button>
        </div>
        <input ref={inputRef} hidden multiple type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png" onChange={upload} />
      </section>

      <div className="topics-content-grid">
        <section className="card topics-content-card"><header><div><FileText /><span><b>Topic material</b><small>{topicDocuments.length} attached</small></span></div><Button variant="ghost" onClick={() => inputRef.current?.click()}><Plus /> Add</Button></header>{topicDocuments.length ? <div className="topics-resource-list">{topicDocuments.map(document => <button onClick={() => openDocument(document)} key={document.id}><span>{document.mime_type?.startsWith('image/') ? <Image /> : <FileText />}</span><span><b>{document.name}</b><small>{document.status === 'ready' ? 'AI analyzed' : 'Ready to use'}</small></span><ArrowRight /></button>)}</div> : <EmptyState compact icon={UploadCloud} title="No files yet" text="Upload material now, or generate directly from the topic name." />}</section>
        <section className="card topics-content-card"><header><div><Sparkles /><span><b>Generated material</b><small>{topicSets.length} saved</small></span></div></header>{topicSets.length ? <div className="topics-resource-list">{topicSets.map(set => <button onClick={() => set.kind === 'topic_summary' ? setModal({ type: 'summary-view', set }) : navigate('/practice', { state: { openPracticeSet: set } })} key={set.id}><span>{set.kind === 'topic_summary' ? <CircleHelp /> : <Sparkles />}</span><span><b>{set.title}</b><small>{kindLabels[set.kind] || set.kind}{set.kind !== 'topic_summary' ? ` · ${set.items?.length || 0} items` : ''}</small></span><ArrowRight /></button>)}</div> : <EmptyState compact icon={Sparkles} title="Nothing generated yet" text="Choose a tool above to create your first resource." />}</section>
      </div>
      {modal?.type === 'summary' && <TopicSummaryModal topic={selected} documents={topicDocuments} onClose={() => setModal(null)} onGenerated={async result => { await refresh(); setModal({ type: 'summary-view', set: result.practiceSet }); notify('Summary saved to this topic.') }} />}
      {modal?.type === 'summary-view' && <TopicSummaryView topic={selected} set={modal.set} onClose={() => setModal(null)} />}
      {modal && !['summary', 'summary-view'].includes(modal.type) && <TopicModal initial={modal.id ? modal : null} subjects={subjects} onClose={() => setModal(null)} onSave={saveTopic} />}
    </section>
  }

  return <section className="card topics-workspace">
    <div className="section-heading"><div><h2>Topics</h2><p>Create a topic, open it, then keep its uploads and generated study tools in one place.</p></div><Button onClick={() => setModal({ type: 'new' })}><Plus /> New topic</Button></div>
    {topics.length ? <div className="topics-grid">{topics.map(topic => {
      const fileCount = documentsFor(topic.id).length
      const setCount = setsFor(topic.id).length
      return <button className="topic-card" onClick={() => setSelectedId(topic.id)} key={topic.id}><span className="topic-card-icon"><FolderOpen /></span><span className="topic-card-menu" onClick={event => { event.stopPropagation(); setModal(topic) }}><MoreVertical /></span><small>{topic.subjects?.name || 'No subject'}</small><h3>{topic.title}</h3><p>{topic.description || 'Open this topic to upload and generate study material.'}</p><footer><span><FileText /> {fileCount}</span><span><Sparkles /> {setCount}</span><ArrowRight /></footer></button>
    })}</div> : <EmptyState icon={FolderOpen} title="Create your first topic" text="Topics replace the old task list and become the home for everything you study."><Button onClick={() => setModal({ type: 'new' })}>Create a topic</Button></EmptyState>}
    {modal && <TopicModal initial={modal.id ? modal : null} subjects={subjects} onClose={() => setModal(null)} onSave={saveTopic} />}
  </section>
}

function TopicModal({ initial, subjects, onClose, onSave }) {
  const [draft, setDraft] = useState(initial ? { ...initial, description: initial.description || '' } : { title: '', description: '', subject_id: '' })
  const [saving, setSaving] = useState(false)
  const submit = async event => { event.preventDefault(); setSaving(true); try { await onSave(draft) } finally { setSaving(false) } }
  return <Modal title={initial ? 'Edit topic' : 'Create a topic'} description="A topic groups your uploads, quizzes, flashcards, visual guides, mock exams and Quizz Shows." onClose={onClose}><form className="modal-form" onSubmit={submit}><Field label="Topic name"><input autoFocus required maxLength="180" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Cell division" /></Field><Field label="Subject"><select value={draft.subject_id || ''} onChange={event => setDraft({ ...draft, subject_id: event.target.value })}><option value="">No subject</option>{subjects.map(subject => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></Field><Field label="Description or goal" hint="Optional"><textarea maxLength="1000" value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="What do you need to understand or prepare for?" /></Field><Button className="full" loading={saving}>{initial ? 'Save topic' : 'Create topic'}</Button></form></Modal>
}

function TopicSummaryModal({ topic, documents, onClose, onGenerated }) {
  const [draft, setDraft] = useState({ question: '', documentId: '', customInstructions: '' })
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const submit = async event => {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const result = await generateExplanation({ topicId: topic.id, subjectId: topic.subject_id || null, topic: topic.title, question: draft.question.trim(), documentId: draft.documentId || null, customInstructions: draft.customInstructions.trim(), saveToTopic: true })
      await onGenerated(result)
    } catch (problem) { setError(problem.message || 'The summary could not be generated.') }
    finally { setLoading(false) }
  }
  return <Modal title="Explain something" description={`Ask about a specific part of ${topic.title} that does not make sense yet.`} onClose={onClose} wide><form onSubmit={submit}><Field label="What don’t you understand?" hint="Be as specific as you can — a concept, step, formula or question."><textarea autoFocus required minLength={3} maxLength={1200} value={draft.question} onChange={event => setDraft({ ...draft, question: event.target.value })} placeholder="e.g. I don’t understand why completing the square changes the equation into vertex form." /></Field><Field label="Use material from this topic" hint="Optional — choose a file when the explanation should follow your class material."><select value={draft.documentId} onChange={event => setDraft({ ...draft, documentId: event.target.value })}><option value="">No file — explain from the topic</option>{documents.map(document => <option value={document.id} key={document.id}>{document.name}</option>)}</select></Field><Field label="Your prompt" hint="Optional — choose the style or depth of the explanation."><textarea maxLength={1600} value={draft.customInstructions} onChange={event => setDraft({ ...draft, customInstructions: event.target.value })} placeholder="e.g. Use very simple language, a real-life analogy and one short worked example." /></Field>{error && <p className="ai-error">{error}</p>}<Button className="full" loading={loading}><Sparkles /> Generate and save summary</Button></form></Modal>
}

function TopicSummaryView({ topic, set, onClose }) {
  const summary = set?.items?.[0] || {}
  return <Modal title={set?.title || 'Topic summary'} description={`Saved in ${topic.title}`} onClose={onClose} wide><article className="topic-summary-result"><small>WHAT YOU ASKED</small><h3>{set?.config?.question || topic.title}</h3><div>{summary.answer || 'This summary is unavailable.'}</div>{summary.sources?.length > 0 && <p><FileText /> Based on: {summary.sources.join(' · ')}</p>}</article><Button className="full" onClick={onClose}>Done</Button></Modal>
}
