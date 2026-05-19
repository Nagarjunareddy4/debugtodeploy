/**
 * RoadmapBadge3D
 * 
 * Renders a 3D badge icon based on the roadmap stage name.
 * Uses official Microsoft Fluent UI 3D emoji assets as the primary source
 * since they are free, CDN-hosted, and look premium.
 * 
 * Badge icons are matched intelligently from the stage label keywords,
 * so any AI-generated roadmap (Docker, K8s, Cloud, Security etc.) automatically
 * gets the right themed badge.
 */

import React, { useState } from 'react';

const BADGE_MAP: Array<{ keywords: string[]; src: string }> = [
  {
    // Prioritize Kubernetes and Containers as they are most common in DevOps
    keywords: ['kubernetes', 'k8s', 'orchestrat', 'helm', 'pod', 'cluster', 'kubectl', 'k3s', 'minikube', 'kube', 'container', 'docker'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Steering%20Wheel/3D/steering_wheel_3d.png',
  },
  {
    keywords: ['whale', 'docker', 'containerize', 'image', 'compose', 'podman', 'runtime'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Whale/3D/whale_3d.png',
  },
  {
    keywords: ['cloud', 'aws', 'azure', 'gcp', 'infra', 'terraform', 'server', 'ec2', 's3', 'lambda', 'serverless', 'provision', 'vpc', 'iam'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Cloud/3D/cloud_3d.png',
  },
  {
    keywords: ['pipeline', 'ci', 'cd', 'cicd', 'deploy', 'github action', 'jenkins', 'gitops', 'argocd', 'spinnaker', 'automation', 'workflow'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rocket/3D/rocket_3d.png',
  },
  {
    keywords: ['security', 'devsecops', 'protect', 'vault', 'auth', 'iam', 'secret', 'sso', 'scan', 'siem', 'hardening', 'compliance', 'firewall'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Shield/3D/shield_3d.png',
  },
  {
    keywords: ['git', 'version', 'branch', 'github', 'gitlab', 'bitbucket', 'commit', 'merge', 'repo', 'scm'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Link/3D/link_3d.png',
  },
  {
    keywords: ['monitor', 'metric', 'log', 'grafana', 'prometheus', 'observ', 'alert', 'elk', 'datadog', 'sre', 'loki', 'tracing', 'dashboard'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bar%20Chart/3D/bar_chart_3d.png',
  },
  {
    keywords: ['network', 'api', 'service', 'dns', 'mesh', 'istio', 'ingress', 'gateway', 'load balanc', 'nginx', 'proxy', 'http', 'grpc', 'tcp'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Globe%20with%20Meridians/3D/globe_with_meridians_3d.png',
  },
  {
    keywords: ['automate', 'script', 'python', 'bash', 'ansible', 'puppet', 'chef', 'robot', 'bot', 'iac', 'playbook', 'shell', 'coding'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Robot/3D/robot_3d.png',
  },
  {
    keywords: ['foundation', 'basic', 'beginner', 'intro', 'start', 'linux', 'os', 'computer', 'networking fundamental', 'pre-req', 'setup', 'environment'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Seedling/3D/seedling_3d.png',
  },
  {
    keywords: ['database', 'sql', 'postgres', 'mysql', 'redis', 'mongo', 'db', 'dynamo', 'data', 'storage', 'persistence'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/File%20Cabinet/3D/file_cabinet_3d.png',
  },
  {
    keywords: ['test', 'qa', 'quality', 'unit', 'integration', 'e2e', 'selenium', 'cypress', 'validation'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Magnifying%20Glass%20Tilted%20Left/3D/magnifying_glass_tilted_left_3d.png',
  },
  {
    keywords: ['certif', 'award', 'achiev', 'master', 'complet', 'expert', 'final', 'advanced', 'senior', 'leader', 'conclusion'],
    src: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png',
  },
];

const FALLBACK_SRC = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png';

export function getBadgeImageSrc(stageName: string, description?: string, tasks?: Array<{ label: string; url: string } | string>): string {
  if (!stageName) return FALLBACK_SRC;
  const lowerName = stageName.toLowerCase();
  const lowerDesc = description?.toLowerCase() || '';
  const lowerTasks = tasks?.map(t => (typeof t === 'string' ? t : t.label).toLowerCase()).join(' ') || '';
  
  // Debug log to help identify why matches might be failing


  for (const entry of BADGE_MAP) {
    const match = entry.keywords.find(keyword => 
      lowerName.includes(keyword) || 
      lowerDesc.includes(keyword) ||
      lowerTasks.includes(keyword)
    );
    
    if (match) {

      return entry.src;
    }
  }
  

  return FALLBACK_SRC;
}

interface RoadmapBadge3DProps {
  stageName: string;
  description?: string;
  tasks?: Array<{ label: string; url: string } | string>;
  earned?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showGlow?: boolean;
}

export function RoadmapBadge3D({
  stageName,
  description,
  tasks,
  earned = false,
  size = 'md',
  className = '',
  showGlow = true,
}: RoadmapBadge3DProps) {
  const [imgError, setImgError] = useState(false);
  const src = imgError ? FALLBACK_SRC : getBadgeImageSrc(stageName, description, tasks);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
  };

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      <img
        src={src}
        alt={stageName}
        onError={() => setImgError(true)}
        className={`
          w-full h-full object-contain 
          group-hover:scale-110 transition-transform duration-500
          ${!earned ? 'grayscale opacity-40' : 'drop-shadow-2xl'}
        `}
      />
      {/* Holographic glow for earned badges */}
      {earned && showGlow && (
        <div className="absolute -inset-2 bg-soft-orange/20 blur-2xl -z-10 animate-pulse rounded-full" />
      )}
    </div>
  );
}

export default RoadmapBadge3D;
