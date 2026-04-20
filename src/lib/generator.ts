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
  // Remove potential prompt injection characters and limit length
  return input.replace(/[<>{}|[\]\\]/g, '').slice(0, 100).trim();
}

export async function generateUserDocs(apiKey: string, userId: string, roadmapGoal: string, roadmapHash?: string): Promise<GeneratedDoc[] | null> {
  if (!apiKey) {
    console.error('AI Generation Error: Missing API Key. AI features require an OpenAI key.');
    return null;
  }

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

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
      },
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

    // Save to supabase
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
      // We still return the docs since they were generated successfully
    }

    return docs;
  } catch (error: any) {
    console.error('Generation failure for docs:', error.message);
    return null;
  }
}

export async function generateUserCurriculum(apiKey: string, userId: string, roadmapGoal: string = 'DevOps Engineering', experienceLevel: string = 'intermediate', roadmapHash?: string): Promise<Curriculum | null> {
  if (!apiKey) {
    console.error('AI Generation Error: Missing API Key.');
    return null;
  }

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

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
      },
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

    // Save to supabase
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

export async function generateUserCertificates(apiKey: string, userId: string, roadmapGoal: string, experienceLevel: string, roadmapHash?: string): Promise<GeneratedCertificate[] | null> {
  if (!apiKey) {
    console.error('AI Generation Error: Missing API Key.');
    return null;
  }

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

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
      },
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

    // Save to supabase
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
  if (!profile.roadmap_version) return true; // never been versioned
  return profile.roadmap_version !== currentRoadmapVersion;
}

export function isAllContentStale(profile: any, currentRoadmapVersion: string): boolean {
  return (
    isCurriculumStale(profile, currentRoadmapVersion) ||
    !profile.generated_certificates ||
    !profile.generated_docs
  );
}

export async function generateAiResume(apiKey: string, profile: any): Promise<ResumeData | null> {
  if (!apiKey || !profile) return null;

  try {
    const roadmap = profile.roadmap_data ? (typeof profile.roadmap_data === 'string' ? JSON.parse(profile.roadmap_data) : profile.roadmap_data) : null;
    const completedLabs = profile.labs_completed || 0;
    const goal = roadmap?.goal || 'DevOps Engineer';
    const xp = profile.xp || 0;

    const prompt = `Act as a senior DevOps hiring manager. Create a professional, high-impact resume for a user with the following stats:
- Current Goal: ${goal}
- Total XP: ${xp}
- Practical Labs Completed: ${completedLabs}
- Current Skill Roadmap: ${roadmap?.title || 'N/A'}

The resume should translate their platform progress into professional industry terms.
"Labs Completed" should be treated as "Technical Hands-on Projects."

Return ONLY a JSON object matching this structure:
{
  "summary": "Professional summary focusing on their career goal and technical growth",
  "technicalSkills": [
    { "category": "Cloud & Infrastructure", "skills": ["AWS", "Kubernetes", "..."] },
    { "category": "CI/CD & DevOps", "skills": ["Jenkins", "GitHub Actions", "..."] }
  ],
  "experience": [
    { 
      "title": "DevOps Engineer (Hands-on Training)", 
      "company": "DebugToDeploy Advanced Simulation", 
      "period": "2024 - Present",
      "achievements": ["Successfully solved ${completedLabs} production-grade infrastructure anomalies", "Mastered ${goal} core competencies through practical lab clusters"]
    }
  ],
  "projects": [
    { "name": "Cloud Infrastructure Optimization", "description": "Designed and fixed high-availability Kubernetes deployments", "technologies": ["Kubernetes", "YAML", "Docker"] }
  ]
}
Include realistic technologies based on the goal of ${goal}.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert technical resume writer. Output only strict JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.7,
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

export function isCurriculumStale(profile: any, currentRoadmapVersion: string): boolean {
  if (!profile.generated_labs || !profile.generated_interviews) return true;
  if (!profile.roadmap_version) return true; // never been versioned
  return profile.roadmap_version !== currentRoadmapVersion;
}

export function isAllContentStale(profile: any, currentRoadmapVersion: string): boolean {
  return (
    isCurriculumStale(profile, currentRoadmapVersion) ||
    !profile.generated_certificates ||
    !profile.generated_docs
  );
}
