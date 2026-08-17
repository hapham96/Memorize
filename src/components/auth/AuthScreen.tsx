'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { login, register, MIN_PASSWORD_LENGTH } from '@/lib/api/auth-client';
import { ApiError } from '@/lib/api/client';
import { AuthSession } from '@/types/auth';

interface AuthScreenProps {
  /** Only ever called with a real session — the app has no signed-out mode. */
  onLoginSuccess: (session: AuthSession, displayName: string) => void;
  onBack: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  onBack,
  initialMode = 'login',
}) => {
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = () => name.trim() || email.split('@')[0] || 'Bạn';

  const switchMode = () => {
    setIsRegister((prev) => !prev);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);

    const trimmedEmail = email.trim();
    if (isRegister && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const credentials = { email: trimmedEmail, password };
      const session = isRegister ? await register(credentials) : await login(credentials);
      onLoginSuccess(session, displayName());
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        // No offline bypass: every feature needs the account, so the only way
        // forward is to retry once the server is reachable.
        setError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col justify-between p-6 bg-slate-50 dark:bg-slate-900">
      {/* Top Bar */}
      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onBack}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          ← Quay lại
        </button>
      </div>

      {/* Form Container */}
      <div className="my-auto py-4">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-clay-glow">
            M
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isRegister ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRegister
              ? 'Tạo tài khoản để bắt đầu xây dựng kho từ của riêng bạn'
              : 'Đăng nhập để tiếp tục kho từ và tiến độ ôn tập của bạn'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 max-w-sm mx-auto">
          {isRegister && (
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Họ và tên"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-input bg-slate-100 dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-inset text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="email"
              placeholder="Địa chỉ email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-input bg-slate-100 dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-inset text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="password"
              placeholder={isRegister ? `Mật khẩu (tối thiểu ${MIN_PASSWORD_LENGTH} ký tự)` : 'Mật khẩu'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-input bg-slate-100 dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-inset text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength={isRegister ? MIN_PASSWORD_LENGTH : undefined}
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-input bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs font-medium whitespace-pre-line">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-button bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 active:shadow-clay-inset active:scale-[0.97] active:shadow-clay-inset disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 text-white font-semibold text-sm shadow-clay flex items-center justify-center gap-2 transition-all mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isRegister ? 'Đang tạo tài khoản…' : 'Đang đăng nhập…'}</span>
              </>
            ) : (
              <>
                <span>{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

        <p className="text-[11px] text-center text-slate-400 mt-5 max-w-sm mx-auto leading-relaxed">
          Kho từ và tiến độ ôn tập được lưu theo tài khoản, nên bạn cần đăng nhập
          để sử dụng ứng dụng.
        </p>
      </div>

      {/* Footer Toggle */}
      <div className="text-center pb-4">
        <button
          onClick={switchMode}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          {isRegister ? (
            <>Đã có tài khoản? <span className="font-bold underline">Đăng nhập</span></>
          ) : (
            <>Chưa có tài khoản? <span className="font-bold underline">Đăng ký ngay</span></>
          )}
        </button>
      </div>
    </div>
  );
};
