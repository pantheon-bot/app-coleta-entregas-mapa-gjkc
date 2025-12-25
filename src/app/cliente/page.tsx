"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Map } from '@/components/map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Collector {
  id: number;
  name: string | null;
  phone: string;
  latitude: number;
  longitude: number;
}

interface Ride {
  id: number;
  status: string;
  collector_name: string | null;
  collector_phone: string;
  collector_latitude: number | null;
  collector_longitude: number | null;
  destination_address: string;
  requested_at: string;
}

export default function ClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [selectedCollector, setSelectedCollector] = useState<Collector | null>(null);
  const [destination, setDestination] = useState('');
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [requestingRide, setRequestingRide] = useState(false);

  // Check authentication
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'CLIENTE') {
          router.push('/login');
        } else {
          setLoading(false);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // Get geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada pelo navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(coords);

        // Update location on server
        fetch('/api/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Erro ao obter localização. Usando localização padrão.');
        setPosition([-23.5505, -46.6333]); // São Paulo as default
      }
    );
  }, []);

  // Fetch available collectors
  const fetchCollectors = async () => {
    try {
      const res = await fetch('/api/collectors');
      const data = await res.json();
      setCollectors(data.collectors || []);
    } catch (error) {
      console.error('Error fetching collectors:', error);
    }
  };

  // Fetch current ride
  const fetchCurrentRide = async () => {
    try {
      const res = await fetch('/api/rides?status=PENDING,ACCEPTED,AT_CLIENT,DELIVERING');
      const data = await res.json();
      if (data.rides && data.rides.length > 0) {
        setCurrentRide(data.rides[0]);
      } else {
        setCurrentRide(null);
      }
    } catch (error) {
      console.error('Error fetching ride:', error);
    }
  };

  // Poll for updates
  useEffect(() => {
    if (!position) return;

    fetchCollectors();
    fetchCurrentRide();

    const interval = setInterval(() => {
      fetchCollectors();
      fetchCurrentRide();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [position]);

  const handleRequestRide = async () => {
    if (!selectedCollector || !destination || !position) {
      alert('Por favor, selecione um coletor e informe o destino');
      return;
    }

    setRequestingRide(true);

    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collector_id: selectedCollector.id,
          destination_address: destination,
          origin_latitude: position[0],
          origin_longitude: position[1],
        }),
      });

      if (res.ok) {
        setDestination('');
        setSelectedCollector(null);
        fetchCurrentRide();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao solicitar corrida');
      }
    } catch (error) {
      console.error('Error requesting ride:', error);
      alert('Erro ao solicitar corrida');
    } finally {
      setRequestingRide(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading || !position) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">📍</div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  // Get status label in Portuguese
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: '⏳ Aguardando aceitação',
      ACCEPTED: '✅ Aceito - Coletor a caminho',
      AT_CLIENT: '📍 Coletor chegou',
      DELIVERING: '🚗 Em rota para destino',
      COMPLETED: '✅ Concluída',
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Cliente - Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>

        {currentRide ? (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Corrida Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-lg font-semibold">{getStatusLabel(currentRide.status)}</p>
                <p>
                  <strong>Coletor:</strong> {currentRide.collector_name || currentRide.collector_phone}
                </p>
                <p>
                  <strong>Destino:</strong> {currentRide.destination_address}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Solicitar Corrida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Selecione um Coletor</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {collectors.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum coletor disponível no momento</p>
                  ) : (
                    collectors.map((collector) => (
                      <Button
                        key={collector.id}
                        variant={selectedCollector?.id === collector.id ? 'default' : 'outline'}
                        className="justify-start"
                        onClick={() => setSelectedCollector(collector)}
                      >
                        🚗 {collector.name || collector.phone}
                      </Button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="destination">Endereço de Destino</Label>
                <Input
                  id="destination"
                  placeholder="Ex: Rua Example, 123"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleRequestRide}
                disabled={!selectedCollector || !destination || requestingRide}
              >
                {requestingRide ? 'Enviando...' : 'Solicitar Corrida'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Mapa</CardTitle>
          </CardHeader>
          <CardContent>
            <Map
              center={position}
              zoom={14}
              className="h-[500px] rounded-lg"
              markers={[
                {
                  position,
                  label: 'Você está aqui',
                  type: 'client',
                },
                ...collectors
                  .filter(c => selectedCollector?.id === c.id || !currentRide)
                  .map(collector => ({
                    position: [collector.latitude, collector.longitude] as [number, number],
                    label: collector.name || collector.phone,
                    type: 'collector' as const,
                  })),
                ...(currentRide && currentRide.collector_latitude && currentRide.collector_longitude
                  ? [{
                      position: [currentRide.collector_latitude, currentRide.collector_longitude] as [number, number],
                      label: 'Coletor',
                      type: 'collector' as const,
                    }]
                  : []),
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
