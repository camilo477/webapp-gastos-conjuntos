import { useEffect, useState } from 'react';
import { useSyncServices } from './context';
import type { DownloadedTrip, PendingGroup } from './storage';
export function useLocalTrip(tripId: string) {
  const services = useSyncServices();
  const [data,setData] = useState<{ key: string;trip: DownloadedTrip | null;groups: PendingGroup[];ready: boolean;error: string }>({ key: '',trip: null,groups: [],ready: false,error: '' });
  const key = services ? `${services.store.name}/${tripId}` : '';
  useEffect(() => {
    if (!services) return;
    let active = true, serial = 0;
    const load = async () => {
      const version = ++serial;
      try {
        const [trip,groups] = await Promise.all([services.store.trip(tripId),services.store.groups(tripId,false)]);
        if (active && version === serial) setData(previous => {
          // Delivery-state changes do not trigger a new financial projection.
          const nextTrip = JSON.stringify(previous.trip) === JSON.stringify(trip) ? previous.trip : trip;
          return { key,trip: nextTrip,groups,ready: true,error: '' };
        });
      } catch { if (active) setData(previous => ({ ...previous,key,ready: true,error: 'No se pudo abrir el almacenamiento local. Tus datos visibles no se han guardado.' })); }
    };
    const unsubscribe = services.store.subscribe(() => { void load(); }); void load();
    return () => { active = false; unsubscribe(); };
  },[services,tripId,key]);
  return data.key === key ? data : { key,trip: null,groups: [],ready: !services,error: '' };
}
