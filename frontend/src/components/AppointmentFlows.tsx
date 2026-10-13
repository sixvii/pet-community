import {
  IconArrowLeft,
  IconCalendar,
  IconCircleCheck,
  IconClock,
  IconMapPin,
  IconPaw,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { FeedColumn } from "./FeedColumn";
import { getApiUrl } from "../data/api";
import type {
  Appointment,
  AppointmentStatus,
  Pet,
  Provider,
} from "../data/models";

type AppointmentUpdate = (id: string, values: Partial<Appointment>) => void;

const appointmentTabs = [
  { id: "upcoming", label: "Upcoming" },
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

type AppointmentTab = (typeof appointmentTabs)[number]["id"];

function formatPrice(price: number) {
  return `₦${price.toLocaleString("en-NG")}`;
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusTab(status: AppointmentStatus): AppointmentTab {
  if (status === "PENDING") return "pending";
  if (status === "COMPLETED") return "completed";
  if (status === "CANCELLED" || status === "REJECTED" || status === "NO_SHOW") {
    return "cancelled";
  }
  return "upcoming";
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const labels: Record<AppointmentStatus, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REJECTED: "Declined",
    NO_SHOW: "No-show",
  };
  return (
    <span className={`pawly-status pawly-status-${status.toLowerCase()}`}>
      {labels[status]}
    </span>
  );
}

export function OwnerAppointmentsPage({
  appointments,
  pets,
  onBook,
  onUpdate,
  onMessage,
}: {
  appointments: Appointment[];
  pets: Pet[];
  onBook: () => void;
  onUpdate: AppointmentUpdate;
  onMessage: (appointment: Appointment) => void;
}) {
  const [tab, setTab] = useState<AppointmentTab>("upcoming");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const filtered = appointments
    .filter((appointment) => statusTab(appointment.status) === tab)
    .filter(
      (appointment) =>
        !pets.length || pets.some((pet) => pet.id === appointment.petId),
    );

  return (
    <FeedColumn className="pawly-appointments-page">
      <div className="pawly-page-actions">
        <button className="pawly-primary-button" onClick={onBook}>
          Book appointment
        </button>
      </div>
      <div
        className="pawly-appointment-tabs"
        role="tablist"
        aria-label="Appointment status"
      >
        {appointmentTabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "is-active" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            <span>
              {
                appointments.filter(
                  (appointment) => statusTab(appointment.status) === item.id,
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      {filtered.length ? (
        <div className="pawly-appointment-list">
          {filtered.map((appointment) => (
            <article className="pawly-appointment-card" key={appointment.id}>
              <div className="pawly-appointment-date">
                <IconCalendar size={16} />
                <span>{appointment.date}</span>
                <b>{appointment.time}</b>
              </div>
              <div className="pawly-appointment-main">
                <div className="pawly-appointment-avatar">
                  <IconPaw size={20} />
                </div>
                <div className="pawly-appointment-info">
                  <div className="pawly-appointment-title">
                    <strong>{appointment.service}</strong>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <span>
                    {appointment.petName} · {appointment.petBreed}
                  </span>
                  <span>{appointment.providerName}</span>
                  <small>
                    {appointment.professional} · {appointment.duration}
                  </small>
                </div>
                <b className="pawly-appointment-price">
                  {formatPrice(appointment.price)}
                </b>
              </div>
              <div className="pawly-appointment-actions">
                <button
                  className="pawly-secondary-button"
                  onClick={() => setSelected(appointment)}
                >
                  View details
                </button>
                {(appointment.status === "PENDING" ||
                  appointment.status === "CONFIRMED") && (
                  <>
                    <button
                      className="pawly-secondary-button"
                      onClick={() => setRescheduling(appointment)}
                    >
                      Reschedule
                    </button>
                    <button
                      className="pawly-danger-button"
                      onClick={() => setCancelling(appointment)}
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  className="pawly-appointment-message"
                  onClick={() => onMessage(appointment)}
                >
                  Message provider
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="pawly-appointment-empty">
          <IconCalendar size={25} />
          <strong>
            {tab === "upcoming"
              ? "No upcoming appointments"
              : `No ${tab} appointments`}
          </strong>
          <span>
            {tab === "upcoming"
              ? "Book a visit when your pet needs care."
              : "Appointments in this section will appear here."}
          </span>
          {tab === "upcoming" && (
            <button className="pawly-primary-button" onClick={onBook}>
              Find pet care
            </button>
          )}
        </div>
      )}
      {selected && (
        <AppointmentDetails
          appointment={selected}
          onClose={() => setSelected(null)}
          onMessage={() => onMessage(selected)}
          onReschedule={() => {
            setRescheduling(selected);
            setSelected(null);
          }}
          onCancel={() => {
            setCancelling(selected);
            setSelected(null);
          }}
        />
      )}
      {rescheduling && (
        <RescheduleModal
          appointment={rescheduling}
          onClose={() => setRescheduling(null)}
          onSave={(date, time) => {
            onUpdate(rescheduling.id, {
              date: formatDate(date),
              time,
              scheduledAt: new Date(`${date}T${time}`).toISOString(),
            });
            setRescheduling(null);
          }}
        />
      )}
      {cancelling && (
        <ConfirmationDialog
          title="Cancel this appointment?"
          message={`${cancelling.service} for ${cancelling.petName} will be cancelled.`}
          confirmLabel="Cancel appointment"
          onClose={() => setCancelling(null)}
          onConfirm={() => {
            onUpdate(cancelling.id, { status: "CANCELLED" });
            setCancelling(null);
          }}
        />
      )}
    </FeedColumn>
  );
}

export function ProviderAppointmentsPage({
  appointments,
  onUpdate,
  onMessage,
}: {
  appointments: Appointment[];
  onUpdate: AppointmentUpdate;
  onMessage: (appointment: Appointment) => void;
}) {
  const [tab, setTab] = useState<
    "requests" | "upcoming" | "completed" | "cancelled"
  >("requests");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const statuses: Record<typeof tab, AppointmentStatus[]> = {
    requests: ["PENDING"],
    upcoming: ["CONFIRMED", "IN_PROGRESS"],
    completed: ["COMPLETED"],
    cancelled: ["CANCELLED", "REJECTED", "NO_SHOW"],
  };
  const filtered = appointments.filter((appointment) =>
    statuses[tab].includes(appointment.status),
  );

  return (
    <FeedColumn className="pawly-appointments-page">
      <div
        className="pawly-appointment-tabs"
        role="tablist"
        aria-label="Business appointments"
      >
        {(["requests", "upcoming", "completed", "cancelled"] as const).map(
          (item) => (
            <button
              key={item}
              role="tab"
              aria-selected={tab === item}
              className={tab === item ? "is-active" : ""}
              onClick={() => setTab(item)}
            >
              {item === "requests"
                ? "Requests"
                : item.charAt(0).toUpperCase() + item.slice(1)}
              <span>
                {
                  appointments.filter((appointment) =>
                    statuses[item].includes(appointment.status),
                  ).length
                }
              </span>
            </button>
          ),
        )}
      </div>
      {filtered.length ? (
        <div className="pawly-appointment-list">
          {filtered.map((appointment) => (
            <article className="pawly-appointment-card" key={appointment.id}>
              <div className="pawly-appointment-date">
                <IconCalendar size={16} />
                <span>{appointment.date}</span>
                <b>{appointment.time}</b>
              </div>
              <div className="pawly-appointment-main">
                <img
                  className="pawly-appointment-avatar pawly-owner-avatar"
                  src={appointment.ownerAvatar}
                  alt=""
                />
                <div className="pawly-appointment-info">
                  <div className="pawly-appointment-title">
                    <strong>
                      {appointment.ownerName} · {appointment.petName}
                    </strong>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <span>
                    {appointment.petBreed} · {appointment.service}
                  </span>
                  <span>
                    {appointment.professional} · {appointment.duration}
                  </span>
                  <small>{formatPrice(appointment.price)}</small>
                </div>
                <button
                  className="pawly-appointment-message"
                  onClick={() => setSelected(appointment)}
                >
                  View
                </button>
              </div>
              <div className="pawly-appointment-actions">
                {appointment.status === "PENDING" && (
                  <>
                    <button
                      className="pawly-primary-button"
                      onClick={() =>
                        onUpdate(appointment.id, { status: "CONFIRMED" })
                      }
                    >
                      Accept request
                    </button>
                    <button
                      className="pawly-danger-button"
                      onClick={() =>
                        onUpdate(appointment.id, { status: "REJECTED" })
                      }
                    >
                      Decline
                    </button>
                  </>
                )}
                {appointment.status === "CONFIRMED" && (
                  <>
                    <button
                      className="pawly-secondary-button"
                      onClick={() =>
                        onUpdate(appointment.id, { status: "IN_PROGRESS" })
                      }
                    >
                      Start visit
                    </button>
                    <button
                      className="pawly-primary-button"
                      onClick={() =>
                        onUpdate(appointment.id, { status: "COMPLETED" })
                      }
                    >
                      Complete
                    </button>
                    <button
                      className="pawly-danger-button"
                      onClick={() =>
                        onUpdate(appointment.id, { status: "NO_SHOW" })
                      }
                    >
                      No-show
                    </button>
                  </>
                )}
                {appointment.status === "IN_PROGRESS" && (
                  <button
                    className="pawly-primary-button"
                    onClick={() =>
                      onUpdate(appointment.id, { status: "COMPLETED" })
                    }
                  >
                    Complete visit
                  </button>
                )}
                <button
                  className="pawly-appointment-message"
                  onClick={() => onMessage(appointment)}
                >
                  Message owner
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="pawly-appointment-empty">
          <IconCalendar size={25} />
          <strong>
            {tab === "requests"
              ? "No requests to review"
              : `No ${tab} appointments`}
          </strong>
          <span>New appointments from your customers will show here.</span>
        </div>
      )}
      {selected && (
        <AppointmentDetails
          appointment={selected}
          onClose={() => setSelected(null)}
          onMessage={() => onMessage(selected)}
          onReschedule={() => setSelected(null)}
          onCancel={() => setSelected(null)}
          providerView
        />
      )}
    </FeedColumn>
  );
}

export function BookingModal({
  pets,
  providers,
  initialProvider,
  initialService,
  customServices = [],
  onClose,
  onConfirm,
}: {
  pets: Pet[];
  providers: Provider[];
  initialProvider?: Provider | null;
  initialService?: string;
  customServices?: { name: string; duration: string; price: number }[];
  onClose: () => void;
  onConfirm: (appointment: Appointment) => void | Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [providerId, setProviderId] = useState(
    initialProvider?.id ?? providers[0]?.id ?? "",
  );
  const [serviceName, setServiceName] = useState(
    initialService ?? customServices[0]?.name ?? "",
  );
  const professional = "";
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availabilityLoadedFor, setAvailabilityLoadedFor] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const availabilityLoading = Boolean(providerId) && availabilityLoadedFor !== providerId;
  const [notes, setNotes] = useState("");
  const pet = pets.find((item) => item.id === petId);
  const provider = providers.find((item) => item.id === providerId);
  const fallbackPrice = provider
    ? Number(provider.price.replace(/[^0-9.]/g, "")) || 0
    : 0;
  const availableServices = customServices.length
    ? customServices
    : provider
      ? [{ name: provider.type, duration: "30 min", price: fallbackPrice }]
      : [];
  const service =
    availableServices.find((item) => item.name === serviceName) ??
    availableServices[0];

  useEffect(() => {
    if (!providerId) return;
    const controller = new AbortController();
    void fetch(getApiUrl(`providers/${encodeURIComponent(providerId)}/availability`), {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message = typeof result === "object" && result !== null && "error" in result &&
            typeof result.error === "string"
            ? result.error
            : `Unable to load provider availability (${response.status}).`;
          throw new Error(message);
        }
        if (typeof result !== "object" || result === null || !("slots" in result) ||
          !Array.isArray(result.slots) || !result.slots.every((slot) => typeof slot === "string")) {
          throw new Error("The server returned invalid provider availability.");
        }
        if (!controller.signal.aborted) {
          setAvailableSlots(result.slots);
          setSelectedSlot(result.slots[0] ?? "");
          setAvailabilityError("");
          setAvailabilityLoadedFor(providerId);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setAvailableSlots([]);
          setSelectedSlot("");
          setAvailabilityError(error instanceof Error ? error.message : "Unable to load provider availability.");
          setAvailabilityLoadedFor(providerId);
        }
      })
    return () => controller.abort();
  }, [providerId]);

  const canContinue =
    step === 1
      ? Boolean(pet && provider && service)
      : step === 2
        ? Boolean(selectedSlot && availableSlots.includes(selectedSlot) && !availabilityLoading && availabilityLoadedFor === providerId)
        : true;

  const finish = async () => {
    if (!pet || !provider || !service) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await onConfirm({
        id: `apt-${Date.now()}`,
        petId: pet.id,
        petName: pet.name,
        petBreed: pet.breed,
        ownerName: "",
        ownerAvatar: "",
        providerId: provider.id,
        providerName: provider.name,
        service: service.name,
        professional,
        date: new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(selectedSlot)),
        time: new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(new Date(selectedSlot)),
        scheduledAt: new Date(selectedSlot).toISOString(),
        duration: service.duration,
        price: service.price,
        status: "PENDING",
        notes: notes.trim() || undefined,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to request this appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="pawly-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        className="pawly-modal pawly-booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
      >
        <header className="pawly-booking-header">
          <button
            className="pawly-icon-button"
            aria-label="Go back"
            disabled={submitting}
            onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
          >
            <IconArrowLeft size={19} />
          </button>
          <h2 id="booking-title">Book an appointment</h2>
          <button
            className="pawly-icon-button"
            aria-label="Close booking"
            disabled={submitting}
            onClick={onClose}
          >
            <IconX size={19} />
          </button>
        </header>
        <div
          className="pawly-booking-progress"
          aria-label={`Step ${step} of 3`}
        >
          {[1, 2, 3].map((value) => (
            <span key={value} className={step >= value ? "is-complete" : ""} />
          ))}
        </div>
        {step === 1 && (
          <div className="pawly-booking-step">
            <h3>Choose care</h3>
            <label>
              Pet
              <select
                value={petId}
                onChange={(event) => setPetId(event.target.value)}
              >
                {pets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.breed}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Provider
              <select
                value={providerId}
                onChange={(event) => {
                  const nextProviderId = event.target.value;
                  setProviderId(nextProviderId);
                  setServiceName("");
                }}
              >
                {providers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Service
              <select
                value={serviceName}
                onChange={(event) => setServiceName(event.target.value)}
              >
                {availableServices.map((item) => (
                  <option key={item.name}>{item.name}</option>
                ))}
              </select>
            </label>
            {service ? (
              <div className="pawly-booking-service-summary">
                <span>{service.duration}</span>
                <strong>{formatPrice(service.price)}</strong>
              </div>
            ) : <p className="pawly-empty-country">No services are currently available from this provider.</p>}
          </div>
        )}
        {step === 2 && (
          <div className="pawly-booking-step">
            <h3>Choose an available time</h3>
            {availabilityLoading ? <p role="status">Loading provider availability…</p> : (
              <label>
                Available appointment times
                <select
                  value={selectedSlot}
                  onChange={(event) => setSelectedSlot(event.target.value)}
                  required
                  disabled={!availableSlots.length}
                >
                  {!availableSlots.length && <option value="">No times currently available</option>}
                  {availableSlots.map((slot) => <option key={slot} value={slot}>
                    {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(slot))}
                  </option>)}
                </select>
              </label>
            )}
            {availabilityError && <p className="pawly-inline-error" role="alert">{availabilityError}</p>}
            {!availabilityLoading && !availabilityError && !availableSlots.length && (
              <p role="status">This provider has not published any available appointment times yet.</p>
            )}
            <label>
              Notes{" "}
              <textarea
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything the provider should know?"
              />
            </label>
          </div>
        )}
        {step === 3 && (
          <div className="pawly-booking-step">
            <h3>Review your booking</h3>
            <div className="pawly-booking-summary">
              <div>
                <span>Pet</span>
                <strong>
                  {pet?.name} · {pet?.breed}
                </strong>
              </div>
              <div>
                <span>Provider</span>
                <strong>{provider?.name}</strong>
              </div>
              <div>
                <span>Service</span>
                <strong>
                  {service?.name} · {service?.duration}
                </strong>
              </div>
              <div>
                <span>Professional</span>
                <strong>{professional || "Assigned by provider"}</strong>
              </div>
              <div>
                <span>Date & time</span>
                <strong>
                  {selectedSlot
                    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(selectedSlot))
                    : "Select an available time"}
                </strong>
              </div>
              <div className="pawly-booking-total">
                <span>Total</span>
                <strong>{service ? formatPrice(service.price) : "—"}</strong>
              </div>
            </div>
            <p className="pawly-booking-note">
              The provider will confirm your appointment request.
            </p>
          </div>
        )}
        <footer className="pawly-booking-footer">
          {submitError && <p className="pawly-inline-error" role="alert">{submitError}</p>}
          {step < 3 ? (
            <button
              className="pawly-primary-button"
              disabled={!canContinue}
              onClick={() => setStep(step + 1)}
            >
              Continue
            </button>
          ) : (
            <button className="pawly-primary-button" disabled={submitting} onClick={() => { void finish(); }}>
              {submitting ? "Requesting…" : "Request appointment"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function AppointmentDetails({
  appointment,
  onClose,
  onMessage,
  onReschedule,
  onCancel,
  providerView = false,
}: {
  appointment: Appointment;
  onClose: () => void;
  onMessage: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  providerView?: boolean;
}) {
  return (
    <div
      className="pawly-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="pawly-modal pawly-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-detail-title"
      >
        <header>
          <h2 id="appointment-detail-title">Appointment details</h2>
          <button
            className="pawly-icon-button"
            aria-label="Close details"
            onClick={onClose}
          >
            <IconX size={19} />
          </button>
        </header>
        <div className="pawly-detail-status">
          <StatusBadge status={appointment.status} />
          <span>{appointment.id.toUpperCase()}</span>
        </div>
        <h3>{appointment.service}</h3>
        <div className="pawly-detail-grid">
          <div>
            <IconPaw size={17} />
            <span>
              <small>Pet</small>
              <strong>
                {appointment.petName} · {appointment.petBreed}
              </strong>
            </span>
          </div>
          <div>
            <IconCalendar size={17} />
            <span>
              <small>Date & time</small>
              <strong>
                {appointment.date} · {appointment.time}
              </strong>
            </span>
          </div>
          <div>
            <IconClock size={17} />
            <span>
              <small>Duration</small>
              <strong>{appointment.duration}</strong>
            </span>
          </div>
          <div>
            <IconMapPin size={17} />
            <span>
              <small>{providerView ? "Customer" : "Provider"}</small>
              <strong>
                {providerView
                  ? appointment.ownerName
                  : appointment.providerName}
              </strong>
            </span>
          </div>
          <div>
            <IconPaw size={17} />
            <span>
              <small>Professional</small>
              <strong>{appointment.professional}</strong>
            </span>
          </div>
          <div>
            <IconCircleCheck size={17} />
            <span>
              <small>Price</small>
              <strong>{formatPrice(appointment.price)}</strong>
            </span>
          </div>
        </div>
        {appointment.notes && (
          <div className="pawly-detail-notes">
            <span>Notes</span>
            <p>{appointment.notes}</p>
          </div>
        )}
        <div className="pawly-modal-actions">
          <button className="pawly-secondary-button" onClick={onMessage}>
            {providerView ? "Message owner" : "Message provider"}
          </button>
          {!providerView && appointment.status === "CONFIRMED" && (
            <button className="pawly-secondary-button" onClick={onReschedule}>
              Reschedule
            </button>
          )}
          {!providerView &&
            ["PENDING", "CONFIRMED"].includes(appointment.status) && (
              <button className="pawly-danger-button" onClick={onCancel}>
                Cancel
              </button>
            )}
        </div>
      </section>
    </div>
  );
}

function RescheduleModal({
  appointment,
  onClose,
  onSave,
}: {
  appointment: Appointment;
  onClose: () => void;
  onSave: (date: string, time: string) => void;
}) {
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(getApiUrl(`providers/${encodeURIComponent(appointment.providerId)}/availability`), {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(`Unable to load provider availability (${response.status}).`);
        if (typeof result !== "object" || result === null || !("slots" in result) ||
          !Array.isArray(result.slots) || !result.slots.every((slot) => typeof slot === "string")) {
          throw new Error("The server returned invalid provider availability.");
        }
        if (!controller.signal.aborted) {
          setAvailableSlots(result.slots);
          setSelectedSlot(result.slots[0] ?? "");
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setAvailabilityError(error instanceof Error ? error.message : "Unable to load provider availability.");
        }
      });
    return () => controller.abort();
  }, [appointment.providerId]);

  const saveSelectedSlot = () => {
    const selected = new Date(selectedSlot);
    const date = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`;
    const time = `${String(selected.getHours()).padStart(2, "0")}:${String(selected.getMinutes()).padStart(2, "0")}`;
    onSave(date, time);
  };
  return (
    <div
      className="pawly-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="pawly-modal pawly-pet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
      >
        <header>
          <h2 id="reschedule-title">Reschedule appointment</h2>
          <button
            className="pawly-icon-button"
            aria-label="Close"
            onClick={onClose}
          >
            <IconX size={19} />
          </button>
        </header>
        <div className="pawly-reschedule-form">
          <label>
            Available date and time
            <select value={selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)} disabled={!availableSlots.length}>
              {!availableSlots.length && <option value="">No available times</option>}
              {availableSlots.map((slot) => <option key={slot} value={slot}>
                {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(slot))}
              </option>)}
            </select>
          </label>
          {availabilityError && <p className="pawly-inline-error" role="alert">{availabilityError}</p>}
          <div className="pawly-modal-actions">
            <button className="pawly-secondary-button" onClick={onClose}>
              Keep current time
            </button>
            <button
              className="pawly-primary-button"
              disabled={!selectedSlot}
              onClick={saveSelectedSlot}
            >
              Save new time
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="pawly-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="pawly-modal pawly-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="pawly-confirm-icon">
          <IconCalendar size={19} />
        </div>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message">{message}</p>
        <div className="pawly-modal-actions">
          <button className="pawly-secondary-button" onClick={onClose}>
            Keep appointment
          </button>
          <button className="pawly-danger-button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
