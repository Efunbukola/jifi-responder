import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Geolocation } from '@capacitor/geolocation';
import { io, Socket } from 'socket.io-client';
import { GoogleMap } from '@angular/google-maps';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService, ResponderAuthUser } from 'src/app/services/auth.service';

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

  /** Mark arrival and load hardcoded workflow */
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
        cover_img:
          'http://scribar.net/SCRIBAR_FILES/image_2024-08-21220330734.png',
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
            {
              step: { step_id: 1304, step_title: 'Clean site with antimicrobial solution.' },
              icon: { file_path: 'http://scribar.net/SCRIBAR_FILES/icon_2024-08-2202543993.png' },
            },
            {
              step: { step_id: 1314, step_title: 'Insert a 14 gauge needle at a 90° angle until a hiss of air is heard.' },
              icon: { file_path: 'http://scribar.net/SCRIBAR_FILES/icon_2024-08-22025451596.png' },
            },
            {
              step: { step_id: 1324, step_title: 'Hold the catheter in place and remove the needle.' },
              icon: { file_path: 'http://scribar.net/SCRIBAR_FILES/icon_2024-08-22025458501.png' },
            },
            {
              step: { step_id: 1334, step_title: 'Stabilize catheter hub to chest wall with ½ inch gauze tape.' },
              icon: { file_path: 'http://scribar.net/SCRIBAR_FILES/icon_2024-08-22054105944.png' },
            },
            {
              step: { step_id: 1344, step_title: 'Listen for increased breath sounds or decreased distress.' },
              icon: { file_path: 'http://scribar.net/SCRIBAR_FILES/icon_2024-08-22025504647.png' },
            },
          ],
        },
      ],
    };

    // initialize completion status for each step
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
      alert(`✅ All steps in "${this.selectedTask.task.task_name}" are complete!`);
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
      alert('✅ Treatment marked as completed!');
    } catch (err: any) {
      console.error('Error completing treatment:', err);
      alert('Failed to complete treatment.');
    }
  }
}
