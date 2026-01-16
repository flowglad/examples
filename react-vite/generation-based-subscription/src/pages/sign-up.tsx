import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '../lib/auth-client';
import { Button } from '../components/ui/button';

export function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try{
      await authClient.signUp.email(
        { name, email, password, callbackURL: '/' },
        {
          onError: (ctx) => setError(ctx.error.message),
          onSuccess: () => navigate('/'),
          onRequest: () => {},
        }
      );
    } finally{
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-xl font-semibold">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full rounded border px-3 py-2"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded border px-3 py-2"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded border px-3 py-2"
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating…' : 'Create account'}
        </Button>
        <p className="text-center text-sm">
          Click{' '}
          <Link
            to="/sign-in"
            className="text-blue-600 underline hover:text-blue-800"
          >
            here
          </Link>{' '}
          to sign in
        </p>
      </form>
    </div>
  );
}
