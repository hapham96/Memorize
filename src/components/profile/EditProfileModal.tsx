'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  MIN_PASSWORD_LENGTH,
  updateName,
  updatePassword,
} from '@/lib/api/auth-client';
import { ApiError } from '@/lib/api/client';
import { AuthSession } from '@/types/auth';
import { ModalPortal } from '@/components/layout/ModalPortal';

interface EditProfileModalProps {
  /** The name currently on screen — what the field starts from. */
  currentName: string;
  /** Shown read-only: there is no endpoint to change the account's email. */
  email: string;
  onClose: () => void;
  /** Called with the session `PATCH /users/name` produced, never with a guess. */
  onNameUpdated: (session: AuthSession) => void;
}

const baseInputClass =
  'w-full pl-11 py-3 rounded-input bg-slate-100 dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 shadow-clay-inset text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const inputClass = `${baseInputClass} pr-4`;
/** Leaves room for the show/hide eye button pinned to the right edge. */
const passwordInputClass = `${baseInputClass} pr-12`;

/** Both forms report failures the same way; only the fallback copy differs. */
const describeError = (err: unknown, fallback: string): string => {
  if (err instanceof ApiError && err.isNetworkError) {
    return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  }
  if (err instanceof ApiError) return err.message;
  return fallback;
};

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  currentName,
  email,
  onClose,
  onNameUpdated,
}) => {
  const [name, setName] = useState(currentName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleSubmitName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingName) return;

    setNameError(null);
    setNameSaved(false);

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Vui lòng nhập tên hiển thị.');
      return;
    }
    if (trimmed === currentName.trim()) {
      setNameError('Tên hiển thị chưa thay đổi.');
      return;
    }

    setIsSavingName(true);
    try {
      const session = await updateName(trimmed);
      if (session) onNameUpdated(session);
      setName(trimmed);
      setNameSaved(true);
    } catch (err) {
      setNameError(describeError(err, 'Không cập nhật được tên. Vui lòng thử lại.'));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingPassword) return;

    setPasswordError(null);
    setPasswordSaved(false);

    // Surrounding whitespace is a paste artefact — trim what is validated and
    // what is sent alike, exactly as the sign-in form does.
    const current = currentPassword.trim();
    const next = newPassword.trim();

    if (!current) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      return;
    }
    if (next === current) {
      setPasswordError('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }
    if (next !== confirmPassword.trim()) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await updatePassword({ currentPassword: current, newPassword: next });
      // Nothing may stay in the fields — the modal remains open behind them.
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(
        describeError(err, 'Không đổi được mật khẩu. Vui lòng thử lại.')
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[32px] p-6 md:p-8 shadow-clay-xl border-clay border-blue-200 dark:border-slate-700 space-y-6 animate-scaleUp max-h-[90dvh] overflow-y-auto overscroll-contain">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Chỉnh sửa tài khoản
            </h3>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Email — read-only, there is no endpoint to change it */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                value={email}
                readOnly
                disabled
                className={`${inputClass} opacity-70 cursor-not-allowed`}
              />
            </div>
          </div>

          {/* Display name */}
          <form onSubmit={handleSubmitName} className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tên hiển thị
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Họ và tên"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                  setNameSaved(false);
                }}
                className={inputClass}
                maxLength={100}
              />
            </div>

            {nameError && (
              <div className="flex items-start gap-2 p-3 rounded-input bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs font-medium whitespace-pre-line">{nameError}</p>
              </div>
            )}

            {nameSaved && !nameError && (
              <div className="flex items-center gap-2 p-3 rounded-input bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
                <Check className="w-4 h-4 shrink-0" />
                <p className="text-xs font-medium">Đã cập nhật tên hiển thị.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingName}
              className="w-full py-3 rounded-button bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 active:shadow-clay-inset active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 text-white font-semibold text-sm shadow-clay flex items-center justify-center gap-2 transition-all"
            >
              {isSavingName ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu…</span>
                </>
              ) : (
                <span>Lưu tên hiển thị</span>
              )}
            </button>
          </form>

          <div className="h-px bg-slate-200 dark:bg-slate-700" />

          {/* Password */}
          <form onSubmit={handleSubmitPassword} className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Đổi mật khẩu
            </label>

            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type={showCurrent ? 'text' : 'password'}
                placeholder="Mật khẩu hiện tại"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordError(null);
                  setPasswordSaved(false);
                }}
                autoComplete="current-password"
                className={passwordInputClass}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((prev) => !prev)}
                aria-label={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-2 top-1.5 p-2 rounded-input text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type={showNew ? 'text' : 'password'}
                placeholder={`Mật khẩu mới (tối thiểu ${MIN_PASSWORD_LENGTH} ký tự)`}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError(null);
                  setPasswordSaved(false);
                }}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                className={passwordInputClass}
              />
              <button
                type="button"
                onClick={() => setShowNew((prev) => !prev)}
                aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-2 top-1.5 p-2 rounded-input text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError(null);
                  setPasswordSaved(false);
                }}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            {passwordError && (
              <div className="flex items-start gap-2 p-3 rounded-input bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs font-medium whitespace-pre-line">{passwordError}</p>
              </div>
            )}

            {passwordSaved && !passwordError && (
              <div className="flex items-center gap-2 p-3 rounded-input bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
                <Check className="w-4 h-4 shrink-0" />
                <p className="text-xs font-medium">Đã đổi mật khẩu.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingPassword}
              className="w-full py-3 rounded-button bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border-clay border-blue-200 dark:border-slate-600 active:shadow-clay-inset active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 text-slate-700 dark:text-slate-100 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              {isSavingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đổi mật khẩu…</span>
                </>
              ) : (
                <span>Đổi mật khẩu</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
