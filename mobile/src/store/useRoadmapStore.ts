import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface RoadmapNode {
  id: string;
  title: string;
  type: 'lab' | 'reading' | 'interview' | 'quiz';
  status: 'locked' | 'unlocked' | 'completed';
  xp: number;
  description: string;
}

export interface Roadmap {
  id: string;
  title: string;
  nodes: RoadmapNode[];
}

interface RoadmapState {
  roadmaps: Roadmap[];
  loading: boolean;
  fetchRoadmaps: () => Promise<void>;
  completeNode: (nodeId: string, xp: number) => Promise<void>;
}

export const useRoadmapStore = create<RoadmapState>((set, get) => ({
  roadmaps: [],
  loading: false,
  fetchRoadmaps: async () => {
    set({ loading: true });
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('roadmap_data, completed_roadmap_tasks')
        .single();

      if (error) {
        console.warn('Failed to fetch roadmap:', error.message);
        throw error;
      }

      if (profile?.roadmap_data) {
        try {
          // Assuming roadmap_data is a JSON string or we parse it
          const parsedData = JSON.parse(profile.roadmap_data);
          const completedTasks = profile.completed_roadmap_tasks || [];

          // Map status based on completion
          const nodesWithStatus = parsedData.nodes.map((node: any) => ({
            ...node,
            status: completedTasks.includes(node.id) 
              ? 'completed' 
              : (node.id === '1' || completedTasks.length > 0 ? 'unlocked' : 'locked')
          }));

          set({ roadmaps: [{ ...parsedData, nodes: nodesWithStatus }], loading: false });
        } catch (parseError) {
          console.warn('Error parsing roadmap data:', parseError);
          throw parseError;
        }
      } else {
        // Mock data for initial state if nothing in DB
        set({
          roadmaps: [
            {
              id: 'devops-beginner',
              title: 'DevOps Beginner',
              nodes: [
                { id: '1', title: 'Linux Fundamentals', type: 'reading', status: 'unlocked', xp: 100, description: 'Learn the terminal' },
                { id: '2', title: 'Docker Basics', type: 'lab', status: 'locked', xp: 200, description: 'Containers 101' },
                { id: '3', title: 'Kubernetes Introduction', type: 'lab', status: 'locked', xp: 300, description: 'Orchestration basics' },
                { id: '4', title: 'CI/CD Pipelines', type: 'quiz', status: 'locked', xp: 150, description: 'Automation flows' },
                { id: '5', title: 'Cloud Infrastructure', type: 'interview', status: 'locked', xp: 500, description: 'AWS/GCP basics' },
              ]
            }
          ],
          loading: false
        });
      }
    } catch (err) {
      console.warn('Roadmap fetch error:', err);
      // Fallback to mock data
      set({
        roadmaps: [
          {
            id: 'devops-beginner',
            title: 'DevOps Beginner',
            nodes: [
              { id: '1', title: 'Linux Fundamentals', type: 'reading', status: 'unlocked', xp: 100, description: 'Learn the terminal' },
              { id: '2', title: 'Docker Basics', type: 'lab', status: 'locked', xp: 200, description: 'Containers 101' },
              { id: '3', title: 'Kubernetes Introduction', type: 'lab', status: 'locked', xp: 300, description: 'Orchestration basics' },
              { id: '4', title: 'CI/CD Pipelines', type: 'quiz', status: 'locked', xp: 150, description: 'Automation flows' },
              { id: '5', title: 'Cloud Infrastructure', type: 'interview', status: 'locked', xp: 500, description: 'AWS/GCP basics' },
            ]
          }
        ],
        loading: false
      });
    }
  },
  completeNode: async (nodeId, xp) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.warn('User not authenticated');
        return;
      }

      // Call the secure RPC function defined in migrations
      const { error, data } = await supabase.rpc('complete_lab_securely', {
        lab_id_input: nodeId,
        xp_gain_input: xp
      });

      if (error) {
        console.warn('Failed to complete node:', error.message);
        return;
      }

      if (!error) {
        // Update local state
        const currentRoadmaps = get().roadmaps;
        const updatedRoadmaps = currentRoadmaps.map(rm => ({
          ...rm,
          nodes: rm.nodes.map(n => n.id === nodeId ? { ...n, status: 'completed' as const } : n)
        }));
        set({ roadmaps: updatedRoadmaps });
      }
    } catch (err) {
      console.warn('Error completing node:', err);
    }
  }
}));
