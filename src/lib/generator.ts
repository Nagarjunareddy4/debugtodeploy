import { supabase } from './supabase';

export interface GeneratedLabStep {
  title: string;
  description: string;
  defaultCode: string;
  bugToken: string;
  fixHint: string;
}

export interface GeneratedLab {
  id: string;
  title: string;
  difficulty: string;
  xp: number;
  icon: string;
  color: string;
  steps: GeneratedLabStep[];
  lastStepIndex?: number;
  completedSteps?: boolean[];
  stepCodes?: string[];
}

export interface GeneratedInterview {
  id: string;
  title: string;
  level: string;
  questions: string[];
  duration: string;
  icon: string;
  color: string;
}

export interface GeneratedCertificate {
  id: string;
  title: string;
  description: string;
  price: string;
  officialUrl: string;
  icon: string;
  color: string;
}

export interface GeneratedDoc {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  icon: string;
  color: string;
}

export interface Curriculum {
  labs: GeneratedLab[];
  interviews: GeneratedInterview[];
}

export interface ResumeData {
  summary: string;
  technicalSkills: {
    category: string;
    skills: string[];
  }[];
  experience: {
    title: string;
    company: string;
    period: string;
    achievements: string[];
  }[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
  }[];
}

function sanitizeInput(input: string): string {
  return input.replace(/[<>{}|[\]\\]/g, '').slice(0, 100).trim();
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch {
    // Continue without auth — proxy will reject if required
  }
  return headers;
}

export async function generateUserDocs(userId: string, roadmapGoal: string, roadmapHash?: string): Promise<GeneratedDoc[] | null> {
  try {
    const cleanGoal = sanitizeInput(roadmapGoal);
    const prompt = `Based on the user's career goal of "${cleanGoal}", provide exactly 6 essential official documentation links or deep-dive learning resources (like Kubernetes Docs, Terraform Registry, AWS Whitepapers, etc.).
Return ONLY a JSON object with a key "docs" containing an array.

For each resource, provide:
- "id": a unique string
- "title": string (e.g. "Kubernetes Network Policies")
- "description": string (short 1-sentence summary of what they will learn)
- "url": string (the exact official website URL)
- "category": string (e.g. "Networking", "Security", "IaC")
- "icon": string (choose from: "Book", "Link", "Globe", "FileText", "Compass")
- "color": string (choose from: "soft-blue", "soft-green", "soft-purple", "soft-orange", "soft-red")`;

    const res = await fetch('/api/openai-proxy?path=v1/chat/completions', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a technical documentation curator. Output only strict JSON matching the requested structure. If the input goal is nonsensical, provide high-quality DevOps documentation.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);
    const docs: GeneratedDoc[] = result.docs;

    const updatePayload: Record<string, any> = {
      generated_docs: docs,
    };
    if (roadmapHash) {
      updatePayload.roadmap_hash = roadmapHash;
      updatePayload.roadmap_version = roadmapHash;
    }
    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userId);

    if (error) {
      console.error('Supabase Save Error:', error.message);
    }

    return docs;
  } catch (error: any) {
    console.error('Generation failure for docs:', error.message);
    return null;
  }
}

export async function generateUserCurriculum(userId: string, roadmapGoal: string = 'DevOps Engineering', experienceLevel: string = 'intermediate', roadmapHash?: string): Promise<Curriculum | null> {
  try {
    const cleanGoal = sanitizeInput(roadmapGoal);
    const cleanLevel = sanitizeInput(experienceLevel);

    const prompt = `Generate a structured curriculum for a DevOps/SRE learning platform that matches a user whose roadmap goal is "${cleanGoal}" and experience level is "${cleanLevel}".
Return a JSON object with two arrays: "labs" (5 items) and "interviews" (3 items).
The concepts MUST strictly match the user's experience level (${cleanLevel}) and be directly aligned with their career goal (${cleanGoal}). Do NOT include basic or beginner concepts if the user's experience level is intermediate or advanced. Ensure the difficulty of the labs and interviews appropriately reflects their ${cleanLevel} expertise.

For each "lab", provide:
- "id": a string from "1" to "5"
- "title": string
- "difficulty": "Easy", "Medium", or "Hard"
- "xp": number (e.g. 250, 500, 1000)
- "icon": string (choose from: "Cloud", "Terminal", "ShieldCheck", "Zap", "Flame")
- "color": string (choose from: "soft-blue", "soft-green", "soft-purple", "soft-orange", "soft-red")
- "steps": an array of exactly 3 objects, each with:
  - "title": string
  - "description": string
  - "defaultCode": string (a Kubernetes YAML snippet that contains a deliberate error)
  - "bugToken": string (the exact incorrect text string inside defaultCode that the user needs to fix/remove. It MUST be a substring of defaultCode)
  - "fixHint": string (hint on how to fix it)

For each "interview", provide:
- "id": a string from "1" to "3"
- "title": string
- "level": "Easy", "Medium", or "Hard"
- "questions": array of 5 technical questions
- "duration": string (e.g. "15m", "25m")
- "icon": string (choose from: "Zap", "Brain", "Sparkles", "Cloud")
- "color": string (choose from: "soft-blue", "soft-purple", "soft-green", "soft-orange")`;

    const res = await fetch('/api/openai-proxy?path=v1/chat/completions', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a technical curriculum designer. Output only strict JSON matching the requested structure.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices[0].message.content;
    const curriculum: Curriculum = JSON.parse(content);

    const updatePayload: Record<string, any> = {
      generated_labs: curriculum.labs,
      generated_interviews: curriculum.interviews,
    };
    if (roadmapHash) {
      updatePayload.roadmap_hash = roadmapHash;
      updatePayload.roadmap_version = roadmapHash;
    }
    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userId);

    if (error) {
      console.error('Supabase Save Error (Curriculum):', error.message);
    }

    return curriculum;
  } catch (error: any) {
    console.error('Generation failure for curriculum:', error.message);
    return null;
  }
}

export async function generateUserCertificates(userId: string, roadmapGoal: string, experienceLevel: string, roadmapHash?: string): Promise<GeneratedCertificate[] | null> {
  try {
    const cleanGoal = sanitizeInput(roadmapGoal);
    const cleanLevel = sanitizeInput(experienceLevel);

    const prompt = `Based on the user's career goal of "${cleanGoal}" and current experience level of "${cleanLevel}", recommend exactly 3-4 highly relevant official DevOps/Cloud certifications.
Return ONLY a JSON object with a key "certificates" containing an array.

For each certificate, provide:
- "id": a string from "1" to "4"
- "title": string (e.g. "AWS Certified Solutions Architect – Associate", "CKA", etc.)
- "description": string (clear explanation of why they need this and what it covers)
- "price": string (e.g. "$150 USD", "$395 USD")
- "officialUrl": string (the exact official website URL to register for the certificate)
- "icon": string (choose from: "Cloud", "Award", "ShieldCheck", "Zap", "Terminal")
- "color": string (choose from: "soft-blue", "soft-green", "soft-purple", "soft-orange", "soft-red")`;

    const res = await fetch('/api/openai-proxy?path=v1/chat/completions', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert DevOps career counselor. Output only strict JSON matching the requested structure. If input is invalid, provide standard cloud certs.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);
    const certificates: GeneratedCertificate[] = result.certificates;

    const updatePayload: Record<string, any> = {
      generated_certificates: certificates,
    };
    if (roadmapHash) {
      updatePayload.roadmap_hash = roadmapHash;
      updatePayload.roadmap_version = roadmapHash;
    }
    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userId);

    if (error) {
      console.error('Supabase Save Error (Certificates):', error.message);
    }

    return certificates;
  } catch (error: any) {
    console.error('Generation failure for certificates:', error.message);
    return null;
  }
}

export function isCurriculumStale(profile: any, currentRoadmapVersion: string): boolean {
  if (!profile.generated_labs || !profile.generated_interviews) return true;
  if (!profile.roadmap_version) return true;
  return profile.roadmap_version !== currentRoadmapVersion;
}

export function isAllContentStale(profile: any, currentRoadmapVersion: string): boolean {
  // Only trigger automatic generation if content is completely missing
  const isMissingContent = !profile.generated_labs?.length || !profile.generated_interviews?.length;
  
  if (isMissingContent && profile.roadmap_data) return true;
  
  // For version mismatch, we don't automatically show the generation screen on every login
  // unless the content is totally missing.
  return false;
}

export async function generateAiResume(profile: any): Promise<ResumeData | null> {
  if (!profile) return null;

  try {
    const roadmap = profile.roadmap_data ? (typeof profile.roadmap_data === 'string' ? JSON.parse(profile.roadmap_data) : profile.roadmap_data) : null;
    const completedLabs = profile.labs_completed || 0;
    const generatedLabs = profile.generated_labs || [];
    const completedLabTitles = generatedLabs.slice(0, completedLabs).map((l: any) => l.title);

    const completedTasks = profile.completed_roadmap_tasks || [];
    const interviewScores = profile.interview_scores || {};
    const generatedInterviews = profile.generated_interviews || [];
    const topInterviews = Object.entries(interviewScores)
      .map(([id, score]) => {
        const interview = generatedInterviews.find((i: any) => i.id === id);
        return interview ? { title: interview.title, score } : null;
      })
      .filter(Boolean);

    const goal = roadmap?.goal || 'DevOps Engineer';
    const xp = profile.xp || 0;
    const streak = profile.streak || 0;
    const readinessScore = profile.readiness_score || 0;
    const level = profile.level || 1;

    // Compute accurate start month/year from DB registration date
    const joinDate = profile.created_at ? new Date(profile.created_at) : new Date();
    const joinMonthYear = joinDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Build list of completed lab names for context
    const labsContext = completedLabTitles.length > 0
      ? completedLabTitles.join(', ')
      : 'Cloud infrastructure debugging labs';

    // Build interview performance context
    const interviewContext = topInterviews.length > 0
      ? topInterviews.map((i: any) => `${i.title} (scored ${i.score}/10)`).join(', ')
      : 'General DevOps engineering scenarios';

    // --- Extract rich data directly from the AI Roadmap ---
    const roadmapObjective = roadmap?.description || '';
    const roadmapTitle = roadmap?.title || goal;
    const roadmapExperience = roadmap?.experience || 'intermediate';

    // Extract stage topic areas as skill categories (e.g. "Kubernetes Fundamentals", "CI/CD Pipelines")
    const roadmapStages: string[] = roadmap?.stages
      ? roadmap.stages.map((s: any) => s.label).filter(Boolean)
      : [];

    // Extract ALL individual task labels from ALL stages as granular skills
    const roadmapSkills: string[] = roadmap?.stages
      ? roadmap.stages.flatMap((s: any) =>
          (s.tasks || []).map((t: any) => (typeof t === 'string' ? t : t.label)).filter(Boolean)
        )
      : [];

    // Determine which roadmap tasks are actually completed by matching task IDs
    const completedRoadmapTaskLabels: string[] = roadmap?.stages
      ? roadmap.stages.flatMap((stage: any, sIdx: number) =>
          (stage.tasks || [])
            .map((t: any, tIdx: number) => ({
              label: typeof t === 'string' ? t : t.label,
              id: `${stage.id || `stage-${sIdx + 1}`}-task-${tIdx}`
            }))
            .filter((t: any) => completedTasks.includes(t.id))
            .map((t: any) => t.label)
        )
      : [];

    const prompt = `You are a senior DevOps hiring manager and expert resume writer. Generate a complete, professional, high-impact resume in JSON format for the following candidate.

CANDIDATE PROFILE (use ALL of this REAL data to write the resume):
- Career Goal / Target Role: ${goal}
- Roadmap Title: ${roadmapTitle}
- Experience Level: ${roadmapExperience}
- Career Objective (from their AI roadmap): ${roadmapObjective || `Become a ${goal}`}
- Platform XP Earned: ${xp}
- Readiness Score: ${readinessScore}%
- Current Level: ${level}
- Day Streak: ${streak} days
- Member Since: ${joinMonthYear}

ROADMAP KNOWLEDGE AREAS (AI-generated learning plan stage topics — use these as skill categories in the resume):
${roadmapStages.length > 0 ? roadmapStages.map((s, i) => `  ${i + 1}. ${s}`).join('\n') : '  General DevOps topics'}

INDIVIDUAL SKILLS FROM ROADMAP (specific tasks from their AI roadmap — use these as the actual skills listed under each category):
${roadmapSkills.length > 0 ? roadmapSkills.slice(0, 30).join(', ') : 'Kubernetes, Docker, CI/CD, Terraform, AWS, Linux'}

COMPLETED ROADMAP MILESTONES (${completedRoadmapTaskLabels.length} tasks marked done by user):
${completedRoadmapTaskLabels.length > 0 ? completedRoadmapTaskLabels.join(', ') : 'In progress'}

PRACTICAL LABS COMPLETED (${completedLabs}): ${labsContext}
AI INTERVIEW PERFORMANCE: ${interviewContext}

STRICT INSTRUCTIONS:
1. The professional summary MUST be based on the Career Objective from the roadmap. Do NOT write a generic summary.
2. The technicalSkills section MUST use the Roadmap Knowledge Areas as the skill category names, and populate each category with the specific Individual Skills from the roadmap that belong to it.
3. The experience period MUST be "${joinMonthYear} – Present". Never use 2024 or any other hardcoded year.
4. Generate 1-2 experience entries and 2-3 projects directly derived from the completed labs and completed roadmap milestones.
5. All content must be fully AI-generated based on the data above — no placeholder or generic text of any kind.

Return ONLY a valid JSON object with this exact structure:
{
  "summary": "A compelling 3-4 sentence professional summary based directly on the Career Objective and roadmap content",
  "technicalSkills": [
    { "category": "<use exact Roadmap Knowledge Area stage label>", "skills": ["<specific roadmap skill>", "<specific roadmap skill>"] },
    { "category": "<use exact Roadmap Knowledge Area stage label>", "skills": ["<specific roadmap skill>", "<specific roadmap skill>"] }
  ],
  "experience": [
    {
      "title": "<a relevant job title matching their career goal>",
      "company": "DebugToDeploy Learning Platform",
      "period": "${joinMonthYear} – Present",
      "achievements": ["<specific achievement referencing completed milestone or lab names>", "<another specific achievement>", "<another>"]
    }
  ],
  "projects": [
    {
      "name": "<project name derived from a completed lab or roadmap stage topic>",
      "description": "<specific description based on the actual lab or stage content>",
      "technologies": ["<technology from roadmap skills>", "<technology from roadmap skills>"]
    }
  ]
}`;

    const res = await fetch('/api/openai-proxy?path=v1/chat/completions', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert technical resume writer for DevOps engineers. Output only strict, valid JSON. All content must be dynamically generated based on the candidate data provided. Never use placeholder text.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2500,
        temperature: 0.8,
      }),
    });

    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Resume generation failed:', error);
    return null;
  }
}
