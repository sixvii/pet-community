import { IconMapPin, IconPaw, IconSearch } from "@tabler/icons-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { getApiUrl } from "../data/api";
import type { FeedPost } from "../data/models";
import { FeedColumn } from "./FeedColumn";

type LostFoundListing = {
  id: string;
  type: "lost" | "found";
  petName: string;
  breed: string;
  location: string;
  description: string;
  contact: string;
  ownerName: string;
  latitude: number | null;
  longitude: number | null;
};

type AdoptionListing = {
  id: string;
  petName: string;
  breed: string;
  age: string;
  location: string;
  description: string;
  contact: string;
  rescueName: string;
};

type AdoptionApplication = {
  id: string;
  listingId: string;
  petName: string;
  applicantName: string;
  contact: string;
  message: string;
  status: "submitted" | "accepted" | "rejected";
};

type SavedPost = {
  collection: string;
  post: FeedPost;
};

type Language = "en" | "es" | "fr";
const featureTabs = ["lost", "adoption", "saved", "availability"] as const;

const copy: Record<Language, Record<string, string>> = {
  en: {
    title: "Community hub",
    subtitle: "Find pets, support rescues, and manage care.",
    lost: "Lost & found",
    adoption: "Adoption",
    saved: "Saved collections",
    availability: "Availability",
    search: "Search pets, breeds, or places",
    report: "Report a pet",
    reportType: "Report type",
    lostPet: "Lost pet",
    foundPet: "Found pet",
    petName: "Pet name",
    breed: "Breed",
    location: "Location",
    latitude: "Latitude (optional)",
    longitude: "Longitude (optional)",
    contact: "Contact details",
    description: "Description",
    publish: "Publish alert",
    apply: "Apply to adopt",
    intro: "Tell the rescue why you can provide a good home",
    addListing: "Add adoption listing",
    age: "Age",
    noListings: "No matching listings yet.",
    openMap: "Open map",
    rescue: "Rescue",
    applicationManagement: "Adoption applications",
    noApplications: "No adoption applications yet.",
    providerAvailabilityOnly: "Provider accounts manage appointment availability.",
    acceptApplication: "Accept application",
    declineApplication: "Decline",
    futureTimeRequired: "Choose a future time that is not already listed.",
    save: "Save",
    remove: "Remove",
    collection: "Collection",
    noSaved: "Your saved posts will appear here.",
    slotDate: "Available date",
    slotTime: "Start time",
    addSlot: "Add time slot",
    saveAvailability: "Save availability",
    noSlots: "Add the dates and times you accept bookings.",
    loading: "Loading…",
    error: "Unable to load this section.",
    language: "Language",
  },
  es: {
    title: "Centro comunitario",
    subtitle: "Encuentra mascotas, apoya refugios y organiza cuidados.",
    lost: "Perdidos y encontrados",
    adoption: "Adopción",
    saved: "Colecciones guardadas",
    availability: "Disponibilidad",
    search: "Buscar mascotas, razas o lugares",
    report: "Reportar una mascota",
    reportType: "Tipo de aviso",
    lostPet: "Mascota perdida",
    foundPet: "Mascota encontrada",
    petName: "Nombre de la mascota",
    breed: "Raza",
    location: "Ubicación",
    latitude: "Latitud (opcional)",
    longitude: "Longitud (opcional)",
    contact: "Datos de contacto",
    description: "Descripción",
    publish: "Publicar aviso",
    apply: "Solicitar adopción",
    intro: "Cuéntale al refugio por qué puedes ofrecer un buen hogar",
    addListing: "Añadir adopción",
    age: "Edad",
    noListings: "No hay anuncios coincidentes.",
    openMap: "Abrir mapa",
    rescue: "Rescate",
    applicationManagement: "Solicitudes de adopción",
    noApplications: "Aún no hay solicitudes de adopción.",
    providerAvailabilityOnly: "Los proveedores administran la disponibilidad de citas.",
    acceptApplication: "Aceptar solicitud",
    declineApplication: "Rechazar",
    futureTimeRequired: "Elige una hora futura que aún no esté en la lista.",
    save: "Guardar",
    remove: "Eliminar",
    collection: "Colección",
    noSaved: "Tus publicaciones guardadas aparecerán aquí.",
    slotDate: "Fecha disponible",
    slotTime: "Hora de inicio",
    addSlot: "Añadir horario",
    saveAvailability: "Guardar disponibilidad",
    noSlots: "Añade las fechas y horas en que aceptas reservas.",
    loading: "Cargando…",
    error: "No se pudo cargar esta sección.",
    language: "Idioma",
  },
  fr: {
    title: "Espace communautaire",
    subtitle: "Trouvez des animaux, soutenez les refuges et organisez les soins.",
    lost: "Perdus et trouvés",
    adoption: "Adoption",
    saved: "Collections enregistrées",
    availability: "Disponibilités",
    search: "Rechercher des animaux, races ou lieux",
    report: "Signaler un animal",
    reportType: "Type de signalement",
    lostPet: "Animal perdu",
    foundPet: "Animal trouvé",
    petName: "Nom de l’animal",
    breed: "Race",
    location: "Lieu",
    latitude: "Latitude (facultatif)",
    longitude: "Longitude (facultatif)",
    contact: "Coordonnées",
    description: "Description",
    publish: "Publier l’alerte",
    apply: "Demander l’adoption",
    intro: "Expliquez au refuge pourquoi vous pouvez offrir un bon foyer",
    addListing: "Ajouter une annonce d’adoption",
    age: "Âge",
    noListings: "Aucune annonce correspondante.",
    openMap: "Ouvrir la carte",
    rescue: "Refuge",
    applicationManagement: "Demandes d’adoption",
    noApplications: "Aucune demande d’adoption pour le moment.",
    providerAvailabilityOnly: "Les prestataires gèrent les disponibilités des rendez-vous.",
    acceptApplication: "Accepter la demande",
    declineApplication: "Refuser",
    futureTimeRequired: "Choisissez un horaire futur qui n’est pas déjà indiqué.",
    save: "Enregistrer",
    remove: "Supprimer",
    collection: "Collection",
    noSaved: "Vos publications enregistrées apparaîtront ici.",
    slotDate: "Date disponible",
    slotTime: "Heure de début",
    addSlot: "Ajouter un créneau",
    saveAvailability: "Enregistrer les disponibilités",
    noSlots: "Ajoutez les dates et heures auxquelles vous acceptez les réservations.",
    loading: "Chargement…",
    error: "Impossible de charger cette section.",
    language: "Langue",
  },
};

function getSavedLanguage(): Language {
  try {
    const stored = window.localStorage.getItem("pawly-language");
    return stored === "es" || stored === "fr" ? stored : "en";
  } catch (error) {
    console.warn("Unable to read language preference.", error);
    return "en";
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload &&
      typeof payload.error === "string"
      ? payload.error
      : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload as T;
}

function useCommunityItems<T>(resource: string, query: string, enabled = true) {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState("");
  const requestKey = `${resource}\u0000${query}`;
  const [settledRequest, setSettledRequest] = useState("");

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const url = getApiUrl(resource);
    if (query.trim()) url.searchParams.set("q", query.trim());
    void fetch(url, { signal: controller.signal, cache: "no-store", credentials: "include" })
      .then(readResponse<T[]>)
      .then((result) => {
        if (!Array.isArray(result)) throw new Error("The server returned an invalid list.");
        setItems(result);
        setError("");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Unable to load this section.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettledRequest(requestKey);
      });
    return () => controller.abort();
  }, [enabled, query, requestKey, resource]);

  return { items, setItems, loading: enabled && settledRequest !== requestKey, error };
}

function CommunityForm({
  title,
  children,
  onSubmit,
  submitLabel,
}: {
  title: string;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  return (
    <form className="pawly-community-form" onSubmit={onSubmit}>
      <h2>{title}</h2>
      <div className="pawly-community-form-grid">{children}</div>
      <button className="pawly-primary-button" type="submit">{submitLabel}</button>
    </form>
  );
}

export function CommunityFeaturesPage({
  role,
  notify,
}: {
  role: "owner" | "provider" | "admin";
  notify: (message: string) => void;
}) {
  const [language, setLanguage] = useState<Language>(getSavedLanguage);
  const [tab, setTab] = useState<"lost" | "adoption" | "saved" | "availability">("lost");
  const [query, setQuery] = useState("");
  const [lostType, setLostType] = useState<"lost" | "found">("lost");
  const [lostForm, setLostForm] = useState({ petName: "", breed: "", location: "", latitude: "", longitude: "", contact: "", description: "" });
  const [adoptionForm, setAdoptionForm] = useState({ petName: "", breed: "", age: "", location: "", contact: "", description: "" });
  const [application, setApplication] = useState<{ listingId: string; message: string; contact: string } | null>(null);
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [collectionNames, setCollectionNames] = useState<Record<string, string>>({});
  const t = copy[language];
  const lost = useCommunityItems<LostFoundListing>("lost-found", query);
  const adoptions = useCommunityItems<AdoptionListing>("adoptions", query);
  const saved = useCommunityItems<SavedPost>("saved-posts", "");
  const applications = useCommunityItems<AdoptionApplication>(
    "adoption-applications",
    "",
    role === "provider",
  );

  useEffect(() => {
    try {
      window.localStorage.setItem("pawly-language", language);
    } catch (error) {
      console.warn("Unable to save language preference.", error);
    }
  }, [language]);

  useEffect(() => {
    if (role !== "provider") return;
    const controller = new AbortController();
    void fetch(getApiUrl("providers/availability"), {
      credentials: "include",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(readResponse<{ slots: string[] }>)
      .then((result) => {
        if (!Array.isArray(result.slots) || !result.slots.every((slot) => typeof slot === "string")) {
          throw new Error("The server returned invalid availability.");
        }
        setSlots(result.slots);
        setAvailabilityLoaded(true);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setAvailabilityError(reason instanceof Error ? reason.message : t.error);
        }
      });
    return () => controller.abort();
  }, [role, t.error]);

  const slotLabels = useMemo(
    () => slots.map((slot) => ({ value: slot, label: new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(slot)) })),
    [language, slots],
  );

  const submitLost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = {
      type: lostType,
      ...lostForm,
      latitude: lostForm.latitude || null,
      longitude: lostForm.longitude || null,
    };
    try {
      const item = await readResponse<LostFoundListing>(await fetch(getApiUrl("lost-found"), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }));
      lost.setItems((current) => [item, ...current]);
      setLostForm({ petName: "", breed: "", location: "", latitude: "", longitude: "", contact: "", description: "" });
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : t.error);
    }
  };

  const submitAdoption = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const item = await readResponse<AdoptionListing>(await fetch(getApiUrl("adoptions"), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(adoptionForm),
      }));
      adoptions.setItems((current) => [item, ...current]);
      setAdoptionForm({ petName: "", breed: "", age: "", location: "", contact: "", description: "" });
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : t.error);
    }
  };

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!application) return;
    try {
      await readResponse(await fetch(getApiUrl(`adoptions/${encodeURIComponent(application.listingId)}/applications`), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ message: application.message, contact: application.contact }),
      }));
      setApplication(null);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : t.error);
    }
  };

  const updateApplication = async (applicationId: string, status: "accepted" | "rejected") => {
    try {
      await readResponse(await fetch(getApiUrl(`adoption-applications/${encodeURIComponent(applicationId)}`), {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }));
      const selected = applications.items.find((item) => item.id === applicationId);
      applications.setItems((current) => current.map((item) => {
        if (item.id === applicationId) return { ...item, status };
        if (status === "accepted" && selected?.listingId === item.listingId && item.status === "submitted") {
          return { ...item, status: "rejected" };
        }
        return item;
      }));
      if (status === "accepted") {
        const accepted = applications.items.find((item) => item.id === applicationId);
        if (accepted) adoptions.setItems((current) => current.filter((listing) => listing.id !== accepted.listingId));
      }
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : t.error);
    }
  };

  const addSlot = () => {
    if (!slotDate || !slotTime) return;
    const value = new Date(`${slotDate}T${slotTime}`).toISOString();
    if (new Date(value) <= new Date() || slots.some((slot) => new Date(slot).getTime() === new Date(value).getTime())) {
      notify(t.futureTimeRequired);
      return;
    }
    setSlots((current) => [...current, value].sort());
    setSlotDate("");
    setSlotTime("");
  };

  const saveAvailability = async () => {
    try {
      await readResponse(await fetch(getApiUrl("providers/availability"), {
        method: "PUT",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      }));
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : t.error);
    }
  };

  const removeSaved = async (postId: string, collection: string) => {
    try {
      await readResponse(await fetch(getApiUrl("saved-posts"), {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ postId, collection }),
      }));
      saved.setItems((current) => current.filter((entry) => entry.post.id !== postId || entry.collection !== collection));
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : t.error);
    }
  };

  const moveSaved = async (postId: string, previousCollection: string) => {
    const nextCollection = collectionNames[postId]?.trim();
    if (!nextCollection || nextCollection === previousCollection) return;
    try {
      await readResponse(await fetch(getApiUrl("saved-posts"), {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ postId, previousCollection, collection: nextCollection }),
      }));
      saved.setItems((current) => current.map((entry) =>
        entry.post.id === postId ? { ...entry, collection: nextCollection } : entry,
      ));
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : t.error);
    }
  };

  const renderLostFound = () => (
    <>
      <label className="pawly-community-search">
        <IconSearch size={17} />
        <input aria-label={t.search} placeholder={t.search} value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <CommunityForm title={t.report} submitLabel={t.publish} onSubmit={(event) => void submitLost(event)}>
        <label>{t.reportType}
          <select value={lostType} onChange={(event) => setLostType(event.target.value as "lost" | "found")}>
            <option value="lost">{t.lostPet}</option><option value="found">{t.foundPet}</option>
          </select>
        </label>
        <label>{t.petName}<input required maxLength={100} value={lostForm.petName} onChange={(event) => setLostForm({ ...lostForm, petName: event.target.value })} /></label>
        <label>{t.breed}<input maxLength={100} value={lostForm.breed} onChange={(event) => setLostForm({ ...lostForm, breed: event.target.value })} /></label>
        <label>{t.location}<input required maxLength={300} value={lostForm.location} onChange={(event) => setLostForm({ ...lostForm, location: event.target.value })} /></label>
        <label>{t.latitude}<input type="number" min="-90" max="90" step="any" value={lostForm.latitude} onChange={(event) => setLostForm({ ...lostForm, latitude: event.target.value })} /></label>
        <label>{t.longitude}<input type="number" min="-180" max="180" step="any" value={lostForm.longitude} onChange={(event) => setLostForm({ ...lostForm, longitude: event.target.value })} /></label>
        <label>{t.contact}<input required maxLength={200} value={lostForm.contact} onChange={(event) => setLostForm({ ...lostForm, contact: event.target.value })} /></label>
        <label className="pawly-community-wide">{t.description}<textarea required maxLength={2000} value={lostForm.description} onChange={(event) => setLostForm({ ...lostForm, description: event.target.value })} /></label>
      </CommunityForm>
      <div className="pawly-community-list" aria-live="polite">
        {lost.loading && <p role="status">{t.loading}</p>}
        {lost.error && <p role="alert">{lost.error}</p>}
        {!lost.loading && !lost.items.length && <p>{t.noListings}</p>}
        {lost.items.map((item) => {
          const mapUrl = item.latitude !== null && item.longitude !== null
            ? `https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=16/${item.latitude}/${item.longitude}`
            : `https://www.openstreetmap.org/search?query=${encodeURIComponent(item.location)}`;
          return <article className="pawly-community-card" key={item.id}>
            <span className={`pawly-community-status ${item.type}`}>{item.type === "lost" ? t.lostPet : t.foundPet}</span>
            <h3>{item.petName}{item.breed ? ` · ${item.breed}` : ""}</h3>
            <p>{item.description}</p>
            <span><IconMapPin size={15} /> {item.location}</span>
            <a href={mapUrl} target="_blank" rel="noreferrer">{t.openMap}</a>
            <span>{item.ownerName} · {item.contact}</span>
          </article>;
        })}
      </div>
      {role === "provider" && <section className="pawly-community-list">
        <h2>{t.applicationManagement}</h2>
        {applications.loading && <p role="status">{t.loading}</p>}
        {applications.error && <p role="alert">{applications.error}</p>}
        {!applications.loading && !applications.items.length && <p>{t.noApplications}</p>}
        {applications.items.map((item) => <article className="pawly-community-card" key={item.id}>
          <span>{item.petName} · {item.status}</span>
          <h3>{item.applicantName}</h3>
          <p>{item.message}</p>
          <span>{t.contact}: {item.contact}</span>
          {item.status === "submitted" && <div className="pawly-community-actions">
            <button className="pawly-primary-button" onClick={() => void updateApplication(item.id, "accepted")}>{t.acceptApplication}</button>
            <button className="pawly-secondary-button" onClick={() => void updateApplication(item.id, "rejected")}>{t.declineApplication}</button>
          </div>}
        </article>)}
      </section>}
    </>
  );

  const renderAdoptions = () => (
    <>
      <label className="pawly-community-search">
        <IconSearch size={17} />
        <input aria-label={t.search} placeholder={t.search} value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {role === "provider" && <CommunityForm title={t.addListing} submitLabel={t.publish} onSubmit={(event) => void submitAdoption(event)}>
        <label>{t.petName}<input required maxLength={100} value={adoptionForm.petName} onChange={(event) => setAdoptionForm({ ...adoptionForm, petName: event.target.value })} /></label>
        <label>{t.breed}<input required maxLength={100} value={adoptionForm.breed} onChange={(event) => setAdoptionForm({ ...adoptionForm, breed: event.target.value })} /></label>
        <label>{t.age}<input required maxLength={60} value={adoptionForm.age} onChange={(event) => setAdoptionForm({ ...adoptionForm, age: event.target.value })} /></label>
        <label>{t.location}<input required maxLength={300} value={adoptionForm.location} onChange={(event) => setAdoptionForm({ ...adoptionForm, location: event.target.value })} /></label>
        <label>{t.contact}<input required maxLength={200} value={adoptionForm.contact} onChange={(event) => setAdoptionForm({ ...adoptionForm, contact: event.target.value })} /></label>
        <label className="pawly-community-wide">{t.description}<textarea required maxLength={2000} value={adoptionForm.description} onChange={(event) => setAdoptionForm({ ...adoptionForm, description: event.target.value })} /></label>
      </CommunityForm>}
      <div className="pawly-community-list" aria-live="polite">
        {adoptions.loading && <p role="status">{t.loading}</p>}
        {adoptions.error && <p role="alert">{adoptions.error}</p>}
        {!adoptions.loading && !adoptions.items.length && <p>{t.noListings}</p>}
        {adoptions.items.map((item) => <article className="pawly-community-card" key={item.id}>
          <span className="pawly-community-status">{t.rescue}: {item.rescueName}</span>
          <h3><IconPaw size={18} /> {item.petName} · {item.breed}</h3>
          <p>{item.age} · {item.location}</p>
          <p>{item.description}</p>
          <span>{t.contact}: {item.contact}</span>
          {role === "owner" && <button className="pawly-secondary-button" onClick={() => setApplication({ listingId: item.id, message: "", contact: "" })}>{t.apply}</button>}
        </article>)}
      </div>
      {application && <div className="pawly-community-overlay">
        <CommunityForm title={t.apply} submitLabel={t.apply} onSubmit={(event) => void submitApplication(event)}>
          <label className="pawly-community-wide">{t.intro}<textarea required maxLength={2000} value={application.message} onChange={(event) => setApplication({ ...application, message: event.target.value })} /></label>
          <label>{t.contact}<input required maxLength={200} value={application.contact} onChange={(event) => setApplication({ ...application, contact: event.target.value })} /></label>
          <button type="button" className="pawly-secondary-button" onClick={() => setApplication(null)}>{t.remove}</button>
        </CommunityForm>
      </div>}
    </>
  );

  const renderSaved = () => (
    <div className="pawly-community-list">
      {saved.loading && <p role="status">{t.loading}</p>}
      {saved.error && <p role="alert">{saved.error}</p>}
      {!saved.loading && !saved.items.length && <p>{t.noSaved}</p>}
      {Array.from(saved.items.reduce((groups, entry) => {
        const group = groups.get(entry.collection) ?? [];
        group.push(entry);
        groups.set(entry.collection, group);
        return groups;
      }, new Map<string, SavedPost[]>())).map(([collection, entries]) => <section className="pawly-community-list" key={collection}>
        <h2>{collection}</h2>
        {entries.map(({ post }) => <article className="pawly-community-card" key={post.id}>
          <h3>{post.name} · @{post.handle}</h3>
          <p>{post.text}</p>
          {post.image && <img className="pawly-community-image" src={post.image} alt={post.imageAlt || "Pet"} />}
          <label>{t.collection}
            <input
              maxLength={80}
              value={collectionNames[post.id] ?? collection}
              onChange={(event) => setCollectionNames((current) => ({ ...current, [post.id]: event.target.value }))}
            />
          </label>
          <button className="pawly-secondary-button" onClick={() => void moveSaved(post.id, collection)}>{t.save}</button>
          <button className="pawly-secondary-button" onClick={() => void removeSaved(post.id, collection)}>{t.remove}</button>
        </article>)}
      </section>)}
    </div>
  );

  const renderAvailability = () => role !== "provider" ? <p role="status">{t.providerAvailabilityOnly}</p> : (
    <section className="pawly-community-form">
      <h2>{t.availability}</h2>
      <div className="pawly-community-form-grid">
        <label>{t.slotDate}<input type="date" min={new Date().toISOString().slice(0, 10)} value={slotDate} onChange={(event) => setSlotDate(event.target.value)} /></label>
        <label>{t.slotTime}<input type="time" value={slotTime} onChange={(event) => setSlotTime(event.target.value)} /></label>
      </div>
      <button className="pawly-secondary-button" onClick={addSlot}>{t.addSlot}</button>
      {availabilityLoaded && slots.length === 0 && <p>{t.noSlots}</p>}
      {availabilityError && <p className="pawly-inline-error" role="alert">{availabilityError}</p>}
      <ul className="pawly-availability-list">
        {slotLabels.map((slot) => <li key={slot.value}>
          <time dateTime={slot.value}>{slot.label}</time>
          <button className="pawly-secondary-button" onClick={() => setSlots((current) => current.filter((value) => value !== slot.value))}>{t.remove}</button>
        </li>)}
      </ul>
      <button className="pawly-primary-button" disabled={!availabilityLoaded || Boolean(availabilityError)} onClick={() => void saveAvailability()}>{t.saveAvailability}</button>
    </section>
  );

  return (
    <FeedColumn lang={language} className="pawly-community-page">
      <header className="pawly-community-heading">
        <div><h1>{t.title}</h1><p>{t.subtitle}</p></div>
        <label className="pawly-community-language">{t.language}
          <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
            <option value="en">English</option><option value="es">Español</option><option value="fr">Français</option>
          </select>
        </label>
      </header>
      <div className="pawly-community-tabs" role="tablist" aria-label={t.title}>
        {featureTabs.map((key) => <button
          key={key}
          id={`community-tab-${key}`}
          role="tab"
          aria-selected={tab === key}
          aria-controls={`community-panel-${key}`}
          onClick={() => setTab(key)}
          onKeyDown={(event) => {
            const current = featureTabs.indexOf(key);
            const next = event.key === "ArrowRight"
              ? (current + 1) % featureTabs.length
              : event.key === "ArrowLeft"
                ? (current - 1 + featureTabs.length) % featureTabs.length
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? featureTabs.length - 1
                    : current;
            if (next !== current) {
              event.preventDefault();
              setTab(featureTabs[next]);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
            }
          }}
        >{t[key]}</button>)}
      </div>
      <section id={`community-panel-${tab}`} role="tabpanel" aria-labelledby={`community-tab-${tab}`} className="pawly-community-panel">
        {tab === "lost" && renderLostFound()}
        {tab === "adoption" && renderAdoptions()}
        {tab === "saved" && renderSaved()}
        {tab === "availability" && renderAvailability()}
      </section>
    </FeedColumn>
  );
}
