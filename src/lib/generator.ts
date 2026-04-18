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

export interface Curriculum {
  labs: GeneratedLab[];
  interviews: GeneratedInterview[];
}

export async function generateUserCurriculum(apiKey: string, userId: string): Promise<Curriculum | null> {
  try {
    const prompt = `Generate a structured curriculum for a DevOps/SRE learning platform.
Return a JSON object with two arrays: "labs" (5 items) and "interviews" (3 items).
The concepts should sequence from beginner to advanced.

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

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    
    const content = data.choices[0].message.content;
    const curriculum: Curriculum = JSON.parse(content);

    // Save to supabase
    const { error } = await supabase.from('profiles').update({
      generated_labs: curriculum.labs,
      generated_interviews: curriculum.interviews
    }).eq('id', userId);

    if (error) {
      console.error('Failed to save generated curriculum:', error);
      throw new Error(error.message);
    }

    return curriculum;
  } catch (error) {
    console.error('Error generating curriculum:', error);
    return null;
  }
}

export async function generateUserCertificates(apiKey: string, userId: string, roadmapGoal: string, experienceLevel: string): Promise<GeneratedCertificate[] | null> {
  try {
    const prompt = `Based on the user's career goal of "${roadmapGoal}" and current experience level of "${experienceLevel}", recommend exactly 3-4 highly relevant official DevOps/Cloud certifications.
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
          { role: 'system', content: 'You are an expert DevOps career counselor. Output only strict JSON matching the requested structure.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);
    const certificates: GeneratedCertificate[] = result.certificates;

    // Save to supabase
    const { error } = await supabase.from('profiles').update({
      generated_certificates: certificates
    }).eq('id', userId);

    if (error) {
      console.error('Failed to save generated certificates:', error);
      throw new Error(error.message);
    }

    return certificates;
  } catch (error) {
    console.error('Error generating certificates:', error);
    return null;
  }
}
