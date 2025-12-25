"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Dynamically import Map component to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/components/map').then(mod => ({ default: mod.Map })), {
  ssr: false,
  loading: () => <div className="h-[500px] rounded-lg bg-gray-100 flex items-center justify-center">Loading map...</div>
});

interface Ride {
  id: number;
  status: string;
  client_name: string | null;
  client_phone: string;
  client_latitude: number | null;
  client_longitude: number | null;
  origin_latitude: number;
  origin_longitude: number;
  destination_address: string;
  requested_at: string;
}

export default function ColetorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [pendingRides, setPendingRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [processing, setProcessing] = useState(false);

  // Check authentication
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'COLETOR') {
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

    const updateLocation = () => {
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
          if (!position) {
            setPosition([-23.5505, -46.6333]); // São Paulo as default
          }
        }
      );
    };

    updateLocation();
    const interval = setInterval(updateLocation, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [position]);

  const playNotificationSound = useCallback(() => {
    // Simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, []);

  // Fetch rides
  const fetchRides = useCallback(async () => {
    try {
      const [pendingRes, activeRes] = await Promise.all([
        fetch('/api/rides?status=PENDING'),
        fetch('/api/rides?status=ACCEPTED,AT_CLIENT,DELIVERING'),
      ]);

      const pendingData = await pendingRes.json();
      const activeData = await activeRes.json();

      const newPendingRides = pendingData.rides || [];

      // Play notification sound if new pending rides
      setPendingRides((prev) => {
        if (newPendingRides.length > 0 && prev.length === 0) {
          playNotificationSound();
        }
        return newPendingRides;
      });

      if (activeData.rides && activeData.rides.length > 0) {
        setActiveRide(activeData.rides[0]);
      } else {
        setActiveRide(null);
      }
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  }, [playNotificationSound]);

  // Poll for updates
  useEffect(() => {
    if (!position) return;

    fetchRides();

    const interval = setInterval(() => {
      fetchRides();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [position, fetchRides]);

  const handleRideAction = async (rideId: number, action: string) => {
    setProcessing(true);

    try {
      const res = await fetch(`/api/rides/${rideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        fetchRides();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao atualizar corrida');
      }
    } catch (error) {
      console.error('Error updating ride:', error);
      alert('Erro ao atualizar corrida');
    } finally {
      setProcessing(false);
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

  // Get status label
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: '⏳ Pendente',
      ACCEPTED: '✅ Aceito - Indo para cliente',
      AT_CLIENT: '📍 No local do cliente',
      DELIVERING: '🚗 A caminho do destino',
      COMPLETED: '✅ Concluída',
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Coletor - Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>

        {/* Active Ride */}
        {activeRide && (
          <Card className="mb-4 border-blue-500">
            <CardHeader>
              <CardTitle>Corrida Ativa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-lg font-semibold mb-2">{getStatusLabel(activeRide.status)}</p>
                <p>
                  <strong>Cliente:</strong> {activeRide.client_name || activeRide.client_phone}
                </p>
                <p>
                  <strong>Destino:</strong> {activeRide.destination_address}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {activeRide.status === 'ACCEPTED' && (
                  <Button onClick={() => handleRideAction(activeRide.id, 'arrive_at_client')} disabled={processing}>
                    📍 Cheguei no Local
                  </Button>
                )}
                {activeRide.status === 'AT_CLIENT' && (
                  <Button onClick={() => handleRideAction(activeRide.id, 'start_delivery')} disabled={processing}>
                    🚗 Iniciar Entrega
                  </Button>
                )}
                {activeRide.status === 'DELIVERING' && (
                  <Button onClick={() => handleRideAction(activeRide.id, 'complete')} disabled={processing}>
                    ✅ Viagem Concluída
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Rides */}
        {!activeRide && pendingRides.length > 0 && (
          <Card className="mb-4 border-yellow-500">
            <CardHeader>
              <CardTitle>Solicitações Pendentes 🔔</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingRides.map((ride) => (
                <div key={ride.id} className="border rounded-lg p-4 bg-yellow-50">
                  <p>
                    <strong>Cliente:</strong> {ride.client_name || ride.client_phone}
                  </p>
                  <p>
                    <strong>Destino:</strong> {ride.destination_address}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      className="flex-1"
                      onClick={() => handleRideAction(ride.id, 'accept')}
                      disabled={processing}
                    >
                      ✅ Aceitar
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRideAction(ride.id, 'reject')}
                      disabled={processing}
                    >
                      ❌ Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!activeRide && pendingRides.length === 0 && (
          <Card className="mb-4">
            <CardContent className="py-8 text-center text-gray-500">
              <p className="text-lg">Aguardando solicitações...</p>
              <p className="text-sm mt-2">Você está disponível e aparecendo no mapa para clientes.</p>
            </CardContent>
          </Card>
        )}

        {/* Map */}
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
                  type: 'collector',
                },
                ...(activeRide && activeRide.client_latitude && activeRide.client_longitude
                  ? [{
                      position: [activeRide.client_latitude, activeRide.client_longitude] as [number, number],
                      label: 'Cliente',
                      type: 'client' as const,
                    }]
                  : []),
                ...(activeRide && activeRide.status === 'DELIVERING'
                  ? [{
                      position: [activeRide.origin_latitude, activeRide.origin_longitude] as [number, number],
                      label: activeRide.destination_address,
                      type: 'destination' as const,
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
