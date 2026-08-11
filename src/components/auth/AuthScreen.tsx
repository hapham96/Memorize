'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Apple, Globe } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (name: string) => void;
  onBack: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, onBack }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userName = name.trim() || email.split('@')[0] || 'Hao';
    onLoginSuccess(userName);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50 dark:bg-slate-900">
      {/* Top Bar */}
      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onBack}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          ← Back
        </button>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
          Apple Design
        </span>
      </div>

      {/* Form Container */}
      <div className="my-auto py-4">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-apple-glow">
            M
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRegister ? 'Start your vocabulary journey today' : 'Sign in to sync your English progress'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 max-w-sm mx-auto">
          {isRegister && (
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-input bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-input bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-input bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-button bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm shadow-apple-card flex items-center justify-center gap-2 transition-all mt-2"
          >
            <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs text-slate-400 font-medium">Or continue with</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* Social Logins */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          <button
            onClick={() => onLoginSuccess('Hao')}
            className="py-3 rounded-button bg-slate-900 text-white hover:bg-slate-800 font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Apple className="w-4 h-4 fill-white" />
            <span>Apple</span>
          </button>

          <button
            onClick={() => onLoginSuccess('Hao')}
            className="py-3 rounded-button bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Globe className="w-4 h-4 text-blue-500" />
            <span>Google</span>
          </button>
        </div>
      </div>

      {/* Footer Toggle */}
      <div className="text-center pb-4">
        <button
          onClick={() => setIsRegister(!isRegister)}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          {isRegister ? (
            <>Already have an account? <span className="font-bold underline">Sign In</span></>
          ) : (
            <>Don't have an account? <span className="font-bold underline">Create one</span></>
          )}
        </button>
      </div>
    </div>
  );
};
