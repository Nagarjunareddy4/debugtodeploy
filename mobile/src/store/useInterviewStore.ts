import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface InterviewMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: number;
}

interface InterviewState {
  messages: InterviewMessage[];
  isInterviewing: boolean;
  score: number | null;
  loading: boolean;
  startInterview: (topic: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  endInterview: () => void;
  resetInterview: () => void;
  backToHub: () => void;
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  messages: [],
  isInterviewing: false,
  score: null,
  loading: false,
  startInterview: async (topic) => {
    set({ 
      isInterviewing: true, 
      messages: [{ 
        id: '1', 
        role: 'ai', 
        content: `Welcome to your ${topic} mock interview. I am your AI interviewer. Let's start. Can you explain the difference between a Container and a Virtual Machine?`, 
        timestamp: Date.now() 
      }],
      score: null
    });
  },
  sendMessage: async (content) => {
    const newMessage: InterviewMessage = { id: Date.now().toString(), role: 'user', content, timestamp: Date.now() };
    set(state => ({ messages: [...state.messages, newMessage], loading: true }));

    // Simulate AI Response
    setTimeout(() => {
      const aiResponse: InterviewMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        content: "That's a good start. Follow-up: How does Docker handle storage persistence?", 
        timestamp: Date.now() 
      };
      set(state => ({ messages: [...state.messages, aiResponse], loading: false }));
    }, 1500);
  },
  endInterview: () => {
    set({ isInterviewing: false, score: 85 }); // Mock score
  },
  resetInterview: () => {
    set({ isInterviewing: false, messages: [], score: null, loading: false });
  },
  backToHub: () => {
    set({ score: null, messages: [], isInterviewing: false });
  }
}));
