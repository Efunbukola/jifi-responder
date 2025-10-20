// src/app/services/maps.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDX3qiB_9EQPUNeVmIS_fPGv5v99aGS4-c';


@Injectable({ providedIn: 'root' })
export class MapsService {
  private apiUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';

  constructor(private http: HttpClient) {}

  async getRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
    });

    const body = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: 'DRIVE',
    };

    try {
      const res: any = await this.http.post(this.apiUrl, body, { headers }).toPromise();
      if (res?.routes?.[0]) {
        const route = res.routes[0];
        const durationSeconds = parseInt(route.duration.replace('s', ''), 10);
        const durationMinutes = Math.round(durationSeconds / 60);
        return {
          distance: (route.distanceMeters / 1000).toFixed(2) + ' km',
          eta: `${durationMinutes} min`,
        };
      }
      return null;
    } catch (err) {
      console.error('Error fetching route info:', err);
      return null;
    }
  }

  async getFullRoute(origin: any, destination: any) {
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
    'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration',
  });

  const body = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode: 'DRIVE',
  };

  try {
    const res: any = await this.http.post(this.apiUrl, body, { headers }).toPromise();
    if (res?.routes?.[0]) {
      const r = res.routes[0];
      return {
        polyline: r.polyline?.encodedPolyline,
        distance: (r.distanceMeters / 1000).toFixed(2) + ' km',
        duration: Math.round(parseInt(r.duration.replace('s', ''), 10) / 60) + ' min',
      };
    }
    return null;
  } catch (err) {
    console.error('Error fetching full route:', err);
    return null;
  }
}



}
