import type { Appointment } from "../../data/models";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
  IconChartBar,
  IconClock,
  IconMessage,
  IconPaw,
  IconPlus,
  IconSearch,
  IconStar,
  IconTool,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useState, type FormEvent } from "react";

import { FeedColumn } from "../../components/FeedColumn";
import { getApiUrl } from "../../data/api";

const businessAreas = [
  { label: "Appointments", icon: IconCalendar },
  { label: "Calendar", icon: IconCalendar },
  { label: "Services", icon: IconTool },
  { label: "Reviews", icon: IconStar },
  { label: "Customers", icon: IconPaw },
  { label: "Analytics", icon: IconChartBar },
];

type VerificationState = "not_started" | "pending" | "verified";

function ProviderVerificationCard({
  onVerificationChange,
}: {
  onVerificationChange?: (verified: boolean) => void;
}) {
  const [verificationState, setVerificationState] =
    useState<VerificationState>("not_started");
  const [license, setLicense] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    fetch("/api/providers/verification", {
      credentials: "include",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (response.status === 401) return;
        if (!response.ok) {
          const payload: unknown = await response.json().catch(() => null);
          const message =
            payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Unable to load verification status.";
          throw new Error(message);
        }
        const payload: { status?: string; verified?: boolean; license?: string } = await response.json().catch(() => ({}));
        if (!isMounted) return;
        const status = payload.status ?? "not_started";
        const verified = Boolean(payload.verified);
        const nextState: VerificationState = verified
          ? "verified"
          : status === "pending" || status === "needs-info"
            ? "pending"
            : "not_started";
        setVerificationState(nextState);
        if (typeof payload.license === "string") setLicense(payload.license);
        onVerificationChange?.(verified);
      })
      .catch(() => {
        if (isMounted) {
          setVerificationState("not_started");
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [onVerificationChange]);

  const updateState = (next: VerificationState, verified: boolean) => {
    setVerificationState(next);
    onVerificationChange?.(verified);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedLicense = license.trim();
    if (!trimmedLicense || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/providers/verification", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ license: trimmedLicense }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error
            : "Unable to submit verification.";
        throw new Error(message);
      }
      const payload = result as { status?: string; verified?: boolean };
      const isVerified = Boolean(payload.verified);
      const nextState: VerificationState = isVerified ? "verified" : (payload.status === "pending" ? "pending" : "not_started");
      updateState(nextState, isVerified);
      setError("");
      if (!isVerified) setLicense(trimmedLicense);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to submit verification.");
    } finally {
      setSubmitting(false);
    }
  };

  if (verificationState === "pending") {
    return (
      <section className="pawly-verification-card pawly-provider-verification-card is-pending">
        <div className="pawly-verification-card-head">
          <span className="pawly-verification-pill">Verification pending</span>
        </div>
        <h2>We’re reviewing your provider documents</h2>
        <p>
          Your business ID and license are under review. Once approved, the blue
          verification badge will unlock on your profile.
        </p>
      </section>
    );
  }

  if (verificationState === "verified") {
    return (
      <section className="pawly-verification-card pawly-provider-verification-card is-verified">
        <div className="pawly-verification-card-head">
          <span className="pawly-verification-pill is-success">Verified</span>
        </div>
        <h2>Your provider profile is verified</h2>
        <p>
          Your account has passed identity and licensing checks, and the verified
          badge is active for pet owners.
        </p>
      </section>
    );
  }

  return (
    <section className="pawly-verification-card pawly-provider-verification-card">
      <div className="pawly-verification-card-head">
        <span className="pawly-verification-pill">Required</span>
      </div>
      <h2>Get verified</h2>
      <p>
        Complete provider verification to unlock the trusted badge and show pet
        owners that your business is verified.
      </p>
      <ul className="pawly-verification-list">
        <li>Business or professional license</li>
        <li>Government-issued ID or profile photo</li>
        <li>Contact details for review</li>
      </ul>
      <form className="pawly-provider-verification-form" onSubmit={onSubmit}>
        {error && <p className="pawly-form-error" role="alert">{error}</p>}
        <label>
          License or registration number
          <input
            value={license}
            onChange={(event) => setLicense(event.target.value)}
            placeholder="e.g. PET-20495"
            required
            disabled={submitting}
          />
        </label>
        <div className="pawly-verification-actions">
          <button type="submit" className="pawly-primary-button" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function ProviderBusinessPage({
  onOpen,
  onMessage,
  onVerificationChange,
}: {
  onOpen: (area: string) => void;
  onMessage?: () => void;
  onVerificationChange?: (verified: boolean) => void;
}) {
  return (
    <FeedColumn className="pawly-business-page">
      <ProviderVerificationCard onVerificationChange={onVerificationChange} />
      <div className="pawly-page-actions">
        <button
          className="pawly-primary-button"
          onClick={() => onOpen("services")}
        >
          Add service
        </button>
      </div>
      <div className="pawly-business-welcome">
        <span className="pawly-business-avatar pawly-business-avatar-large">
          B
        </span>
        <div>
          <strong>Your business</strong>
          <span>Manage your provider profile and services</span>
        </div>
      </div>
      <section className="pawly-business-today">
        <div>
          <span className="pawly-page-kicker">TODAY</span>
          <strong>Appointments</strong>
          <span>Bookings will appear here when received.</span>
        </div>
        <button
          className="pawly-secondary-button"
          onClick={() => onOpen("appointments")}
        >
          Review requests
        </button>
      </section>
      <h2 className="pawly-business-heading">Manage your business</h2>
      <div className="pawly-business-grid">
        {businessAreas.map(({ label, icon: Icon }) => (
          <button key={label} onClick={() => onOpen(label.toLowerCase())}>
            <span>
              <Icon size={18} />
            </span>
            <strong>{label}</strong>
            <span className="pawly-business-arrow">→</span>
          </button>
        ))}
      </div>
      <section className="pawly-business-next">
        <div>
          <IconMessage size={18} />
          <span>
            <strong>Customer messages</strong>
            <small>No conversations yet</small>
          </span>
        </div>
        <button onClick={() => onMessage?.() ?? onOpen("messages")}>Open</button>
      </section>
      <section className="pawly-business-next">
        <div>
          <IconStar size={18} />
          <span>
            <strong>Recent review</strong>
            <small>No reviews yet</small>
          </span>
        </div>
        <button onClick={() => onOpen("reviews")}>View</button>
      </section>
    </FeedColumn>
  );
}

export type ProviderService = {
  id: string;
  providerId?: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  description: string;
  active: boolean;
};

function ProviderServicesPage({
  services,
  setServices,
}: {
  services: ProviderService[];
  setServices: (
    update: (current: ProviderService[]) => ProviderService[],
  ) => void;
}) {
  const [editing, setEditing] = useState<ProviderService | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const activeCount = services.filter((service) => service.active).length;

  return (
    <FeedColumn className="pawly-services-page">
      <div className="pawly-services-toolbar">
        <div>
          <h1>Services</h1>
          <span>
            {activeCount} active · {services.length} total
          </span>
        </div>
        <button
          className="pawly-primary-button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <IconPlus size={16} /> Add service
        </button>
      </div>
      {services.length ? (
        <div className="pawly-service-list">
          {services.map((service) => (
            <article className="pawly-service-card" key={service.id}>
              <span className="pawly-service-icon">
                <IconTool size={18} />
              </span>
              <div className="pawly-service-copy">
                <div className="pawly-service-name-line">
                  <strong>{service.name}</strong>
                  <span
                    className={`pawly-service-status ${service.active ? "is-active" : ""}`}
                  >
                    {service.active ? "Active" : "Hidden"}
                  </span>
                </div>
                <span>{service.category}</span>
                <p>{service.description}</p>
                <div className="pawly-service-facts">
                  <strong>₦{service.price.toLocaleString("en-NG")}</strong>
                  <span>
                    <IconClock size={14} /> {service.duration} min
                  </span>
                </div>
              </div>
              <div className="pawly-service-controls">
                <button
                  className="pawly-secondary-button"
                  onClick={() => {
                    setEditing(service);
                    setFormOpen(true);
                  }}
                >
                  Edit
                </button>
                <button
                  className={`pawly-service-toggle ${service.active ? "is-active" : ""}`}
                  role="switch"
                  aria-label={`${service.active ? "Hide" : "Show"} ${service.name}`}
                  aria-checked={service.active}
                  onClick={() =>
                    setServices((current) =>
                      current.map((item) =>
                        item.id === service.id
                          ? { ...item, active: !item.active }
                          : item,
                      ),
                    )
                  }
                >
                  <span />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="pawly-service-empty">
          <span>
            <IconTool size={23} />
          </span>
          <strong>No services yet</strong>
          <p>
            Add your first service to let pet owners discover and book your
            care.
          </p>
          <button
            className="pawly-primary-button"
            onClick={() => setFormOpen(true)}
          >
            <IconPlus size={16} /> Add service
          </button>
        </section>
      )}
      {formOpen && (
        <ProviderServiceForm
          service={editing}
          onClose={() => setFormOpen(false)}
          onSave={(service) => {
            setServices((current) =>
              editing
                ? current.map((item) =>
                    item.id === service.id ? service : item,
                  )
                : [...current, service],
            );
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}
    </FeedColumn>
  );
}

function ProviderServiceForm({
  service,
  onClose,
  onSave,
}: {
  service: ProviderService | null;
  onClose: () => void;
  onSave: (service: ProviderService) => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [category, setCategory] = useState(service?.category ?? "Veterinary");
  const [price, setPrice] = useState(String(service?.price ?? ""));
  const [duration, setDuration] = useState(String(service?.duration ?? "30"));
  const [description, setDescription] = useState(service?.description ?? "");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      id: service?.id ?? `service-${Date.now()}`,
      name: name.trim(),
      category,
      price: Number(price),
      duration: Number(duration),
      description: description.trim(),
      active: service?.active ?? true,
    });
  };

  return (
    <div
      className="pawly-modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="pawly-modal pawly-service-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-form-title"
      >
        <header>
          <h2 id="service-form-title">
            {service ? "Edit service" : "Add a service"}
          </h2>
          <button
            className="pawly-icon-button"
            aria-label="Close"
            onClick={onClose}
          >
            <IconX size={18} />
          </button>
        </header>
        <form onSubmit={submit}>
          <label>
            Service name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
              placeholder="e.g. Wellness check"
            />
          </label>
          <div className="pawly-form-grid">
            <label>
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option>Veterinary</option>
                <option>Wellness</option>
                <option>Grooming</option>
                <option>Training</option>
                <option>Boarding</option>
              </select>
            </label>
            <label>
              Price (₦)
              <input
                type="number"
                min="0"
                step="100"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </label>
          </div>
          <div className="pawly-form-grid">
            <label>
              Duration (minutes)
              <input
                type="number"
                min="5"
                step="5"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                required
              />
            </label>
            <label>
              Description
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={160}
                placeholder="Briefly describe the service"
              />
            </label>
          </div>
          <div className="pawly-modal-actions">
            <button
              type="button"
              className="pawly-secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="pawly-primary-button">
              {service ? "Save changes" : "Add service"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

type ProviderReview = {
  id: string;
  name: string;
  avatar: string;
  pet: string;
  service: string;
  date: string;
  rating: number;
  text: string;
  reply: string;
};

function ProviderReviewsPage({ providerId }: { providerId?: string }) {
  const [filter, setFilter] = useState<"all" | "needs-reply">("all");
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [loading, setLoading] = useState(Boolean(providerId));
  const [loadError, setLoadError] = useState("");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const pendingCount = reviews.filter((review) => !replies[review.id]).length;
  const visibleReviews = reviews.filter(
    (review) => filter === "all" || !replies[review.id],
  );

  useEffect(() => {
    if (!providerId) {
      return;
    }
    const controller = new AbortController();
    void fetch(getApiUrl(`providers/${encodeURIComponent(providerId)}/reviews`), {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Unable to load reviews.");
        return payload;
      })
      .then((payload: { reviews?: Array<Record<string, unknown>> }) => {
        const loaded = (payload.reviews ?? []).map((review, index) => ({
          id: String(review.id ?? review._id ?? `review-${index}`),
          name: String(review.reviewerName ?? "Pet parent"),
          avatar: String(review.reviewerAvatar ?? ""),
          pet: String(review.petName ?? "Pet"),
          service: String(review.service ?? "Service"),
          date: String(review.createdAt ?? ""),
          rating: Math.max(1, Math.min(5, Number(review.rating ?? 0))),
          text: String(review.text ?? ""),
          reply: String(review.reply ?? ""),
        }));
        setReviews(loaded);
        setReplies(Object.fromEntries(loaded.filter((review) => review.reply).map((review) => [review.id, review.reply])));
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Unable to load reviews.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [providerId]);

  return (
    <FeedColumn className="pawly-reviews-page">
      <div className="pawly-services-toolbar">
        <div>
          <h1>Reviews</h1>
          <span>Customer feedback for your business</span>
        </div>
      </div>
      <section className="pawly-review-overview">
        <p>{loading ? "Loading reviews..." : loadError || (reviews.length ? `${reviews.length} reviews` : "No reviews have been added yet.")}</p>
      </section>
      <div className="pawly-review-filters" aria-label="Filter reviews">
        <button
          className={filter === "all" ? "is-selected" : ""}
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All reviews
        </button>
        <button
          className={filter === "needs-reply" ? "is-selected" : ""}
          aria-pressed={filter === "needs-reply"}
          onClick={() => setFilter("needs-reply")}
        >
          Needs reply <span>{pendingCount}</span>
        </button>
      </div>
      {visibleReviews.length ? (
        <div className="pawly-provider-review-list">
          {visibleReviews.map((review) => (
            <article className="pawly-provider-review" key={review.id}>
              <img src={review.avatar} alt="" loading="lazy" decoding="async" />
              <div className="pawly-provider-review-body">
                <div className="pawly-provider-review-top">
                  <div>
                    <strong>{review.name}</strong>
                    <span>{review.date}</span>
                  </div>
                  <span className="pawly-review-rating" aria-label={`${review.rating} out of 5 stars`}>
                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                  </span>
                </div>
                <span className="pawly-provider-review-service">{review.service} · {review.pet}</span>
                <p>{review.text}</p>
                {replies[review.id] && editingReview !== review.id ? (
                  <div className="pawly-provider-review-reply">
                    <strong>Your response</strong>
                    <p>{replies[review.id]}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setDrafts((current) => ({ ...current, [review.id]: replies[review.id] }));
                        setEditingReview(review.id);
                      }}
                    >
                      Edit response
                    </button>
                  </div>
                ) : (
                  <form
                    className="pawly-provider-review-reply-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const reply = drafts[review.id]?.trim();
                      if (!reply) return;
                      setReplies((current) => ({ ...current, [review.id]: reply }));
                      setDrafts((current) => ({ ...current, [review.id]: "" }));
                      setEditingReview(null);
                    }}
                  >
                    <input
                      aria-label={`Reply to ${review.name}`}
                      placeholder="Write a thoughtful response..."
                      maxLength={500}
                      value={drafts[review.id] ?? ""}
                      onChange={(event) => setDrafts((current) => ({ ...current, [review.id]: event.target.value }))}
                      required
                    />
                    {editingReview === review.id && (
                      <button
                        className="pawly-secondary-button"
                        type="button"
                        onClick={() => {
                          setEditingReview(null);
                          setDrafts((current) => ({ ...current, [review.id]: "" }));
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    <button className="pawly-primary-button" type="submit">
                      {editingReview === review.id ? "Save" : "Reply"}
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="pawly-calendar-empty pawly-review-empty">
          <IconStar size={22} />
          <strong>All caught up</strong>
          <span>There are no reviews waiting for a response.</span>
        </div>
      )}
    </FeedColumn>
  );
}

function ProviderAnalyticsPage({ appointments }: { appointments: Appointment[] }) {
  const completed = appointments.filter((appointment) => appointment.status === "COMPLETED");
  const earned = completed.reduce((total, appointment) => total + appointment.price, 0);
  const pending = appointments.filter((appointment) => appointment.status === "PENDING").length;
  const completionRate = appointments.length
    ? Math.round((completed.length / appointments.length) * 100)
    : 0;
  const statusCounts = [
    { label: "Completed", value: completed.length, className: "is-completed" },
    { label: "Confirmed", value: appointments.filter((appointment) => appointment.status === "CONFIRMED").length, className: "is-confirmed" },
    { label: "Pending", value: pending, className: "is-pending" },
    { label: "Cancelled, rejected or no-show", value: appointments.filter((appointment) => ["CANCELLED", "REJECTED", "NO_SHOW"].includes(appointment.status)).length, className: "is-cancelled" },
  ];
  const services = Array.from(
    appointments.reduce((counts, appointment) => {
      counts.set(appointment.service, (counts.get(appointment.service) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 5);
  const monthlyRevenue = Array.from(
    completed.reduce((months, appointment) => {
      const date = new Date(appointment.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const month = months.get(key) ?? {
        label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        timestamp: new Date(date.getFullYear(), date.getMonth()).getTime(),
        revenue: 0,
      };
      month.revenue += appointment.price;
      months.set(key, month);
      return months;
    }, new Map<string, { label: string; timestamp: number; revenue: number }>()),
  )
    .map(([, month]) => month)
    .sort((first, second) => first.timestamp - second.timestamp)
    .slice(-6);
  const maxRevenue = Math.max(...monthlyRevenue.map((month) => month.revenue), 1);
  const maxServiceCount = Math.max(...services.map((service) => service.count), 1);

  return (
    <FeedColumn className="pawly-analytics-page">
      <div className="pawly-services-toolbar">
        <div>
          <h1>Analytics</h1>
          <span>Performance from {appointments.length} provider appointments</span>
        </div>
      </div>
      <section className="pawly-analytics-metrics">
        <article>
          <span>Completed revenue</span>
          <strong>₦{earned.toLocaleString("en-NG")}</strong>
          <small>Completed appointments only</small>
        </article>
        <article>
          <span>Completed visits</span>
          <strong>{completed.length}</strong>
          <small>of {appointments.length} total appointments</small>
        </article>
        <article>
          <span>Pending requests</span>
          <strong>{pending}</strong>
          <small>Awaiting your response</small>
        </article>
        <article>
          <span>Completion rate</span>
          <strong>{completionRate}%</strong>
          <small>Completed out of all bookings</small>
        </article>
      </section>
      <section className="pawly-analytics-panel">
        <div className="pawly-analytics-panel-heading">
          <h2>Revenue by month</h2>
          <span>Completed services</span>
        </div>
        {monthlyRevenue.length ? (
          <div className="pawly-revenue-chart">
            {monthlyRevenue.map((month) => (
              <div className="pawly-revenue-column" key={month.label}>
                <strong>₦{month.revenue.toLocaleString("en-NG")}</strong>
                <div><i style={{ height: `${Math.max((month.revenue / maxRevenue) * 100, 4)}%` }} /></div>
                <span>{month.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="pawly-analytics-empty">Completed appointments will appear here.</div>
        )}
      </section>
      <div className="pawly-analytics-lower-grid">
        <section className="pawly-analytics-panel">
          <div className="pawly-analytics-panel-heading">
            <h2>Appointment status</h2>
            <span>{appointments.length} total</span>
          </div>
          <div className="pawly-status-breakdown">
            {statusCounts.map((status) => (
              <div className="pawly-analytics-row" key={status.label}>
                <span><i className={status.className} />{status.label}</span>
                <strong>{status.value}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="pawly-analytics-panel">
          <div className="pawly-analytics-panel-heading">
            <h2>Popular services</h2>
            <span>By bookings</span>
          </div>
          {services.length ? (
            <div className="pawly-service-performance">
              {services.map((service) => (
                <div key={service.name}>
                  <span>{service.name}<strong>{service.count}</strong></span>
                  <i><b style={{ width: `${(service.count / maxServiceCount) * 100}%` }} /></i>
                </div>
              ))}
            </div>
          ) : (
            <div className="pawly-analytics-empty">Service bookings will appear here.</div>
          )}
        </section>
      </div>
    </FeedColumn>
  );
}

function ProviderCustomersPage({
  appointments,
  onAppointments,
  onMessage,
}: {
  appointments: Appointment[];
  onAppointments: () => void;
  onMessage: () => void;
}) {
  const [query, setQuery] = useState("");
  const customers = Array.from(
    appointments.reduce(
      (grouped, appointment) => {
        const existing = grouped.get(appointment.ownerName) ?? {
          name: appointment.ownerName,
          avatar: appointment.ownerAvatar,
          appointments: [] as Appointment[],
        };
        existing.appointments.push(appointment);
        grouped.set(appointment.ownerName, existing);
        return grouped;
      },
      new Map<string, { name: string; avatar: string; appointments: Appointment[] }>(),
    ),
  )
    .map(([, customer]) => ({
      ...customer,
      pets: [...new Set(customer.appointments.map((appointment) => appointment.petName))],
      completed: customer.appointments.filter((appointment) => appointment.status === "COMPLETED"),
      latest: [...customer.appointments].sort(
        (first, second) => new Date(second.date).getTime() - new Date(first.date).getTime(),
      )[0],
    }))
    .sort((first, second) => new Date(second.latest.date).getTime() - new Date(first.latest.date).getTime());
  const visibleCustomers = customers.filter((customer) =>
    `${customer.name} ${customer.pets.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <FeedColumn className="pawly-customers-page">
      <div className="pawly-services-toolbar">
        <div>
          <h1>Customers</h1>
          <span>{customers.length} customer{customers.length === 1 ? "" : "s"} · {appointments.length} appointments</span>
        </div>
        <button className="pawly-secondary-button" onClick={onAppointments}>
          View appointments
        </button>
      </div>
      <label className="pawly-customer-search">
        <IconSearch size={17} />
        <input
          aria-label="Search customers or pets"
          placeholder="Search customers or pets"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {visibleCustomers.length ? (
        <div className="pawly-customer-list">
          {visibleCustomers.map((customer) => (
            <article className="pawly-customer-card" key={customer.name}>
              <img src={customer.avatar} alt="" loading="lazy" decoding="async" />
              <div className="pawly-customer-details">
                <div className="pawly-customer-heading">
                  <strong>{customer.name}</strong>
                  <span>{customer.appointments.length} appointment{customer.appointments.length === 1 ? "" : "s"}</span>
                </div>
                <span className="pawly-customer-pets">{customer.pets.join(" · ")}</span>
                <div className="pawly-customer-stats">
                  <span>Latest booking {new Date(customer.latest.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <strong>₦{customer.completed.reduce((total, appointment) => total + appointment.price, 0).toLocaleString("en-NG")} completed</strong>
                </div>
                <div className="pawly-customer-history">
                  {customer.appointments
                    .slice()
                    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
                    .slice(0, 2)
                    .map((appointment) => (
                      <div key={appointment.id}>
                        <span>{appointment.service} · {appointment.petName}</span>
                        <small>{appointment.status.replace(/_/g, " ").toLowerCase()}</small>
                      </div>
                    ))}
                </div>
              </div>
              <button className="pawly-secondary-button pawly-customer-message" onClick={onMessage}>
                <IconMessage size={15} /> Message
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="pawly-calendar-empty pawly-customer-empty">
          <IconPaw size={22} />
          <strong>{customers.length ? "No customers found" : "Your customer list is empty"}</strong>
          <span>{customers.length ? "Try a different name or pet." : "Customers will appear here after their appointments are booked."}</span>
        </div>
      )}
    </FeedColumn>
  );
}

function ProviderCalendarPage({
  appointments,
  onAppointments,
}: {
  appointments: Appointment[];
  onAppointments: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const firstUpcoming = appointments
      .filter((appointment) =>
        ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(appointment.status),
      )
      .sort(
        (first, second) =>
          new Date(first.date).getTime() - new Date(second.date).getTime(),
      )[0];
    return firstUpcoming ? new Date(firstUpcoming.date) : new Date();
  });
  const weekStart = new Date(selectedDate);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const dayAppointments = appointments
    .filter(
      (appointment) =>
        new Date(appointment.date).toDateString() ===
        selectedDate.toDateString(),
    )
    .sort((first, second) => first.time.localeCompare(second.time));
  const monthLabel = selectedDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const shiftWeek = (amount: number) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount * 7);
      return next;
    });
  };

  return (
    <FeedColumn className="pawly-provider-calendar">
      <div className="pawly-calendar-toolbar">
        <div>
          <h1>Schedule</h1>
          <span>{appointments.length} appointments in your calendar</span>
        </div>
        <button className="pawly-secondary-button" onClick={onAppointments}>
          Manage appointments
        </button>
      </div>
      <section className="pawly-calendar-panel">
        <div className="pawly-calendar-month">
          <strong>{monthLabel}</strong>
          <div>
            <button
              className="pawly-icon-button"
              aria-label="Previous week"
              onClick={() => shiftWeek(-1)}
            >
              <IconArrowLeft size={17} />
            </button>
            <button
              className="pawly-icon-button"
              aria-label="Next week"
              onClick={() => shiftWeek(1)}
            >
              <IconArrowRight size={17} />
            </button>
          </div>
        </div>
        <div className="pawly-calendar-days">
          {weekDays.map((date) => {
            const isSelected =
              date.toDateString() === selectedDate.toDateString();
            const hasAppointments = appointments.some(
              (appointment) =>
                new Date(appointment.date).toDateString() ===
                date.toDateString(),
            );
            return (
              <button
                key={date.toISOString()}
                className={isSelected ? "is-selected" : ""}
                aria-pressed={isSelected}
                onClick={() => setSelectedDate(date)}
              >
                <span>
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <strong>{date.getDate()}</strong>
                {hasAppointments && <i />}
              </button>
            );
          })}
        </div>
      </section>
      <div className="pawly-calendar-agenda-heading">
        <h2>
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h2>
        <span>{dayAppointments.length} visits</span>
      </div>
      {dayAppointments.length ? (
        <div className="pawly-calendar-agenda">
          {dayAppointments.map((appointment) => (
            <article
              className="pawly-calendar-appointment"
              key={appointment.id}
            >
              <time>{appointment.time}</time>
              <div className="pawly-calendar-appointment-copy">
                <div>
                  <strong>{appointment.service}</strong>
                  <span
                    className={`pawly-status pawly-status-${appointment.status.toLowerCase()}`}
                  >
                    {appointment.status.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
                <span>
                  {appointment.ownerName} · {appointment.petName}
                </span>
                <small>
                  {appointment.professional} · {appointment.duration}
                </small>
              </div>
              <b>₦{appointment.price.toLocaleString("en-NG")}</b>
            </article>
          ))}
        </div>
      ) : (
        <div className="pawly-calendar-empty">
          <IconCalendar size={22} />
          <strong>No appointments for this day</strong>
          <span>Choose another date to review your schedule.</span>
        </div>
      )}
    </FeedColumn>
  );
}

export function ProviderAreaPage({
  area,
  onAppointments,
  onMessage,
  appointments,
  services,
  setServices,
  providerId,
}: {
  area: string;
  onAppointments: () => void;
  onMessage: () => void;
  appointments: Appointment[];
  services: ProviderService[];
  setServices: (
    update: (current: ProviderService[]) => ProviderService[],
  ) => void;
  providerId?: string;
}) {
  const labels: Record<string, string> = {
    calendar: "Calendar",
    services: "Services",
    reviews: "Reviews",
    customers: "Customers",
    analytics: "Analytics",
    messages: "Messages",
  };
  const title = labels[area] ?? "Business";

  if (area === "services") {
    return (
      <ProviderServicesPage services={services} setServices={setServices} />
    );
  }
  if (area === "calendar") {
    return (
      <ProviderCalendarPage
        appointments={appointments}
        onAppointments={onAppointments}
      />
    );
  }
  if (area === "reviews") {
    return <ProviderReviewsPage providerId={providerId} />;
  }
  if (area === "analytics") {
    return <ProviderAnalyticsPage appointments={appointments} />;
  }
  if (area === "customers") {
    return (
      <ProviderCustomersPage
        appointments={appointments}
        onAppointments={onAppointments}
        onMessage={onMessage}
      />
    );
  }

  return (
    <FeedColumn className="pawly-placeholder-page">
      <section className="pawly-placeholder-card">
        <div className="pawly-placeholder-icon">
          <IconTool />
        </div>
        <h2>{title}</h2>
        <p>
          {area === "messages"
            ? "Open your conversations to message customers and manage replies."
            : "Use your appointments, services, and reviews to manage your business."}
        </p>
        {area === "messages" ? (
          <button className="pawly-primary-button" onClick={onMessage}>
            Open messages
          </button>
        ) : (
          <button className="pawly-primary-button" onClick={onAppointments}>
            View appointments
          </button>
        )}
      </section>
    </FeedColumn>
  );
}
