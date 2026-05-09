import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function ConsentCheckbox({ checked, onChange, disabled }: ConsentCheckboxProps) {
  return (
    <div className={cn(
      "flex items-start gap-4 p-4 rounded-2xl transition-all border-2",
      checked 
        ? "bg-soft-blue/5 border-soft-blue/20" 
        : "bg-surface border-border hover:border-soft-blue/10",
      disabled && "opacity-50 cursor-not-allowed"
    )}>
      <div className="relative flex items-center pt-0.5">
        <input
          id="consent-checkbox"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-border bg-surface transition-all checked:border-soft-blue checked:bg-soft-blue focus:outline-none disabled:cursor-not-allowed"
        />
        <ShieldCheck 
          className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 text-surface opacity-0 transition-opacity peer-checked:opacity-100" 
        />
      </div>
      
      <label 
        htmlFor="consent-checkbox" 
        className="text-xs font-bold text-text-dim leading-relaxed cursor-pointer select-none"
      >
        I have read and agree to the{' '}
        <a 
          href="/privacy" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-soft-blue hover:text-text-main transition-colors inline-flex items-center gap-1 underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          Privacy Policy
        </a>
        {' '}and{' '}
        <a 
          href="/terms" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-soft-blue hover:text-text-main transition-colors inline-flex items-center gap-1 underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          Terms & Conditions
        </a>
        .
      </label>
    </div>
  );
}
