import { useEffect, useState } from 'react';

export const useLocationGuard = () => {
  const [locationStatus, setLocationStatus] = useState('checking'); // 'checking', 'granted', 'denied'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('denied');
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    const cachedLat = localStorage.getItem('cafe_client_lat');
    const cachedLon = localStorage.getItem('cafe_client_lon');
    if (cachedLat && cachedLon) {
      setLocationStatus('granted');
      // We still update it in the background to ensure it is fresh
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        localStorage.setItem('cafe_client_lat', position.coords.latitude);
        localStorage.setItem('cafe_client_lon', position.coords.longitude);
        setLocationStatus('granted');
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationStatus('denied');
        if (error.code === 1) {
          setErrorMsg('Location permission was denied. Please enable it in your browser settings to order.');
        } else {
          setErrorMsg('Unable to determine your location. Please try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  return { locationStatus, errorMsg };
};
