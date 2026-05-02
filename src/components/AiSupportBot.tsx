import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, Brain, User, Bot, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isLimitReached, incrementUsage, getLimitMessage } from '../lib/usageLimit';
import { cn } from '../lib/utils';

export default function AiSupportBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'bot', text: string }>>([
    { role: 'bot', text: "Hello, Captain! I'm the DebugToDeploy AI Support. How can I assist your mission today?" }
  ]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
          setProfile({ ...data, email: user.email });
        });
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      // Lock scroll on mobile when chat is full screen
      if (window.innerWidth < 640) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [chatHistory, isBotTyping, isOpen]);

  const handleSendChat = async () => {
    const text = chatMessage.trim();
    if (!text) return;

    const isPro = profile?.subscription_status === 'pro';
    if (isLimitReached('chat', isPro)) {
      alert(getLimitMessage('chat', isPro));
      return;
    }

    setChatHistory(prev => [...prev, { role: 'user', text }]);
    setChatMessage('');
    setIsBotTyping(true);

    try {
      const systemPrompt = `You are the DebugToDeploy Support Bot. You are an expert on the DebugToDeploy platform. 
      DebugToDeploy is an AI-accelerated learning platform for DevOps, SRE, and Cloud Engineers.
      Features: AI-powered Roadmaps, Interactive Cloud Labs, AI Mock Interviews, and Professional Portfolios.
      Built by Nagarjunareddy Annapureddy.
      Subscription & Limits: 
      - Free: 1 AI Roadmap/week, 2 AI Searches/day, 1 Mock Interview/week, 3 Support Chats/day.
      - Pro: 100 AI Roadmaps/month, Unlimited Search, Unlimited Interviews, 50 Support Chats/day.
      Payment: Razorpay.
      
      STRICT RULES:
      1. ONLY answer questions about the DebugToDeploy platform, DevOps, SRE, Cloud Engineering, or related technical concepts.
      2. If a user asks about anything else, say: "I am specifically programmed to assist with DebugToDeploy and DevOps engineering missions. Please focus on your deployment journey."
      3. Keep replies short (1-2 sentences max).
      4. Be interactive, one-to-one, and professional.
      5. If complex, say: 'Please submit a Support Request on our Support page so our squad can assist you directly.'`;

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
            { role: 'system', content: systemPrompt },
            ...chatHistory.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text })),
            { role: 'user', content: text }
          ],
          max_tokens: 150,
        }),
      });

      const data = await response.json();
      const botText = data.choices?.[0]?.message?.content || "No intelligence received. Please try again.";

      setChatHistory(prev => [...prev, { role: 'bot', text: botText }]);
      incrementUsage('chat', isPro);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'bot', text: "Signal lost. Please try again or visit the Support page." }]);
    } finally {
      setIsBotTyping(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-[100] no-print">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "bg-surface shadow-3xl border-border/50 overflow-hidden flex flex-col transition-all duration-300",
              "fixed inset-0 z-[110] sm:absolute sm:inset-auto sm:bottom-full sm:right-0 sm:mb-6 sm:w-[400px] sm:h-[600px] sm:rounded-[2.5rem] sm:border-4 sm:border-soft-purple/20"
            )}
          >
            {/* Header */}
            <div className="p-6 bg-surface border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-soft-purple/10 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-soft-purple" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight">AI Support Squad</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-soft-green animate-pulse" />
                    <span className="text-[8px] font-black text-soft-green uppercase tracking-widest">Active</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-brand-bg rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-text-dim" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    msg.role === 'user' ? "bg-soft-blue/10" : "bg-soft-purple/10"
                  )}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-soft-blue" /> : <Bot className="w-4 h-4 text-soft-purple" />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] p-4 rounded-2xl text-xs font-bold leading-relaxed",
                    msg.role === 'user'
                      ? "bg-text-main text-surface rounded-tr-none"
                      : "bg-brand-bg text-text-main rounded-tl-none border border-border shadow-sm"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isBotTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-soft-purple/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-soft-purple" />
                  </div>
                  <div className="bg-brand-bg border border-border p-4 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 rounded-full bg-soft-purple" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 rounded-full bg-soft-purple" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 rounded-full bg-soft-purple" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-surface border-t border-border">
              <div className="relative">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Ask about platform, DevOps..."
                  className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 pr-16 font-bold outline-none focus:border-soft-purple transition-colors text-xs"
                />
                <button
                  onClick={handleSendChat}
                  disabled={isBotTyping || !chatMessage.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-soft-purple text-white rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1, rotate: -5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all overflow-hidden group",
          isOpen ? "bg-text-main text-surface" : "bg-soft-purple text-white"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <X className="w-8 h-8" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Bot className="w-8 h-8" />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1"
              >
                <Sparkles className="w-4 h-4 text-soft-orange" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
