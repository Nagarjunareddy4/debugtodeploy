import { supabase } from './supabase';

export interface GeneratedQuizQuestion {
  id?: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  question_text: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  wrong_explanation: string;
  xp_reward: number;
}

const CATEGORIES = [
  'Kubernetes',
  'CI/CD',
  'Docker',
  'Monitoring',
  'Security',
  'AWS',
  'Linux',
  'Terraform',
  'Networking',
  'DevOps Tools'
];

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

/**
 * Generate a simple hash of the question text for duplicate detection
 * Uses browser-compatible SHA-256 if available, otherwise simple hash
 */
async function calculateQuestionHash(questionText: string): Promise<string> {
  const normalized = questionText
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
  
  // Try to use SubtleCrypto if available (modern browsers)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoded = new TextEncoder().encode(normalized);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
      console.warn('SubtleCrypto not available, using fallback hash');
    }
  }

  // Fallback: simple hash function
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Generate random DevOps question using AI
 */
export async function generateRandomQuestion(): Promise<GeneratedQuizQuestion | null> {
  try {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];

    const prompt = `Generate a single multiple-choice question about ${category} at ${difficulty} level for DevOps professionals.

Requirements:
1. Question must be unique and not commonly seen
2. Provide exactly 4 options (A, B, C, D)
3. Question should test practical knowledge
4. Avoid Yes/No questions
5. Make it engaging and relevant

Format your response as valid JSON only (no markdown, no code blocks):
{
  "question": "Your question here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer_index": 0,
  "explanation": "Why this is correct in 1-2 lines",
  "wrong_explanation": "Why the wrong answers matter in 1-2 lines",
  "xp_reward": 10
}`;

    // Call OpenAI API
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/openai-proxy?path=v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a DevOps expert creating high-quality quiz questions. 
            Generate unique questions that test practical DevOps knowledge.
            Return ONLY valid JSON, no markdown or code blocks.
            Ensure the question_text is thought-provoking and tests real-world scenarios.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    let questionData;
    try {
      // Try to extract JSON from response
      const content = data.choices?.[0]?.message?.content || '';
      // Remove markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      questionData = JSON.parse(cleanedContent);
    } catch (parseErr) {
      console.error('Failed to parse AI response:', data.choices?.[0]?.message?.content);
      return null;
    }

    // Validate the response
    if (!validateQuestionData(questionData)) {
      console.error('Invalid question data from AI:', questionData);
      return null;
    }

    const generatedQuestion: GeneratedQuizQuestion = {
      category,
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
      question_text: questionData.question,
      options: questionData.options,
      correct_answer_index: questionData.correct_answer_index,
      explanation: questionData.explanation,
      wrong_explanation: questionData.wrong_explanation,
      xp_reward: questionData.xp_reward || (difficulty === 'beginner' ? 10 : 15)
    };

    return generatedQuestion;
  } catch (err) {
    console.error('Error generating question:', err);
    return null;
  }
}

/**
 * Check if question already exists (duplicate detection)
 */
export async function isDuplicateQuestion(questionText: string, supabaseClient = supabase): Promise<boolean> {
  try {
    const hash = await calculateQuestionHash(questionText);

    const { data, error } = await supabaseClient
      .from('generated_quiz_questions')
      .select('id')
      .eq('question_hash', hash)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (err) {
    console.error('Error checking duplicate:', err);
    return false;
  }
}

/**
 * Save generated question to database
 */
export async function saveGeneratedQuestion(question: GeneratedQuizQuestion, supabaseClient = supabase): Promise<string | null> {
  try {
    // Prevent client-side database writes to keep browser console clean
    if (typeof window !== 'undefined') {
      return null;
    }

    // Check for duplicate
    const isDuplicate = await isDuplicateQuestion(question.question_text, supabaseClient);
    if (isDuplicate) {
      console.warn('Question already exists, skipping');
      return null;
    }

    const hash = await calculateQuestionHash(question.question_text);

    const { data, error } = await supabaseClient
      .from('generated_quiz_questions')
      .insert({
        category: question.category,
        difficulty: question.difficulty,
        question_text: question.question_text,
        options: question.options,
        correct_answer_index: question.correct_answer_index,
        explanation: question.explanation,
        wrong_explanation: question.wrong_explanation,
        xp_reward: question.xp_reward,
        question_hash: hash,
        is_active: true
      })
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (err) {
    console.error('Error saving question:', err);
    return null;
  }
}

/**
 * Get 5 random questions for today's quiz
 */
export async function getTodaysQuizQuestions(supabaseClient = supabase): Promise<GeneratedQuizQuestion[]> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if pool exists for today
    const { data: poolData, error: poolError } = await supabaseClient
      .from('daily_quiz_pool')
      .select('question_ids')
      .eq('quiz_date', today)
      .maybeSingle();

    if (poolError) throw poolError;

    let questionIds: string[] = [];

    if (poolData?.question_ids) {
      questionIds = poolData.question_ids;
    } else {
      // In the browser (client-side), do not perform database writes to avoid RLS/403 errors.
      // The client will automatically fall back to LocalStorage client-side AI generation.
      if (typeof window !== 'undefined') {
        console.warn('Daily quiz pool not found in Supabase. Falling back to local client-side AI generation.');
        return [];
      }

      // On the server, generate and save today's pool securely
      questionIds = await generateDailyQuizPool(supabaseClient);
      
      // Save the pool
      const { error: insertError } = await supabaseClient
        .from('daily_quiz_pool')
        .insert({
          quiz_date: today,
          question_ids: questionIds,
          is_used: false
        });

      if (insertError) throw insertError;
    }

    // Fetch the questions
    if (questionIds.length === 0) {
      console.warn('No questions generated for today');
      return [];
    }

    const { data: questions, error: questionsError } = await supabaseClient
      .from('generated_quiz_questions')
      .select('*')
      .in('id', questionIds)
      .eq('is_active', true);

    if (questionsError) throw questionsError;

    return (questions || []).map(q => ({
      id: q.id,
      category: q.category,
      difficulty: q.difficulty,
      question_text: q.question_text,
      options: q.options,
      correct_answer_index: q.correct_answer_index,
      explanation: q.explanation,
      wrong_explanation: q.wrong_explanation,
      xp_reward: q.xp_reward
    }));
  } catch (err) {
    console.error('Error getting daily quiz:', err);
    return [];
  }
}

/**
 * Generate pool of 5 new questions for today
 */
async function generateDailyQuizPool(supabaseClient = supabase): Promise<string[]> {
  const questionIds: string[] = [];
  const maxAttempts = 15; // Try up to 15 times to get 5 unique questions
  let attempts = 0;

  while (questionIds.length < 5 && attempts < maxAttempts) {
    attempts++;

    // Generate new question
    const newQuestion = await generateRandomQuestion();
    if (!newQuestion) continue;

    // Check if duplicate
    const isDuplicate = await isDuplicateQuestion(newQuestion.question_text, supabaseClient);
    if (isDuplicate) continue;

    // Save question
    const questionId = await saveGeneratedQuestion(newQuestion, supabaseClient);
    if (questionId) {
      questionIds.push(questionId);
    }
  }

  if (questionIds.length < 5) {
    console.warn(`Only generated ${questionIds.length} unique questions for today`);
  }

  return questionIds;
}

/**
 * Validate question data structure
 */
function validateQuestionData(data: any): boolean {
  return (
    data &&
    typeof data.question === 'string' &&
    Array.isArray(data.options) &&
    data.options.length === 4 &&
    typeof data.correct_answer_index === 'number' &&
    data.correct_answer_index >= 0 &&
    data.correct_answer_index < 4 &&
    typeof data.explanation === 'string' &&
    typeof data.wrong_explanation === 'string'
  );
}

/**
 * Get question statistics
 */
export async function getQuestionStats(): Promise<{
  totalGenerated: number;
  uniqueQuestions: number;
  categoriesCount: Record<string, number>;
  difficultyCount: Record<string, number>;
}> {
  try {
    const { data: questions, error } = await supabase
      .from('generated_quiz_questions')
      .select('id, category, difficulty');

    if (error) throw error;

    const stats = {
      totalGenerated: questions?.length || 0,
      uniqueQuestions: new Set((questions || []).map(q => q.id)).size,
      categoriesCount: {} as Record<string, number>,
      difficultyCount: {} as Record<string, number>
    };

    (questions || []).forEach(q => {
      stats.categoriesCount[q.category] = (stats.categoriesCount[q.category] || 0) + 1;
      stats.difficultyCount[q.difficulty] = (stats.difficultyCount[q.difficulty] || 0) + 1;
    });

    return stats;
  } catch (err) {
    console.error('Error getting stats:', err);
    return {
      totalGenerated: 0,
      uniqueQuestions: 0,
      categoriesCount: {},
      difficultyCount: {}
    };
  }
}
