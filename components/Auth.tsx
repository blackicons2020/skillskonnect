import React, { useState, useEffect } from 'react';
import { User, View } from '../types';
import { GoogleIcon, AppleIcon, EyeIcon, EyeSlashIcon } from './icons';
import { SocialAccountSelectorModal } from './SocialAccountSelectorModal';
import { apiService } from '../services/apiService';

interface AuthProps {
  initialTab: 'login' | 'signup';
  onNavigate: (v: View) => void;
}

export const Auth: React.FC<AuthProps> = ({ initialTab, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const [loginView, setLoginView] = useState<'form' | 'forgotPassword'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Social Login
  const [socialProvider, setSocialProvider] = useState<'google' | 'apple' | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (authMessage) {
      const timer = setTimeout(() => setAuthMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [authMessage]);

  const handleLogin = async () => {
    try {
      const res = await apiService.login(email.trim(), password.trim());
      localStorage.setItem('cleanconnect_token', res.token);
      setAuthMessage({ type: 'success', text: `Welcome back, ${res.user.fullName || res.user.email}!` });
      onNavigate({ name: 'dashboard' });
    } catch (err: any) {
      setAuthMessage({ type: 'error', text: err.message });
    }
  };

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      setAuthMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    try {
      const res = await apiService.register({ email: email.trim(), password: password.trim() });
      setAuthMessage({ type: 'success', text: `Account created successfully! Welcome, ${res.fullName || res.email}` });
      setActiveTab('login');
      setLoginView('form');
    } catch (err: any) {
      setAuthMessage({ type: 'error', text: err.message });
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setSocialProvider(provider);
  };

  const handleSocialSelect = async (selectedEmail: string, selectedName: string) => {
    if (socialProvider) {
      try {
        const res = await apiService.socialLogin(socialProvider, selectedEmail, selectedName);
        localStorage.setItem('cleanconnect_token', res.token);
        setAuthMessage({ type: 'success', text: `Welcome back, ${res.user.fullName || res.user.email}!` });
        onNavigate({ name: 'dashboard' });
      } catch (err: any) {
        setAuthMessage({ type: 'error', text: err.message });
      } finally {
        setSocialProvider(null);
      }
    }
  };

  const handleForgotPasswordSubmit = (email: string) => {
    // Placeholder for API call
    console.log(`Password reset requested for: ${email}`);
    setAuthMessage({ type: 'success', text: 'If an account exists, a reset link has been sent to your email.' });
    setLoginView('form');
  };

  return (
    <>
      <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 flex-col">
        <div className="max-w-md w-full space-y-4">
          {authMessage && (
            <div
              className={`p-4 rounded-md shadow ${
                authMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
              role="alert"
            >
              <p className="font-bold">{authMessage.type === 'success' ? 'Success' : 'Error'}</p>
              <p className="text-sm">{authMessage.text}</p>
            </div>
          )}

          <div className="bg-white p-8 sm:p-10 rounded-xl shadow-lg">
            <div>
              <h2 className="text-center text-3xl font-extrabold text-dark">
                {activeTab === 'login' && loginView === 'form'
                  ? 'Sign in to your account'
                  : activeTab === 'login' && loginView === 'forgotPassword'
                  ? 'Reset your password'
                  : 'Create an account'}
              </h2>
              {loginView === 'form' && (
                <p className="mt-2 text-center text-sm text-gray-600">
                  {activeTab === 'login' ? 'New to CleanConnect?' : 'Already have an account?'}{' '}
                  <button
                    onClick={() => setActiveTab(activeTab === 'login' ? 'signup' : 'login')}
                    className="font-medium text-primary hover:text-secondary"
                  >
                    {activeTab === 'login' ? 'Create an account' : 'Sign in'}
                  </button>
                </p>
              )}
            </div>

            {/* ---------- FORM TABS ---------- */}
            {loginView === 'form' ? (
              activeTab === 'login' ? (
                <LoginForm
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  handleLogin={handleLogin}
                  onSocialClick={handleSocialAuth}
                  onForgotPasswordClick={() => setLoginView('forgotPassword')}
                />
              ) : (
                <SignupForm
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  showConfirmPassword={showConfirmPassword}
                  setShowConfirmPassword={setShowConfirmPassword}
                  handleSignup={handleSignup}
                  onSocialClick={handleSocialAuth}
                />
              )
            ) : (
              <ForgotPasswordForm
                onBack={() => setLoginView('form')}
                onSubmit={(e) => handleForgotPasswordSubmit(e)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ---------- SOCIAL LOGIN MODAL ---------- */}
      {socialProvider && (
        <SocialAccountSelectorModal
          provider={socialProvider}
          onClose={() => setSocialProvider(null)}
          onSelect={handleSocialSelect}
        />
      )}
    </>
  );
};

// ==================
// LOGIN FORM
// ==================
interface LoginFormProps {
  email: string;
  setEmail: (e: string) => void;
  password: string;
  setPassword: (p: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  handleLogin: () => void;
  onSocialClick: (provider: 'google' | 'apple') => void;
  onForgotPasswordClick: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  handleLogin,
  onSocialClick,
  onForgotPasswordClick,
}) => (
  <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
    <div className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          type="email"
          id="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-dark text-light"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative mt-1">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-dark text-light"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-200 focus:outline-none"
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onForgotPasswordClick} className="font-medium text-primary hover:text-secondary">
          Forgot your password?
        </button>
      </div>
      <div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Sign in
        </button>
      </div>

      <SocialButtons onClick={onSocialClick} />
    </div>
  </form>
);

// ==================
// SIGNUP FORM
// ==================
interface SignupFormProps {
  email: string;
  setEmail: (e: string) => void;
  password: string;
  setPassword: (p: string) => void;
  confirmPassword: string;
  setConfirmPassword: (p: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  handleSignup: () => void;
  onSocialClick: (provider: 'google' | 'apple') => void;
}

const SignupForm: React.FC<SignupFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  handleSignup,
  onSocialClick,
}) => (
  <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }}>
    <div className="space-y-4">
      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          type="email"
          id="signup-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-dark text-light"
        />
      </div>

      <PasswordField label="Password" value={password} onChange={setPassword} show={showPassword} setShow={setShowPassword} />
      <PasswordField label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} show={showConfirmPassword} setShow={setShowConfirmPassword} />

      <div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Continue
        </button>
      </div>

      <SocialButtons onClick={onSocialClick} />
    </div>
  </form>
);

// ==================
// FORGOT PASSWORD FORM
// ==================
interface ForgotPasswordFormProps {
  onBack: () => void;
  onSubmit: (email: string) => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack, onSubmit }) => {
  const [email, setEmail] = useState('');

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(email); }}
      className="space-y-4 text-center"
    >
      <div>
        <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          type="email"
          id="reset-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-dark text-light"
        />
      </div>
      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        Send Reset Link
      </button>
      <button type="button" onClick={onBack} className="mt-4 font-medium text-primary hover:text-secondary">
        &larr; Back to Login
      </button>
    </form>
  );
};

// ==================
// PASSWORD FIELD COMPONENT
// ==================
interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
}

const PasswordField: React.FC<PasswordFieldProps> = ({ label, value, onChange, show, setShow }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="relative mt-1">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={8}
        className="block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-dark text-light"
      />
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
        <button type="button" onClick={() => setShow(!show)} className="text-gray-400 hover:text-gray-200 focus:outline-none">
          {show ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </div>
    </div>
  </div>
);

// ==================
// SOCIAL BUTTONS
// ==================
interface SocialButtonsProps {
  onClick: (provider: 'google' | 'apple') => void;
}

const SocialButtons: React.FC<SocialButtonsProps> = ({ onClick }) => (
  <div className="mt-6 grid grid-cols-2 gap-3">
    <button
      onClick={() => onClick('google')}
      className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
    >
      <span className="sr-only">Sign in with Google</span>
      <GoogleIcon />
    </button>
    <button
      onClick={() => onClick('apple')}
      className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
    >
      <span className="sr-only">Sign in with Apple</span>
      <AppleIcon />
    </button>
  </div>
);
