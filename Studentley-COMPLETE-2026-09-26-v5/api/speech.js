import { requireUser } from './_auth.js'

export const config = { maxDuration: 30 }

const cleanForSpeech = value => String(value || '')
  .replace(/https?:\/\/\S+/g, 'link')
  .replace(/[`*_#>|]/g, '')
  .replace(/\s+/g, ' ')
  .trim()

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  try {
    await requireUser(request)
    const input = cleanForSpeech(request.body?.text).slice(0, 3000)
    if (!input) return response.status(400).json({ error: 'Enter text to read aloud.' })
    const key = process.env.OPENAI_API_KEY || process.env.iStudent_Key_OpenAi || process.env.ISTUDENT_KEY_OPENAI
    if (!key) return response.status(503).json({ error: 'The natural voice is not configured.' })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 50000)
    let speechResponse
    try {
      speechResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
          voice: process.env.OPENAI_QUIZ_TTS_VOICE || 'onyx',
          input,
          instructions: 'Perform as an electrifying male prime-time quiz-show host for teenagers. Sound genuinely thrilled, playful and spontaneous. Keep every line tight and fast-moving: use punchy emphasis and only very brief dramatic pauses so the voice never falls behind the live game. Explode with joy for correct answers, react sharply to buzzes, build quick suspense for Double or Nothing and Poker, and make lead changes feel huge. Vary pitch, rhythm and intensity from line to line. Give player names warmth and personality. Join the final two names naturally with “and”; never read names like a comma-separated list. Light teasing must stay kind and never personal. Use crisp diction and smiling sports-commentator energy. Never sound robotic, flat, sleepy or slow.',
          speed: 1.16,
          response_format: 'mp3',
        }),
      })
    } finally { clearTimeout(timeout) }

    if (!speechResponse.ok) {
      let message = 'Natural voice generation failed.'
      try { message = (await speechResponse.json()).error?.message || message } catch { /* OpenAI may return a non-JSON error. */ }
      throw Object.assign(new Error(message), { status: speechResponse.status >= 500 ? 502 : speechResponse.status })
    }
    const audio = Buffer.from(await speechResponse.arrayBuffer())
    response.setHeader('Content-Type', 'audio/mpeg')
    response.setHeader('Content-Length', audio.length)
    response.setHeader('Cache-Control', 'private, no-store')
    return response.status(200).send(audio)
  } catch (error) {
    console.error('Speech generation failed:', error)
    const message = error.name === 'AbortError' ? 'Natural voice generation timed out.' : error.message || 'Natural voice generation failed.'
    return response.status(error.status || (error.name === 'AbortError' ? 504 : 500)).json({ error: message })
  }
}
