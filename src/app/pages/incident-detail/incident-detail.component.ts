import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Geolocation } from '@capacitor/geolocation';
import { io, Socket } from 'socket.io-client';
import { GoogleMap } from '@angular/google-maps';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService, ResponderAuthUser } from 'src/app/services/auth.service';
import Hls from 'hls.js';

@Component({
  selector: 'app-incident-detail',
  templateUrl: './incident-detail.component.html',
  styleUrls: ['./incident-detail.component.scss'],
  standalone: false,
})
export class IncidentDetailComponent implements OnInit, OnDestroy {
  @ViewChild(GoogleMap) map!: GoogleMap;

  socket!: Socket;
  incident: any = null;
  loading = true;
  error = '';
  mapsUrl = '';
  helpRequests: any[] = [];
  submitting = false;
  message = '';
  currentLocation: { lat: number; lng: number } | null = null;
  intervalId: any;
  currentResponder: ResponderAuthUser | null = null;
  treatmentStarted = false;
  treatmentCompleted = false;
  treatmentNotes = '';
  treatmentEndTime: Date | null = null;

  showWorkflowModal = false;
  workflowData: any = null;
  selectedTask: any = null;
  loadingWorkflow = false;

  // Map Config
  center: google.maps.LatLngLiteral = { lat: 0, lng: 0 };
  zoom = 16;
  markers: any[] = [];

  // Live stream
  streamCheckInterval: any;
  streamAvailable = false;

  // Help request form
  helpForm = this.fb.group({
    message: ['', [Validators.required, Validators.minLength(5)]],
  });

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private fb: FormBuilder,
    private auth: AuthService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Invalid incident ID';
      return;
    }

    this.currentResponder = this.auth.getResponder();
    if (!this.currentResponder) {
      this.error = 'You must be logged in to view this page.';
      this.loading = false;
      return;
    }

    try {
      await this.fetchCurrentLocation();
      await this.loadIncident(id);
      await this.loadHelpRequests(id);
      this.initializeMap();
      this.startHeartbeat();
      this.periodicallyCheckStream();
    } catch (err) {
      console.error('Error initializing incident detail:', err);
      this.error = 'Unable to load incident details.';
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.streamCheckInterval) clearInterval(this.streamCheckInterval);
  }

  async fetchCurrentLocation() {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    this.currentLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  async loadIncident(id: string) {
    const res: any = await this.http
      .get(`${environment.api_url}api/incidents/${id}`)
      .toPromise();

    this.incident = res;
    const [lng, lat] = this.incident.location.coordinates;
    this.mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

    
    // Always use a static, predictable stream key per incident
    const staticKey = `incident_${this.incident._id}`;
    this.incident.liveStreamUrl = `http://localhost:8000/live/${staticKey}/index.m3u8`;


  }

  /** 🎥 Periodically check if stream is available */
  periodicallyCheckStream() {
    if (!this.incident?.liveStreamUrl) return;

    const url = this.incident.liveStreamUrl;
    this.checkStreamAvailability(url);

    // Retry every 5 seconds until available
    this.streamCheckInterval = setInterval(() => {
      if (!this.streamAvailable) {
        this.checkStreamAvailability(url);
      } else {
        clearInterval(this.streamCheckInterval);
      }
    }, 5000);
  }

  async checkStreamAvailability(url: string) {
    try {
      await this.http.head(url, { responseType: 'text' }).toPromise();
      console.log('✅ Stream is available, initializing HLS...');
      this.streamAvailable = true;
      this.initHlsPlayer(url);
    } catch {
      console.log('⏳ Stream not available yet, retrying...');
    }
  }

  initHlsPlayer(url: string) {
    const video = document.getElementById('livePlayer') as HTMLVideoElement;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ liveDurationInfinity: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('🎬 HLS manifest loaded, starting playback');
        video.play().catch(() => console.warn('Autoplay prevented'));
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = url;
      video.play();
    } else {
      console.warn('⚠️ HLS not supported in this browser.');
    }
  }

  async loadHelpRequests(id: string) {
    try {
      const res: any = await this.http
        .get(`${environment.api_url}api/incidents/${id}/help-requests`)
        .toPromise();
      this.helpRequests = res;
    } catch (err) {
      console.error('Error fetching help requests:', err);
    }
  }

  async submitHelpRequest() {
    if (this.helpForm.invalid || !this.currentResponder) return;

    const id = this.incident._id;
    this.submitting = true;
    this.message = '';

    try {
      const body = {
        message: this.helpForm.value.message,
        responderId: this.currentResponder.responderId,
      };

      await this.http
        .post(`${environment.api_url}api/incidents/${id}/help-request`, body, {
          headers: { Authorization: `Bearer ${this.currentResponder.token}` },
        })
        .toPromise();

      this.message = 'Help request sent successfully!';
      this.helpForm.reset();
      await this.loadHelpRequests(id);
    } catch (err: any) {
      console.error('Error sending help request:', err);
      this.message = err.error?.error || 'Failed to send help request.';
    } finally {
      this.submitting = false;
    }
  }

  initializeMap() {
    if (!this.incident) return;
    const [lng, lat] = this.incident.location.coordinates;
    this.center = { lat, lng };

    this.markers = [
      {
        position: { lat, lng },
        label: { text: 'Incident', className: 'font-bold text-red-700' },
      },
    ];
  }

  startHeartbeat() {
    if (!this.currentResponder) return;

    this.socket = io(environment.api_url, {
      transports: ['websocket'],
      reconnection: true,
    });

    this.intervalId = setInterval(async () => {
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        this.currentLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        this.socket.emit('responderHeartbeat', {
          responderId: this.currentResponder!.responderId,
          lat: this.currentLocation.lat,
          lng: this.currentLocation.lng,
        });
      } catch (err) {
        console.warn('Heartbeat update failed:', err);
      }
    }, 10000);
  }

  openMaps() {
    if (this.mapsUrl) window.open(this.mapsUrl, '_system');
  }

  openPhoto(photoUrl: string) {
    window.open(photoUrl, '_blank');
  }

  /** Mark arrival and load workflow */
  async markAsArrived() {
    if (!this.currentResponder || !this.incident) return;

    try {
      const body = {
        responderId: this.currentResponder.responderId,
        incidentId: this.incident._id,
      };

      await this.http
        .post(`${environment.api_url}api/reports/start`, body, {
          headers: { Authorization: `Bearer ${this.currentResponder.token}` },
        })
        .toPromise();

      this.treatmentStarted = true;
      this.loadWorkflowData();

      alert('Treatment started! Workflow loaded.');
    } catch (err: any) {
      console.error('Error starting treatment:', err);
      alert('Failed to start treatment.');
    }
  }

  /** Hardcoded workflow data */
  loadWorkflowData() {
    this.loadingWorkflow = true;

    this.workflowData = {
      workflow: {
        workflow_id: 454,
        workflow_name: 'CAMMRAD Medic Prolonged Casualty Care (PCC)',
        workflow_description:
          'A set of tasks for military medics to deliver prolonged casualty care in austere environments.',
      },
      tasks: [
        {
          task: {
            task_id: 404,
            task_name: 'Needle Decompression',
            task_description:
              'Perform the needle decompression procedure step-by-step.',
          },
          steps: [
            { step: { step_id: 1304, step_title: 'Clean site with antimicrobial solution.' } },
            { step: { step_id: 1314, step_title: 'Insert a 14 gauge needle at 90° until hiss of air.' } },
            { step: { step_id: 1324, step_title: 'Hold catheter in place, remove needle.' } },
            { step: { step_id: 1334, step_title: 'Stabilize catheter hub with gauze tape.' } },
            { step: { step_id: 1344, step_title: 'Listen for improved breath sounds.' } },
          ],
        },
      ],
    };

    this.workflowData.tasks.forEach((t: any) =>
      t.steps.forEach((s: any) => (s.completed = false))
    );

    this.loadingWorkflow = false;
  }

  /** Modal Controls */
  openWorkflowModal() {
    this.showWorkflowModal = true;
  }

  closeWorkflowModal() {
    this.showWorkflowModal = false;
    this.selectedTask = null;
  }

  selectTask(taskWrapper: any) {
    this.selectedTask = taskWrapper;
  }

  backToTaskList() {
    this.selectedTask = null;
  }

  toggleStepCompletion(step: any) {
    step.completed = !step.completed;
    const allCompleted = this.selectedTask.steps.every((s: any) => s.completed);
    if (allCompleted) {
      alert(`All steps in "${this.selectedTask.task.task_name}" are complete!`);
      this.markAsCompleted();
      this.closeWorkflowModal();
    }
  }

  /** Mark treatment completed */
  async markAsCompleted() {
    if (!this.currentResponder || !this.incident) return;

    try {
      const body = {
        responderId: this.currentResponder.responderId,
        incidentId: this.incident._id,
        notes: this.treatmentNotes,
      };

      const res: any = await this.http
        .post(`${environment.api_url}api/reports/complete`, body, {
          headers: { Authorization: `Bearer ${this.currentResponder.token}` },
        })
        .toPromise();

      this.treatmentCompleted = true;
      this.treatmentEndTime = new Date(res.report.endTime);
      alert('Treatment marked as completed!');
    } catch (err: any) {
      console.error('Error completing treatment:', err);
      alert('Failed to complete treatment.');
    }
  }
}
