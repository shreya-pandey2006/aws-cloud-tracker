import React, { useState } from 'react';
import { Compass, Lock, Mail, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginModal({ isOpen, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your admin email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g. admin@akgec.awscloudclubs.com).');
      return;
    }

    if (!password) {
      setError('Please enter your admin password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      await onLogin(cleanEmail, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail('admin@akgec.awscloudclubs.com');
    setPassword('admin123');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#0b0f19',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 60%)'
    }}>
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1e293b',
        borderRadius: '20px',
        width: '440px',
        maxWidth: '92%',
        padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
          }}>
            <Compass size={32} color="#ffffff" />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            AWS Cloud Clubs — AKGEC
          </h2>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
            Ajay Kumar Garg Engineering College • Dispatch Portal
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '12px',
            marginBottom: '18px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
              Admin Email
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '0 12px'
            }}>
              <Mail size={16} color="#64748b" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@akgec.awscloudclubs.com"
                required
                style={{
                  width: '100%',
                  padding: '11px 10px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '0 12px'
            }}>
              <Lock size={16} color="#64748b" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '11px 10px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#64748b'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Dispatch'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo Credentials Box */}
        <div style={{
          marginTop: '22px',
          padding: '12px 14px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#93c5fd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <strong>AKGEC Admin Account:</strong>
            <div>admin@akgec.awscloudclubs.com / admin123</div>
          </div>
          <button
            type="button"
            onClick={handleQuickDemo}
            style={{
              padding: '4px 8px',
              backgroundColor: '#1e3a8a',
              color: '#bfdbfe',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: '600'
            }}
          >
            Auto-fill
          </button>
        </div>
      </div>
    </div>
  );
}

