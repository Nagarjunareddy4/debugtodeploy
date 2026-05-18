// API endpoint for generating DevOps quiz questions using AI
// POST /api/quiz/generate

import { generateRandomQuestion, saveGeneratedQuestion } from '../../src/lib/quizGeneration';
import { getTodaysQuizQuestions } from '../../src/lib/quizGeneration';

/**
 * Generate new quiz questions for today if needed
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    if (action === 'ensure-daily-pool') {
      // Ensure today's quiz pool exists
      const today = new Date().toISOString().split('T')[0];
      const questions = await getTodaysQuizQuestions();
      
      if (questions.length >= 5) {
        return res.status(200).json({ 
          success: true, 
          count: questions.length,
          message: 'Daily quiz pool ready'
        });
      }

      // Generate new questions
      let generatedCount = 0;
      const maxAttempts = 15;
      let attempts = 0;

      while (generatedCount < 5 && attempts < maxAttempts) {
        attempts++;
        const newQuestion = await generateRandomQuestion();
        
        if (newQuestion) {
          const saved = await saveGeneratedQuestion(newQuestion);
          if (saved) {
            generatedCount++;
          }
        }
      }

      return res.status(200).json({
        success: true,
        generated: generatedCount,
        attempts,
        message: `Generated ${generatedCount} new questions in ${attempts} attempts`
      });
    }

    if (action === 'generate-single') {
      // Generate a single question
      const question = await generateRandomQuestion();
      
      if (!question) {
        return res.status(400).json({ error: 'Failed to generate question' });
      }

      const saved = await saveGeneratedQuestion(question);
      
      return res.status(200).json({
        success: !!saved,
        question,
        saved: !!saved
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Error in quiz generation API:', error);
    return res.status(500).json({ error: error.message });
  }
}
