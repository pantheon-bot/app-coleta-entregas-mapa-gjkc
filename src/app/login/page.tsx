"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'CLIENTE' | 'COLETOR' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone || !role) {
      setError('Por favor, preencha o telefone e selecione uma função');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      // Redirect to dashboard based on role
      router.push(role === 'CLIENTE' ? '/cliente' : '/coletor');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Bem-vindo</CardTitle>
          <CardDescription>
            Entre com seu telefone para começar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+55 11 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Name Input (optional) */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome (opcional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Você é:</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={role === 'CLIENTE' ? 'default' : 'outline'}
                className="h-20"
                onClick={() => setRole('CLIENTE')}
                disabled={loading}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">🙋</div>
                  <div className="font-semibold">Cliente</div>
                </div>
              </Button>
              <Button
                type="button"
                variant={role === 'COLETOR' ? 'default' : 'outline'}
                className="h-20"
                onClick={() => setRole('COLETOR')}
                disabled={loading}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">🚗</div>
                  <div className="font-semibold">Coletor</div>
                </div>
              </Button>
            </div>
          </div>

          {/* WhatsApp Verification Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            <div className="flex items-start gap-2">
              <span className="text-lg">📱</span>
              <div>
                <strong>Verificação WhatsApp:</strong> Em breve você receberá um código de verificação via WhatsApp (simulado nesta versão).
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={loading || !phone || !role}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
