// Daily DevOps Quiz - AI Generated Questions
// Fetches dynamically generated questions from database instead of static list

import { getTodaysQuizQuestions } from './quizGeneration';
import { supabase } from './supabase';

export interface QuizQuestion {
  id?: string;
  question?: string;
  question_text?: string; // Support both naming conventions
  options: string[];
  correctAnswer?: number;
  correct_answer_index?: number; // Support both naming conventions
  explanation: string;
  wrong_explanation?: string;
  wrongExplanation?: string; // Support both naming conventions
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  xpReward?: number;
  xp_reward?: number; // Support both naming conventions
}

// Normalize question from database format to component format
function normalizeQuestion(dbQuestion: any): QuizQuestion {
  return {
    id: dbQuestion.id,
    question: dbQuestion.question_text || dbQuestion.question,
    question_text: dbQuestion.question_text,
    options: dbQuestion.options || [],
    correctAnswer: dbQuestion.correct_answer_index ?? dbQuestion.correctAnswer,
    correct_answer_index: dbQuestion.correct_answer_index,
    explanation: dbQuestion.explanation || '',
    wrongExplanation: dbQuestion.wrong_explanation || dbQuestion.wrongExplanation || '',
    wrong_explanation: dbQuestion.wrong_explanation,
    difficulty: dbQuestion.difficulty || 'beginner',
    category: dbQuestion.category || 'General',
    xpReward: dbQuestion.xp_reward || dbQuestion.xpReward || 10,
    xp_reward: dbQuestion.xp_reward
  };
}

// Fallback questions in case AI generation fails
const FALLBACK_QUESTIONS: QuizQuestion[] = [
  // Kubernetes Questions
  {
    id: 'k8s-1',
    question: 'What is a Kubernetes Pod?',
    options: [
      'A group of containers that run together on the same node',
      'A virtual machine that runs containerized applications',
      'A namespace for organizing resources',
      'A network policy for securing traffic'
    ],
    correctAnswer: 0,
    explanation: 'A Pod is the smallest deployable unit in Kubernetes, containing one or more containers.',
    wrongExplanation: 'Pods are lightweight containers/container groups, not VMs. They are the basic building block.',
    difficulty: 'beginner',
    category: 'Kubernetes',
    xpReward: 10
  },
  {
    id: 'k8s-2',
    question: 'Which Kubernetes object manages stateful applications?',
    options: [
      'Deployment',
      'StatefulSet',
      'DaemonSet',
      'ReplicaSet'
    ],
    correctAnswer: 1,
    explanation: 'StatefulSets are designed for stateful applications with persistent storage and stable network identities.',
    wrongExplanation: 'StatefulSets handle state persistence and ordered deployment, unlike Deployments for stateless apps.',
    difficulty: 'intermediate',
    category: 'Kubernetes',
    xpReward: 15
  },
  {
    id: 'k8s-3',
    question: 'What does a Kubernetes Service provide?',
    options: [
      'Container image registry',
      'Stable IP and DNS for Pods',
      'Storage persistence layer',
      'Monitoring and alerting'
    ],
    correctAnswer: 1,
    explanation: 'Services expose Pods with stable IPs and DNS names, enabling reliable networking.',
    wrongExplanation: 'Services abstract Pod networking. They provide stable endpoints, not storage or monitoring.',
    difficulty: 'beginner',
    category: 'Kubernetes',
    xpReward: 10
  },
  {
    id: 'k8s-4',
    question: 'How do you scale a Kubernetes Deployment?',
    options: [
      'Edit the YAML and reapply',
      'Use kubectl scale command',
      'Both A and B',
      'Use horizontal pod autoscaler only'
    ],
    correctAnswer: 2,
    explanation: 'You can manually scale using kubectl scale or by editing YAML. HPA automates this based on metrics.',
    wrongExplanation: 'Multiple methods exist: manual scaling, YAML updates, and HPA for automatic scaling.',
    difficulty: 'intermediate',
    category: 'Kubernetes',
    xpReward: 15
  },
  {
    id: 'k8s-5',
    question: 'What is a Kubernetes Namespace used for?',
    options: [
      'Grouping containers in a Pod',
      'Virtual cluster isolation within a cluster',
      'Storing container images',
      'Managing network policies'
    ],
    correctAnswer: 1,
    explanation: 'Namespaces provide logical isolation, allowing multiple teams to use the same cluster safely.',
    wrongExplanation: 'Namespaces are for logical isolation and multi-tenancy, not container grouping or storage.',
    difficulty: 'beginner',
    category: 'Kubernetes',
    xpReward: 10
  },

  // CI/CD Questions
  {
    id: 'cicd-1',
    question: 'What is the main purpose of CI/CD pipelines?',
    options: [
      'To run tests on pull requests',
      'To automate build, test, and deployment processes',
      'To manage container registries',
      'To monitor application performance'
    ],
    correctAnswer: 1,
    explanation: 'CI/CD automates the entire lifecycle from code to production, ensuring quality and speed.',
    wrongExplanation: 'CI/CD encompasses testing, building, and deployment automation across the pipeline.',
    difficulty: 'beginner',
    category: 'CI/CD',
    xpReward: 10
  },
  {
    id: 'cicd-2',
    question: 'What does GitOps mean in the context of DevOps?',
    options: [
      'Using Git to manage DevOps tools',
      'Git as the single source of truth for infrastructure and deployment',
      'Git-based code reviews',
      'Using GitHub for CI/CD only'
    ],
    correctAnswer: 1,
    explanation: 'GitOps uses Git as the declarative source of truth for infrastructure and application state.',
    wrongExplanation: 'GitOps is a methodology where Git repositories define the desired infrastructure state.',
    difficulty: 'intermediate',
    category: 'CI/CD',
    xpReward: 15
  },
  {
    id: 'cicd-3',
    question: 'Which tool is commonly used for container orchestration?',
    options: [
      'Docker Compose',
      'Jenkins',
      'Kubernetes',
      'Terraform'
    ],
    correctAnswer: 2,
    explanation: 'Kubernetes is the industry standard for container orchestration at scale.',
    wrongExplanation: 'Kubernetes manages and orchestrates containers. Jenkins is for CI/CD, Terraform for IaC.',
    difficulty: 'beginner',
    category: 'CI/CD',
    xpReward: 10
  },
  {
    id: 'cicd-4',
    question: 'What is Infrastructure as Code (IaC)?',
    options: [
      'Writing code to deploy applications',
      'Managing infrastructure through code and version control',
      'Using containers for infrastructure',
      'Automating server configuration manually'
    ],
    correctAnswer: 1,
    explanation: 'IaC treats infrastructure as software, enabling version control and reproducible deployments.',
    wrongExplanation: 'IaC is about defining infrastructure declaratively in code, not just deployment automation.',
    difficulty: 'intermediate',
    category: 'CI/CD',
    xpReward: 15
  },
  {
    id: 'cicd-5',
    question: 'What is a Blue-Green deployment strategy?',
    options: [
      'Deploying to development then production',
      'Running two identical environments and switching traffic between them',
      'Using blue and green container colors for identification',
      'Splitting traffic between old and new versions'
    ],
    correctAnswer: 1,
    explanation: 'Blue-Green maintains two identical production environments, enabling instant rollbacks.',
    wrongExplanation: 'Blue-Green strategy uses parallel environments for zero-downtime deployments.',
    difficulty: 'intermediate',
    category: 'CI/CD',
    xpReward: 15
  },

  // Docker Questions
  {
    id: 'docker-1',
    question: 'What is a Docker image?',
    options: [
      'A running instance of a container',
      'A template containing code, runtime, and dependencies',
      'A storage location for container backups',
      'A network between containers'
    ],
    correctAnswer: 1,
    explanation: 'A Docker image is an immutable blueprint from which containers are instantiated.',
    wrongExplanation: 'Images are templates, while containers are instances. Images are not running processes.',
    difficulty: 'beginner',
    category: 'Docker',
    xpReward: 10
  },
  {
    id: 'docker-2',
    question: 'What does "docker build" do?',
    options: [
      'Starts a Docker container',
      'Pulls an image from a registry',
      'Creates an image from a Dockerfile',
      'Removes unused images'
    ],
    correctAnswer: 2,
    explanation: 'docker build creates an image by executing instructions in a Dockerfile.',
    wrongExplanation: 'docker build is the command to create images from Dockerfiles.',
    difficulty: 'beginner',
    category: 'Docker',
    xpReward: 10
  },
  {
    id: 'docker-3',
    question: 'What is Docker Compose used for?',
    options: [
      'Building Docker images',
      'Defining and running multi-container applications',
      'Managing Docker registries',
      'Securing Docker containers'
    ],
    correctAnswer: 1,
    explanation: 'Docker Compose simplifies running multiple interconnected containers with a single YAML file.',
    wrongExplanation: 'Compose orchestrates multi-container environments, not just a single container.',
    difficulty: 'intermediate',
    category: 'Docker',
    xpReward: 15
  },
  {
    id: 'docker-4',
    question: 'What is a Docker layer?',
    options: [
      'A security boundary',
      'An instruction in a Dockerfile that creates a new image layer',
      'A network interface',
      'A storage volume'
    ],
    correctAnswer: 1,
    explanation: 'Each Dockerfile instruction creates a layer, enabling efficient image caching and builds.',
    wrongExplanation: 'Layers are the result of Dockerfile instructions, enabling efficient builds and caching.',
    difficulty: 'intermediate',
    category: 'Docker',
    xpReward: 15
  },
  {
    id: 'docker-5',
    question: 'What is a Docker volume used for?',
    options: [
      'Storing Docker images',
      'Persisting data beyond container lifecycle',
      'Creating network connections',
      'Managing container CPU limits'
    ],
    correctAnswer: 1,
    explanation: 'Volumes provide persistent storage decoupled from container lifecycle.',
    wrongExplanation: 'Volumes persist data. Container-local storage is lost when containers stop.',
    difficulty: 'beginner',
    category: 'Docker',
    xpReward: 10
  },

  // Monitoring & Logging Questions
  {
    id: 'monitoring-1',
    question: 'What is the purpose of application monitoring?',
    options: [
      'To track code changes',
      'To observe application performance and health in real-time',
      'To store application logs',
      'To manage container images'
    ],
    correctAnswer: 1,
    explanation: 'Monitoring provides visibility into application performance, enabling proactive issue detection.',
    wrongExplanation: 'Monitoring is about observability and health checks, not just logging.',
    difficulty: 'beginner',
    category: 'Monitoring',
    xpReward: 10
  },
  {
    id: 'monitoring-2',
    question: 'What is a metric in observability?',
    options: [
      'A log message from an application',
      'A numerical measurement (e.g., CPU, memory, requests/sec)',
      'A distributed trace of requests',
      'An alert notification'
    ],
    correctAnswer: 1,
    explanation: 'Metrics are quantitative measurements tracked over time, enabling analysis and alerting.',
    wrongExplanation: 'Metrics are numerical data points, distinct from logs and traces.',
    difficulty: 'beginner',
    category: 'Monitoring',
    xpReward: 10
  },
  {
    id: 'monitoring-3',
    question: 'What is distributed tracing?',
    options: [
      'Logging all user requests',
      'Tracking requests across multiple services to understand latency and failures',
      'Monitoring CPU usage across servers',
      'Recording all API calls'
    ],
    correctAnswer: 1,
    explanation: 'Distributed tracing visualizes request flows across microservices, identifying bottlenecks.',
    wrongExplanation: 'Tracing follows requests through services, not just local logging.',
    difficulty: 'intermediate',
    category: 'Monitoring',
    xpReward: 15
  },
  {
    id: 'monitoring-4',
    question: 'What is Prometheus?',
    options: [
      'A log aggregation tool',
      'A time-series database for collecting metrics',
      'A container registry',
      'A CI/CD pipeline tool'
    ],
    correctAnswer: 1,
    explanation: 'Prometheus is a TSDB that scrapes metrics from instrumented applications.',
    wrongExplanation: 'Prometheus is for metrics collection and time-series data, not logging.',
    difficulty: 'intermediate',
    category: 'Monitoring',
    xpReward: 15
  },
  {
    id: 'monitoring-5',
    question: 'What is the main purpose of log aggregation?',
    options: [
      'To encrypt application logs',
      'To centralize logs from multiple sources for searching and analysis',
      'To backup container images',
      'To replicate databases'
    ],
    correctAnswer: 1,
    explanation: 'Log aggregation centralizes logs for better debugging and operational visibility.',
    wrongExplanation: 'Aggregation collects and centralizes logs for searchability and analysis.',
    difficulty: 'beginner',
    category: 'Monitoring',
    xpReward: 10
  },

  // Security Questions
  {
    id: 'security-1',
    question: 'What is RBAC in Kubernetes?',
    options: [
      'Role-Based Access Control for managing permissions',
      'Remote Backup and Continuous replication',
      'Registry-Based Artifact Caching',
      'Resource-Based Availability Checking'
    ],
    correctAnswer: 0,
    explanation: 'RBAC controls who can perform what actions on Kubernetes resources.',
    wrongExplanation: 'RBAC is Kubernetes role-based access control for authorization.',
    difficulty: 'intermediate',
    category: 'Security',
    xpReward: 15
  },
  {
    id: 'security-2',
    question: 'What is a network policy in Kubernetes?',
    options: [
      'A backup strategy',
      'A rule controlling traffic between Pods',
      'A monitoring alert',
      'A container image security scan'
    ],
    correctAnswer: 1,
    explanation: 'Network policies define ingress/egress rules for Pod-to-Pod communication.',
    wrongExplanation: 'Network policies control traffic flows, enforcing zero-trust networking.',
    difficulty: 'intermediate',
    category: 'Security',
    xpReward: 15
  },
  {
    id: 'security-3',
    question: 'What is container image scanning?',
    options: [
      'Monitoring container resource usage',
      'Analyzing images for vulnerabilities and malware',
      'Encrypting container layers',
      'Backing up container images'
    ],
    correctAnswer: 1,
    explanation: 'Image scanning detects security vulnerabilities before images reach production.',
    wrongExplanation: 'Scanning checks images for CVEs and security issues proactively.',
    difficulty: 'intermediate',
    category: 'Security',
    xpReward: 15
  },
  {
    id: 'security-4',
    question: 'What is the principle of least privilege in DevOps?',
    options: [
      'Giving all team members the same permissions',
      'Granting only minimum required permissions for tasks',
      'Disabling security features for convenience',
      'Using simple passwords for easier management'
    ],
    correctAnswer: 1,
    explanation: 'Least privilege limits access to only what is necessary, reducing attack surface.',
    wrongExplanation: 'Least privilege is a core security principle limiting unnecessary permissions.',
    difficulty: 'intermediate',
    category: 'Security',
    xpReward: 15
  },
  {
    id: 'security-5',
    question: 'What should you never do with container secrets?',
    options: [
      'Store them in environment variables at runtime',
      'Commit them to version control',
      'Log them in output',
      'All of the above'
    ],
    correctAnswer: 3,
    explanation: 'Never hardcode secrets in version control or logs. Use secret management tools.',
    wrongExplanation: 'All are dangerous practices. Always use secret management systems.',
    difficulty: 'beginner',
    category: 'Security',
    xpReward: 10
  },

  // AWS & Cloud Questions
  {
    id: 'aws-1',
    question: 'What is an EC2 instance?',
    options: [
      'A virtual private network',
      'A virtual machine in AWS',
      'A storage service',
      'A database service'
    ],
    correctAnswer: 1,
    explanation: 'EC2 provides scalable computing capacity in the AWS cloud.',
    wrongExplanation: 'EC2 is AWS compute service, not networking or storage.',
    difficulty: 'beginner',
    category: 'AWS',
    xpReward: 10
  },
  {
    id: 'aws-2',
    question: 'What is AWS Auto Scaling?',
    options: [
      'Automatically backing up data',
      'Automatically scaling resources based on demand',
      'Automatically updating security patches',
      'Automatically optimizing costs'
    ],
    correctAnswer: 1,
    explanation: 'Auto Scaling adjusts capacity to maintain performance and optimize costs.',
    wrongExplanation: 'Auto Scaling dynamically adjusts resource capacity based on metrics.',
    difficulty: 'intermediate',
    category: 'AWS',
    xpReward: 15
  },
  {
    id: 'aws-3',
    question: 'What is an AWS VPC?',
    options: [
      'A container image format',
      'A virtual isolated network in AWS',
      'A backup mechanism',
      'A database service'
    ],
    correctAnswer: 1,
    explanation: 'VPC provides network isolation and control over resources within AWS.',
    wrongExplanation: 'VPC is AWS networking service providing isolation and custom network configuration.',
    difficulty: 'intermediate',
    category: 'AWS',
    xpReward: 15
  },
  {
    id: 'aws-4',
    question: 'What is AWS Lambda?',
    options: [
      'A container orchestration service',
      'A serverless compute service',
      'A database service',
      'A storage service'
    ],
    correctAnswer: 1,
    explanation: 'Lambda runs code without managing servers, ideal for event-driven architectures.',
    wrongExplanation: 'Lambda is serverless compute, handling functions without infrastructure management.',
    difficulty: 'intermediate',
    category: 'AWS',
    xpReward: 15
  },
  {
    id: 'aws-5',
    question: 'What is AWS S3?',
    options: [
      'A compute service',
      'A database service',
      'Object storage service for scalable data storage',
      'A networking service'
    ],
    correctAnswer: 2,
    explanation: 'S3 is AWS object storage with high durability, availability, and scalability.',
    wrongExplanation: 'S3 is object storage service, not compute or networking.',
    difficulty: 'beginner',
    category: 'AWS',
    xpReward: 10
  },

  // Linux & System Administration
  {
    id: 'linux-1',
    question: 'What does "chmod 755" do?',
    options: [
      'Creates a new file',
      'Changes file permissions to rwxr-xr-x',
      'Changes file ownership',
      'Deletes a file'
    ],
    correctAnswer: 1,
    explanation: '755 gives owner full permissions, group and others read+execute.',
    wrongExplanation: 'chmod changes file permissions. 755 = rwxr-xr-x.',
    difficulty: 'beginner',
    category: 'Linux',
    xpReward: 10
  },
  {
    id: 'linux-2',
    question: 'What is a Linux cron job?',
    options: [
      'A user account type',
      'A task scheduler for automated recurring tasks',
      'A network configuration',
      'A file type'
    ],
    correctAnswer: 1,
    explanation: 'Cron executes commands at specified times, enabling automation.',
    wrongExplanation: 'Cron is Linux task scheduler for recurring automated jobs.',
    difficulty: 'intermediate',
    category: 'Linux',
    xpReward: 15
  },
  {
    id: 'linux-3',
    question: 'What is systemd?',
    options: [
      'A programming language',
      'System and service manager on modern Linux systems',
      'A container runtime',
      'A package manager'
    ],
    correctAnswer: 1,
    explanation: 'systemd is the init system managing services and system startup.',
    wrongExplanation: 'systemd manages system services and startup processes in modern Linux.',
    difficulty: 'intermediate',
    category: 'Linux',
    xpReward: 15
  },
  {
    id: 'linux-4',
    question: 'What is the purpose of /etc/sudoers?',
    options: [
      'Storing user passwords',
      'Defining sudo privilege rules',
      'Storing environment variables',
      'Managing user groups'
    ],
    correctAnswer: 1,
    explanation: 'sudoers file controls which users can execute commands with sudo.',
    wrongExplanation: '/etc/sudoers controls sudo privileges and access rules.',
    difficulty: 'intermediate',
    category: 'Linux',
    xpReward: 15
  },
  {
    id: 'linux-5',
    question: 'What does "top" command do?',
    options: [
      'Lists files in a directory',
      'Shows running processes and system resource usage',
      'Changes to root directory',
      'Displays file contents'
    ],
    correctAnswer: 1,
    explanation: 'top provides real-time process and resource monitoring.',
    wrongExplanation: 'top monitors processes and system resources interactively.',
    difficulty: 'beginner',
    category: 'Linux',
    xpReward: 10
  }
];

// --- Local Hashing and Seen Questions Duplicate Protection ---

function calculateSimpleHash(text: string): string {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

function getSeenQuestionHashes(): Set<string> {
  const set = new Set<string>();
  if (typeof window === 'undefined') return set;
  
  try {
    const stored = localStorage.getItem('seen_quiz_question_hashes');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach(h => set.add(h));
      }
    }
  } catch (e) {
    console.warn('Failed to load seen question hashes', e);
  }
  return set;
}

function saveSeenQuestionHashes(hashes: Set<string>) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('seen_quiz_question_hashes', JSON.stringify(Array.from(hashes)));
  } catch (e) {
    console.warn('Failed to save seen question hashes', e);
  }
}

// Generate questions directly via OpenAI proxy on-the-fly in browser
async function generateClientSideAIQuestions(count: number = 7): Promise<QuizQuestion[]> {
  const categories = [
    'Kubernetes', 'CI/CD', 'Docker', 'Monitoring', 'Security',
    'AWS', 'Linux', 'Terraform', 'Networking', 'DevOps Tools'
  ];
  
  const prompt = `Generate exactly ${count} unique multiple-choice questions for DevOps professionals.
Each question must be about one of these categories: ${categories.join(', ')}.
Each question must have a random difficulty: beginner, intermediate, or advanced.

Requirements for each question:
1. Must be unique, realistic, and test practical DevOps knowledge.
2. Provide exactly 4 options.
3. Avoid Yes/No questions.
4. Ensure the correct option is highly accurate and wrong options are plausible.
5. Provide a helpful explanation for the correct answer, and a brief insight on the wrong options.

Format your response as a valid JSON array of objects only (do NOT wrap in markdown code blocks like \`\`\`json, do NOT include any introductory or concluding text, just start with [ and end with ]):
[
  {
    "question": "Your question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this is correct in 1-2 sentences",
    "wrongExplanation": "Why the wrong answers matter or common misconceptions in 1-2 sentences",
    "difficulty": "intermediate",
    "category": "Kubernetes",
    "xpReward": 15
  }
]`;

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
          content: 'You are a DevOps expert creating high-quality quiz questions. Return ONLY a valid JSON array of questions, no markdown, no conversational text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000,
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI proxy returned status ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }

  const content = data.choices?.[0]?.message?.content || '';
  const cleanedContent = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const parsed = JSON.parse(cleanedContent);
  if (!Array.isArray(parsed)) {
    throw new Error('AI response is not a JSON array');
  }

  return parsed.map((q: any) => ({
    question: q.question || q.question_text || '',
    question_text: q.question || q.question_text || '',
    options: Array.isArray(q.options) ? q.options : [],
    correctAnswer: q.correctAnswer ?? q.correct_answer_index ?? 0,
    correct_answer_index: q.correctAnswer ?? q.correct_answer_index ?? 0,
    explanation: q.explanation || '',
    wrongExplanation: q.wrongExplanation || q.wrong_explanation || '',
    wrong_explanation: q.wrongExplanation || q.wrong_explanation || '',
    difficulty: q.difficulty || 'intermediate',
    category: q.category || 'General',
    xpReward: q.xpReward ?? q.xp_reward ?? (q.difficulty === 'beginner' ? 10 : 15),
    xp_reward: q.xpReward ?? q.xp_reward ?? (q.difficulty === 'beginner' ? 10 : 15),
  }));
}

// Check local storage for today's pool, otherwise generate brand new questions from AI
async function getOrCreateClientSideAIQuestions(): Promise<QuizQuestion[]> {
  if (typeof window === 'undefined') return [];

  const todayStr = new Date().toISOString().split('T')[0];
  const cacheKey = 'daily_quiz_pool_local';
  
  // Check if we already generated today's questions locally
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.date === todayStr && Array.isArray(parsed.questions) && parsed.questions.length >= 5) {

        return parsed.questions;
      }
    } catch (e) {
      console.warn('Failed to parse cached daily quiz pool', e);
    }
  }

  // Generate fresh daily quiz questions via AI
  // Generate 7 questions to allow filtering out potential duplicates
  const generated = await generateClientSideAIQuestions(7);
  
  if (!generated || generated.length === 0) {
    throw new Error('No questions generated by AI');
  }

  // Filter duplicates
  const seenHashes = getSeenQuestionHashes();
  const uniqueQuestions: QuizQuestion[] = [];

  for (const q of generated) {
    if (uniqueQuestions.length >= 5) break;

    const hash = calculateSimpleHash(q.question || '');
    if (!seenHashes.has(hash)) {
      uniqueQuestions.push(q);
      seenHashes.add(hash);
    } else {
      console.warn('Skipping duplicate AI-generated question:', q.question);
    }
  }

  // If we couldn't get 5 unique ones, just fill up with whatever we have
  if (uniqueQuestions.length < 5) {
    for (const q of generated) {
      if (uniqueQuestions.length >= 5) break;
      if (!uniqueQuestions.some(uq => uq.question === q.question)) {
        uniqueQuestions.push(q);
      }
    }
  }

  // Assign stable IDs
  const finalQuestions = uniqueQuestions.map((q, idx) => ({
    ...q,
    id: `ai-local-${todayStr}-${idx}`,
  }));

  // Save to seen hashes
  saveSeenQuestionHashes(seenHashes);

  // Save to daily pool cache
  localStorage.setItem(cacheKey, JSON.stringify({
    date: todayStr,
    questions: finalQuestions
  }));

  return finalQuestions;
}

function getRandomFallbackQuestions(count: number): QuizQuestion[] {
  const shuffled = [...FALLBACK_QUESTIONS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(normalizeQuestion);
}

/**
 * Get 5 questions for today's quiz from AI-generated pool.
 * Tries Supabase first. If database tables do not exist or fail, it
 * generates questions on-the-fly via AI proxy with client-side duplicate protection.
 */
export async function getDailyQuestions(): Promise<QuizQuestion[]> {
  try {
    // 1. Try to fetch AI-generated questions for today from Supabase
    const generatedQuestions = await getTodaysQuizQuestions();

    if (generatedQuestions && generatedQuestions.length >= 5) {

      return generatedQuestions
        .slice(0, 5)
        .map(normalizeQuestion);
    }
  } catch (err) {
    console.error('Error fetching generated questions from Supabase, trying client-side AI:', err);
  }

  // 2. Try client-side on-the-fly AI generation with duplicate protection via LocalStorage
  try {
    const localQuestions = await getOrCreateClientSideAIQuestions();
    if (localQuestions && localQuestions.length >= 5) {
      return localQuestions;
    }
  } catch (err) {
    console.error('Error generating client-side AI questions:', err);
  }

  // 3. Last resort fallback: return randomized predefined questions
  console.warn('AI generation failed completely, falling back to randomized predefined questions');
  return getRandomFallbackQuestions(5);
}

/**
 * Calculate total possible XP for daily quiz
 */
export function calculateDailyQuizXp(questions: QuizQuestion[]): number {
  return questions.reduce((sum, q) => {
    const xp = q.xpReward || q.xp_reward || 10;
    return sum + xp;
  }, 0);
}

/**
 * Get a single question by ID
 */
export async function getQuestionById(questionId: string): Promise<QuizQuestion | null> {
  try {
    // Check local storage pool first if it is a local AI question
    if (questionId.startsWith('ai-local-') && typeof window !== 'undefined') {
      const cached = localStorage.getItem('daily_quiz_pool_local');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.questions) {
          const found = parsed.questions.find((q: QuizQuestion) => q.id === questionId);
          if (found) return found;
        }
      }
    }

    const questions = await getTodaysQuizQuestions();
    const found = questions.find(q => q.id === questionId);
    return found ? normalizeQuestion(found) : null;
  } catch (err) {
    console.error('Error fetching question:', err);
    return null;
  }
}
