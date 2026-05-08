import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const supabase = createBrowserClient();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateUsername = (username: string) => {
    const re = /^[a-zA-Z0-9_-]+$/;
    return re.test(username);
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 10) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Prevent typing invalid characters in username
    if (name === 'username') {
      if (value.length > 22) return;
      if (value.length > 0 && !/^[a-zA-Z0-9_-]+$/.test(value)) return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear specific error on change
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    if (serverMessage) setServerMessage(null);
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setServerMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) setServerMessage({ type: 'error', text: error.message });
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.username) newErrors.username = "Username is required";
    else if (formData.username.length > 22) newErrors.username = "Maximum 22 characters";
    else if (!validateUsername(formData.username)) newErrors.username = "Only letters, numbers, hyphens, and underscores allowed";

    if (!formData.email) newErrors.email = "Email is required";
    else if (!validateEmail(formData.email)) newErrors.email = "Invalid email format";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Minimum 6 characters required";

    if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setServerMessage(null);

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: { username: formData.username },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`
      },
    });

    if (error) {
      setServerMessage({ type: 'error', text: error.message });
    } else {
      setServerMessage({ type: 'success', text: 'Success! Please check your email to confirm your account.' });
    }
    setLoading(false);
  };

  const passwordStrength = calculatePasswordStrength(formData.password);
  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;

  return (
    <div className="w-full">
      {serverMessage && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${serverMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {serverMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
          <p className="text-sm font-medium">{serverMessage.text}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Sign up with Google
      </button>

      <div className="my-6 flex items-center before:mt-0.5 before:flex-1 before:border-t before:border-gray-200 after:mt-0.5 after:flex-1 after:border-t after:border-gray-200">
        <p className="mx-4 mb-0 text-center text-sm text-gray-500 font-medium">or</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <div className="relative">
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="johndoe123"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${errors.username
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                }`}
            />
            {errors.username && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
            )}
          </div>
          {errors.username ? (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {errors.username}</p>
          ) : (
            <></>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="relative">
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="you@example.com"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${errors.email
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                }`}
            />
            {errors.email && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
            )}
          </div>
          {errors.email && <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${errors.password
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                }`}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {errors.password}</p>}

          {/* Password strength indicator */}
          {formData.password.length > 0 && !errors.password && (
            <div className="mt-2.5">
              <div className="flex justify-between items-center mb-1.5 text-xs">
                <span className="text-gray-500">Password strength</span>
                <span className={`font-medium ${passwordStrength < 50 ? 'text-red-500' :
                  passwordStrength < 75 ? 'text-yellow-500' : 'text-blue-500'
                  }`}>
                  {passwordStrength < 50 ? 'Weak' : passwordStrength < 75 ? 'Fair' : 'Strong'}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 flex gap-1">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${passwordStrength >= 25 ? (passwordStrength < 50 ? 'bg-red-500 w-1/4' : passwordStrength < 75 ? 'bg-yellow-500 w-1/4' : 'bg-blue-500 w-1/4') : 'w-0'
                  }`}></div>
                <div className={`h-1.5 rounded-full transition-all duration-500 ${passwordStrength >= 50 ? (passwordStrength < 75 ? 'bg-yellow-500 w-1/4' : 'bg-blue-500 w-1/4') : 'w-0 bg-gray-100'
                  }`}></div>
                <div className={`h-1.5 rounded-full transition-all duration-500 ${passwordStrength >= 75 ? 'bg-blue-500 w-1/4' : 'w-0 bg-gray-100'
                  }`}></div>
                <div className={`h-1.5 rounded-full transition-all duration-500 ${passwordStrength >= 100 ? 'bg-blue-500 w-1/4' : 'w-0 bg-gray-100'
                  }`}></div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:outline-none transition-colors pr-10 ${errors.confirmPassword
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : (passwordsMatch ? 'border-blue-400 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500')
                }`}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
              {passwordsMatch && !errors.confirmPassword && (
                <CheckCircle2 className="h-5 w-5 text-blue-500 pointer-events-none" />
              )}
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {errors.confirmPassword && <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {errors.confirmPassword}</p>}
          {passwordsMatch && !errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-blue-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Passwords match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-8 py-2.5 px-4 flex items-center justify-center gap-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>
    </div>
  );
}
