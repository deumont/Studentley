import React, { useEffect } from 'react'
import { ArrowLeft, Mail, MapPin, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'

const updated = '26 September 2026'
const email = 'support@studentley.com'

function ContactCard() {
  return <div className="legal-contact"><div><MapPin /><span><b>Studentley · Paul Kuchler</b><small>Heinrich-Kürfgen-Strasse 4<br />Germany</small></span></div><div><Mail /><span><b>Legal and privacy contact</b><a href={`mailto:${email}`}>{email}</a></span></div></div>
}

function LegalShell({ active, title, intro, children }) {
  useEffect(() => { document.title = `${title} — Studentley` }, [title])
  return <main className="legal-page"><article className="card legal-card"><Link to="/" className="back-link"><ArrowLeft /> Back to Studentley</Link><span className="icon-bubble blue"><ShieldCheck /></span><h1>{title}</h1><p className="legal-updated">Last updated {updated}</p><p className="legal-lead">{intro}</p><nav className="legal-nav" aria-label="Legal documents"><Link className={active === 'privacy' ? 'active' : ''} to="/legal/privacy">Privacy Policy</Link><Link className={active === 'terms' ? 'active' : ''} to="/legal/terms">Terms & Conditions</Link><Link className={active === 'imprint' ? 'active' : ''} to="/legal/imprint">Legal Notice</Link></nav>{children}</article></main>
}

function PrivacyPolicy() {
  return <LegalShell active="privacy" title="Privacy Policy" intro="This policy explains how Studentley handles personal data when you visit the website, create an account, study with the application, use AI features, or purchase a subscription.">
    <h2>1. Controller and contact</h2><p>The controller responsible for processing personal data under the General Data Protection Regulation (“GDPR”) is Studentley, operated by Paul Kuchler.</p><ContactCard /><p>Contact this address to exercise a data-protection right or ask a privacy question.</p>

    <h2>2. Data we process</h2><ul><li><b>Account data:</b> email address, authentication identifiers, account timestamps and security/session information.</li><li><b>Profile data:</b> display name, date of birth, grade or year, school system, timezone, study goals and study preferences.</li><li><b>Study workspace data:</b> subjects, tasks, exams, timetable entries, study sessions, completion history, notifications, achievements, practice sets, answers, scores, points and streaks.</li><li><b>Uploaded content:</b> file names, file metadata and the documents or images you choose to upload.</li><li><b>AI data:</b> questions, selected subject or document context, recent conversation context, generated answers, summaries, quizzes, flashcards, mock exams, imported schedule data and study plans.</li><li><b>Subscription data:</b> selected plan, subscription status, Stripe customer and subscription references, payment status and billing-period information. Studentley does not receive complete card details.</li><li><b>Technical data:</b> IP address, browser/device information, request timestamps, error and security logs, and technically necessary local-storage or session data.</li></ul>

    <h2>3. Purposes and legal bases</h2><div className="legal-table"><div><b>Providing the account and study service</b><span>Contract performance and steps requested before a contract, Art. 6(1)(b) GDPR.</span></div><div><b>Subscriptions, billing and accounting</b><span>Contract performance and compliance with legal obligations, Art. 6(1)(b) and (c) GDPR.</span></div><div><b>Security, abuse prevention and service reliability</b><span>Our legitimate interests in operating a secure and dependable service, Art. 6(1)(f) GDPR.</span></div><div><b>AI features requested by you</b><span>Performance of the requested service, Art. 6(1)(b) GDPR. Only the context selected or required for that request is sent for processing.</span></div><div><b>Optional communications or device access</b><span>Consent, Art. 6(1)(a) GDPR, where consent is legally required. Consent may be withdrawn at any time for the future.</span></div></div>

    <h2>4. AI processing</h2><p>Studentley uses OpenAI to provide personal study assistance when you actively use an AI feature. The request can contain your question, selected subject, selected document, limited recent conversation context, or the study records needed for a requested plan or workspace action. API requests set <code>store: false</code>, meaning the response is not retained as Responses API application state. Studentley stores generated practice sets, imported schedule entries, and study sessions, tasks, exams or subjects that you explicitly ask your personal AI to add. Personal AI conversation messages are saved only in your current browser’s local storage so they remain when you navigate or reload; they are not saved in the Studentley database and clearing the conversation removes that local copy.</p><p>AI output may be inaccurate. It is not used to make legal or similarly significant decisions about you and is not a substitute for your teacher, school, medical, legal or other professional advice.</p>

    <h2>5. Service providers and recipients</h2><p>Personal data is disclosed only where necessary to provide Studentley, comply with law, protect rights and security, or follow your instructions. Core providers currently include:</p><ul><li><b>Supabase:</b> authentication, PostgreSQL database and private document storage.</li><li><b>Vercel:</b> website hosting, delivery and server functions.</li><li><b>Stripe:</b> checkout, subscription management, payment processing and billing portal.</li><li><b>OpenAI:</b> AI processing only when an AI feature is requested.</li><li><b>Google Fonts:</b> delivery of the website fonts, which can involve processing technical request data such as an IP address.</li></ul><p>Providers act under their own legal obligations and, where applicable, under data-processing agreements.</p>

    <h2>6. International data transfers</h2><p>Some providers may process data outside Germany or the European Economic Area. Where required, transfers rely on an adequacy decision, the European Commission’s Standard Contractual Clauses, or another lawful safeguard under Chapter V GDPR. You may request information about the applicable safeguard using the contact details above.</p>

    <h2>7. Local storage and cookies</h2><p>Studentley uses technically necessary browser storage for authentication sessions, password-recovery state and your theme preference. This is required to keep you signed in, protect the account and provide settings you request. Under § 25(2) TDDDG, consent is not required for storage or access that is strictly necessary to provide a digital service expressly requested by the user. Stripe and other externally opened services may set their own necessary cookies under their policies. Studentley does not currently use advertising cookies or third-party behavioral analytics.</p>

    <h2>8. Retention and deletion</h2><p>Account and workspace data is generally retained while your account exists. You can delete individual files or delete the account in Settings. Account deletion removes the authentication account, associated database records and files from active Studentley storage. Limited records may be retained where required by tax, commercial, payment, fraud-prevention or legal-claims obligations. Security logs and provider backups expire according to operational retention schedules. Data is erased or anonymized when no longer required for its purpose.</p><p>Deleting a Studentley account does not automatically replace any separate cancellation or record-retention process required by Stripe or law. Manage an active subscription before deleting the account.</p>

    <h2>9. Your GDPR rights</h2><p>Subject to the statutory conditions, you have rights of access, rectification, erasure, restriction, data portability, and objection. Where processing is based on consent, you can withdraw it for the future. Where processing relies on legitimate interests, you can object on grounds relating to your particular situation. You also have the right to lodge a complaint with a data-protection supervisory authority, especially in the EU Member State of your residence, workplace or the alleged infringement.</p>

    <h2>10. Children and young users</h2><p>Studentley is designed for students and therefore aims to use clear, age-appropriate language. A person who cannot independently enter a binding contract under applicable law must use the service only with authorization from a parent or legal guardian. Where consent is the legal basis for an information-society service offered directly to a child, the age requirements of Art. 8 GDPR apply.</p>

    <h2>11. Security</h2><p>Studentley uses access controls, private storage, encrypted transport, authenticated server endpoints, per-user database policies and restricted server credentials. No internet service can guarantee absolute security. Keep your password confidential and report suspected unauthorized access immediately.</p>

    <h2>12. Changes to this policy</h2><p>This policy may be updated when the service, providers or legal requirements change. Material changes will be communicated in an appropriate manner. The date above identifies the current version.</p>
  </LegalShell>
}

function Terms() {
  return <LegalShell active="terms" title="Terms & Conditions" intro="These Terms govern the use of Studentley and any Free, Plus or Pro subscription. They apply in addition to mandatory consumer rights that cannot legally be excluded.">
    <h2>1. Provider and scope</h2><p>Studentley is operated by Paul Kuchler from Germany. These Terms apply to the website, account, study workspace, AI tools, subscriptions and related services.</p><ContactCard />

    <h2>2. Account eligibility and minors</h2><p>You must provide accurate information and keep it current. If you are not legally able to enter the agreement independently, a parent or legal guardian must authorize your account and any paid subscription. The person authorizing a minor’s use is responsible for supervising the account and payment.</p>

    <h2>3. Account security</h2><p>You are responsible for safeguarding your password and for activity under your account. Do not share credentials or allow another person to impersonate you. Notify Studentley promptly if you suspect unauthorized access. Studentley may require verification or temporarily restrict access to protect the service or its users.</p>

    <h2>4. The service</h2><p>Studentley provides tools for organizing schoolwork, storing study material, planning sessions, creating practice, tracking progress, using AI assistance and participating in a points leaderboard. Feature availability and usage allowances depend on the selected plan and are shown on the Plans page. Studentley is an independent study tool and is not affiliated with a school, examination board or educational authority unless explicitly stated.</p>

    <h2>5. AI features</h2><p>AI output is generated from probabilistic systems and may be incomplete, outdated or wrong. You must check important answers, exam information and extracted dates against the original source. Do not rely on Studentley for emergency, medical, legal, financial or other professional decisions. Usage limits may apply to control cost, reliability and fair access. Attempts to bypass limits, extract system instructions or misuse the AI service are prohibited.</p>

    <h2>6. Your content</h2><p>You retain ownership of material you upload and information you create. You grant Studentley a limited, non-exclusive license to host, copy, process and transmit that content only as needed to operate features you request, secure the service and comply with law. This license ends when the content is deleted, subject to backups and legal retention.</p><p>You must have the right to upload the content. Do not upload unlawful material, malware, confidential material you are not permitted to process, or content that infringes copyright, privacy or other rights. School materials may be protected by copyright; uploading them for personal study does not give you permission to redistribute them.</p>

    <h2>7. Acceptable use</h2><p>You may not use Studentley to break the law; harm, threaten or harass others; cheat in violation of school rules; access another account; probe or disrupt security; automate abusive traffic; reverse engineer protected portions of the service; scrape other users’ data; manipulate points or rankings; or use generated content to misrepresent work as your own where disclosure is required.</p>

    <h2>8. Points and leaderboard</h2><p>Studentley Points, streaks and ranks are virtual engagement features. They have no cash value, cannot be purchased, transferred or redeemed, and do not create property rights. Points are awarded only for eligible activities and may be corrected when generated through error, duplication, manipulation or abuse. Public leaderboard entries use the display information presented by the service; do not choose a display name that reveals information you do not want other users to see.</p>

    <h2>9. Free and paid plans</h2><p>The Free plan can be used without a subscription fee within its published limits. Plus and Pro are recurring subscriptions with the features, billing interval and total price shown before checkout. Prices shown at checkout include applicable taxes where stated. Stripe processes payment. Studentley does not store complete payment-card details.</p>

    <h2>10. Renewal, plan changes and cancellation</h2><p>A paid subscription renews automatically for the billing period shown at checkout until canceled. You can manage payment details, change an available plan or cancel through the billing portal linked from Studentley. Unless mandatory law or the checkout terms provide otherwise, cancellation takes effect at the end of the current paid period and access remains available until then. Failed or reversed payment can result in restriction or downgrade.</p>

    <h2>11. Statutory right of withdrawal</h2><p>If you are a consumer and conclude a paid contract remotely, you generally have a statutory 14-day right of withdrawal under German law. To exercise it, send an unequivocal statement identifying the contract and your decision to withdraw to <a href={`mailto:${email}`}>{email}</a> or the postal address above before the period expires. No reason is required. If you expressly request that service begins during the withdrawal period, the consequences provided by law—including proportionate payment for service already supplied or, where the legal conditions are satisfied, expiry of the right after full performance—may apply. This section does not limit any stronger mandatory right.</p>

    <h2>12. Availability and changes</h2><p>Studentley aims to provide a reliable service but does not promise uninterrupted availability. Maintenance, security incidents, provider outages and events outside reasonable control may cause interruption. Features may change to improve safety, comply with law, respond to provider changes or develop the product. A change that materially disadvantages a paid user will be communicated reasonably in advance where practicable, and mandatory termination rights remain unaffected.</p>

    <h2>13. Warranty and liability</h2><p>Mandatory statutory warranty rights apply. Studentley is liable without limitation for intent and gross negligence, for injury to life, body or health, under mandatory product-liability law, and where a guarantee has expressly been given. For ordinary negligence affecting an essential contractual obligation, liability is limited to the foreseeable damage typical for the contract. Otherwise, liability for ordinary negligence is excluded to the extent permitted by law. Nothing in these Terms excludes liability that cannot legally be excluded.</p>

    <h2>14. Suspension and termination</h2><p>You may stop using the Free plan and delete the account at any time. Studentley may suspend or terminate access where reasonably necessary because of material or repeated breach, non-payment, security risk, unlawful use or a legal requirement. Where appropriate, Studentley will give notice and an opportunity to remedy the breach. Statutory termination rights remain unaffected.</p>

    <h2>15. Intellectual property</h2><p>Studentley’s software, branding, design and original service content are protected by intellectual-property laws. These Terms grant only a personal, limited, revocable and non-transferable right to use the service as intended. They do not transfer ownership of Studentley or third-party technology.</p>

    <h2>16. Governing law and consumers</h2><p>German law applies, excluding the UN Convention on Contracts for the International Sale of Goods. If you are a consumer habitually resident in another country, this choice does not deprive you of mandatory protections granted by the law of that country. Statutory rules on competent courts remain unaffected.</p>

    <h2>17. Consumer dispute resolution</h2><p>Unless legally required in a specific case, Studentley does not undertake to participate in dispute-resolution proceedings before a consumer arbitration body. You can always contact Studentley directly first using the details above.</p>

    <h2>18. Changes and severability</h2><p>Studentley may update these Terms for valid reasons such as legal, security or material service changes. Material changes will be communicated before they take effect where required. If a provision is invalid or unenforceable, the remaining provisions continue to apply; the applicable statutory rule takes its place.</p>
  </LegalShell>
}

function Imprint() {
  return <LegalShell active="imprint" title="Legal Notice" intro="Provider information for Studentley under § 5 of the German Digital Services Act (DDG).">
    <h2>Service provider</h2><ContactCard />
    <h2>Responsible for content</h2><p>Paul Kuchler<br />Heinrich-Kürfgen-Strasse 4<br />Germany</p>
    <h2>Contact</h2><p>Email: <a href={`mailto:${email}`}>{email}</a></p>
    <h2>Consumer dispute resolution</h2><p>Unless legally required in a specific case, Studentley does not undertake to participate in dispute-resolution proceedings before a consumer arbitration body.</p>
    <h2>Liability for external links</h2><p>External websites are operated by third parties and are governed by their own content and privacy terms. Studentley reviews links when they are added but cannot continuously control third-party content.</p>
  </LegalShell>
}

export default function Legal() {
  const { document } = useParams()
  if (document === 'privacy') return <PrivacyPolicy />
  if (document === 'terms') return <Terms />
  if (document === 'imprint') return <Imprint />
  return <Navigate to="/legal/privacy" replace />
}
