import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { buildVisualExplanationPdfBytes } from '../src/lib/visualExplanationPdf.js'

const output = process.argv[2] || 'visual-explanation-sample.pdf'
await mkdir(dirname(output), { recursive: true })

const guide = {
  title: 'Photosynthesis, made simple',
  config: {
    subjectName: 'Biology', level: 'IGCSE', subtitle: 'How plants turn light into stored chemical energy.', topic: 'Photosynthesis',
    keyIdeas: ['Light energy is captured by chlorophyll.', 'Carbon dioxide and water are the raw materials.', 'Glucose stores energy for the plant.', 'Oxygen leaves the leaf as a product.'],
    glossary: [{ term: 'Chlorophyll', meaning: 'The green pigment that absorbs light energy.' }, { term: 'Glucose', meaning: 'A sugar that stores chemical energy.' }, { term: 'Stomata', meaning: 'Tiny openings that let gases move in and out of a leaf.' }],
  },
  items: [
    { heading: 'The big idea', explanation: 'A plant uses light energy to join carbon dioxide and water. The reaction makes glucose and releases oxygen.', example: 'A leaf in bright light usually makes glucose faster than the same leaf in darkness.', takeaway: 'Light energy is changed into chemical energy.', visual_type: 'process', visual_title: 'Inputs become products', labels: [], values: [], steps: ['Sunlight reaches the leaf', 'Roots supply water', 'Stomata take in carbon dioxide', 'The leaf makes glucose', 'Oxygen is released'], review_question: 'What form of energy is stored in glucose?', review_answer: 'Chemical energy.' },
    { heading: 'What changes the rate?', explanation: 'Light intensity, carbon dioxide concentration and temperature can each limit how quickly photosynthesis happens.', example: 'Increasing light may stop helping when carbon dioxide becomes the limiting factor.', takeaway: 'The scarcest requirement controls the rate.', visual_type: 'line_graph', visual_title: 'Example: light intensity and rate', labels: ['Low', '2', '3', '4', 'High'], values: [1, 3, 6, 8, 8], steps: [], review_question: 'Why does the graph level off?', review_answer: 'Another factor becomes limiting.' },
    { heading: 'Inside the leaf', explanation: 'A leaf is built to collect light and exchange gases. Different structures have different jobs.', example: 'Palisade cells sit near the top and contain many chloroplasts, so they receive lots of light.', takeaway: 'Leaf structure supports efficient photosynthesis.', visual_type: 'labeled_diagram', visual_title: 'Main leaf structures', labels: ['Waxy cuticle', 'Palisade cells', 'Air spaces', 'Stomata'], values: [], steps: [], review_question: 'Which cells contain many chloroplasts?', review_answer: 'Palisade cells.' },
    { heading: 'Use the equation', explanation: 'The word equation summarizes the substances used and made. It also helps you check whether an explanation is complete.', example: 'carbon dioxide + water -> glucose + oxygen', takeaway: 'Reactants go on the left; products go on the right.', visual_type: 'comparison', visual_title: 'Reactants and products', labels: ['Reactants', 'Products'], values: [], steps: ['Carbon dioxide', 'Glucose', 'Water', 'Oxygen'], review_question: 'Which product stores energy?', review_answer: 'Glucose.' },
  ],
}

await writeFile(output, await buildVisualExplanationPdfBytes(guide))
console.log(output)
