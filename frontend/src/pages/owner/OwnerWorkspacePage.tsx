import type { Appointment, FeedPost, Pet } from "../../data/models";
import { useRef, useState } from "react";
import {
  IconArrowRight,
  IconBell,
  IconCalendar,
  IconHeart,
  IconMapPin,
  IconMoon,
  IconLogout,
  IconPaw,
  IconShieldCheck,
  IconSun,
} from "@tabler/icons-react";

type ThemeMode = "dark" | "light";

function PreferenceRow({
  icon: Icon,
  title,
  detail,
  checked,
  onChange,
}: {
  icon: typeof IconBell;
  title: string;
  detail: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex min-h-[66px] items-center gap-[11px] border-t border-[var(--pawly-border)]">
      <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-[var(--pawly-card-deep)] text-[var(--pawly-accent)]"><Icon size={18} /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <strong className="text-[14.5px] font-semibold">{title}</strong>
        <small className="text-[14.5px] text-[var(--pawly-muted)]">{detail}</small>
      </span>
      <button
        className={`relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full border p-0 transition-colors ${checked ? "border-[var(--pawly-accent)] bg-[var(--pawly-accent)]" : "border-[var(--pawly-border-strong)] bg-[var(--pawly-card-deep)]"}`}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onChange}
      >
        <span className={`absolute top-[3px] size-[14px] rounded-full transition-all ${checked ? "left-[19px] bg-[var(--pawly-bg)]" : "left-[3px] bg-[var(--pawly-muted)]"}`} />
      </button>
    </div>
  );
}

export function OwnerWorkspacePage({
  page,
  pets,
  appointments,
  posts,
  favoriteCount,
  theme,
  user,
  onThemeChange,
  onSignOut,
  onProfilePictureChange,
  onNavigate,
  onFindCare,
}: {
  page: string;
  pets: Pet[];
  appointments: Appointment[];
  posts: FeedPost[];
  favoriteCount: number;
  theme: ThemeMode;
  user: { name: string; email: string; picture: string | null } | null;
  onThemeChange: () => void;
  onSignOut: () => void;
  onProfilePictureChange: (file: File) => void;
  onNavigate: (page: string) => void;
  onFindCare: () => void;
}) {
  const [careReminders, setCareReminders] = useState(
    () => typeof window === "undefined" || window.localStorage.getItem("pawly-care-reminders") !== "false",
  );
  const [publicProfile, setPublicProfile] = useState(
    () => typeof window === "undefined" || window.localStorage.getItem("pawly-public-profile") !== "false",
  );
  const profilePictureInputRef = useRef<HTMLInputElement>(null);
  const upcomingAppointments = appointments.filter(
    (appointment) => appointment.status === "PENDING" || appointment.status === "CONFIRMED",
  );

  const togglePreference = (
    key: string,
    currentValue: boolean,
    setValue: (value: boolean) => void,
  ) => {
    const nextValue = !currentValue;
    setValue(nextValue);
    window.localStorage.setItem(key, String(nextValue));
  };

  if (page === "settings") {
    return (
      <div className="mx-auto min-h-full w-full max-w-[780px] border-x border-white/[0.07] px-8 pt-[27px] pb-[60px] max-[980px]:border-0 max-[980px]:px-4 max-[980px]:pb-[45px] min-[1280px]:max-w-[820px] min-[1280px]:px-10">
        <header className="mb-[25px]">
          <span className="text-[14.5px] font-bold tracking-[0.11em] text-[var(--pawly-muted)]">YOUR ACCOUNT</span>
          <h1 className="my-[3px] text-[25px] font-semibold">Settings</h1>
          <p className="m-0 text-[14.5px] text-[var(--pawly-muted)]">Make Pawly feel right for you and your pets.</p>
        </header>
        <section className="mb-5 rounded-[11px] border border-[var(--pawly-border)] bg-[var(--pawly-card)] px-[15px] pt-[13px] pb-1">
          <h2 className="mb-2 text-[14.5px] font-semibold">Appearance</h2>
          <PreferenceRow
            icon={theme === "dark" ? IconMoon : IconSun}
            title={`${theme === "dark" ? "Dark" : "Light"} appearance`}
            detail="Choose the look you prefer across Pawly."
            checked={theme === "dark"}
            onChange={onThemeChange}
          />
        </section>
        <section className="mb-5 rounded-[11px] border border-[var(--pawly-border)] bg-[var(--pawly-card)] px-[15px] pt-[13px] pb-1">
          <h2 className="mb-2 text-[14.5px] font-semibold">Notifications</h2>
          <PreferenceRow
            icon={IconBell}
            title="Care reminders"
            detail="Get reminders for upcoming pet appointments."
            checked={careReminders}
            onChange={() => togglePreference("pawly-care-reminders", careReminders, setCareReminders)}
          />
        </section>
        <section className="mb-5 rounded-[11px] border border-[var(--pawly-border)] bg-[var(--pawly-card)] px-[15px] pt-[13px] pb-1">
          <h2 className="mb-2 text-[14.5px] font-semibold">Privacy</h2>
          <PreferenceRow
            icon={IconShieldCheck}
            title="Public profile"
            detail="Let other pet owners find your profile and posts."
            checked={publicProfile}
            onChange={() => togglePreference("pawly-public-profile", publicProfile, setPublicProfile)}
          />
        </section>
        <p className="text-center text-[14.5px] text-[var(--pawly-muted)]">Preferences are saved on this device.</p>
      </div>
    );
  }

  if (page === "profile") {
    return (
      <div className="mx-auto min-h-full w-full max-w-[780px] border-x border-white/[0.07] px-8 pt-[27px] pb-[60px] max-[980px]:border-0 max-[980px]:px-4 max-[980px]:pb-[45px] min-[1280px]:max-w-[820px] min-[1280px]:px-10">
        <header className="flex flex-col items-center gap-3 px-0 pt-[3px] pb-5 text-center">
          <button
            className="group relative size-[112px] shrink-0 overflow-hidden rounded-full border border-[var(--pawly-border)] bg-[var(--pawly-card-deep)] text-[var(--pawly-muted)]"
            type="button"
            aria-label="Change profile picture"
            onClick={() => profilePictureInputRef.current?.click()}
          >
            {user?.picture ? (
              <img className="size-full object-cover" src={user.picture} alt="" />
            ) : (
              <span className="grid size-full place-items-center"><IconPaw size={38} /></span>
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/55 text-[12px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              Change photo
            </span>
          </button>
          <input
            ref={profilePictureInputRef}
            className="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-label="Choose profile picture"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) onProfilePictureChange(file);
              event.currentTarget.value = "";
            }}
          />
          <div className="min-w-0">
            <h1 className="my-[3px] text-[25px] font-semibold">{user?.name || "Your profile"}</h1>
            <p className="m-0 break-all text-[14.5px] text-[var(--pawly-muted)]">{user?.email || "Your pets and shared moments will appear here."}</p>
          </div>
        </header>
        <section className="mb-[25px] rounded-[11px] border border-[var(--pawly-border)] bg-[var(--pawly-card)] p-4">
          <h2 className="mb-1 text-[15px] font-semibold">Account</h2>
          <p className="mb-3 mt-0 text-[14.5px] text-[var(--pawly-muted)]">Manage your Pawly account and sign-in.</p>
          <button
            className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-[var(--pawly-border-strong)] bg-transparent px-3 text-[14.5px] text-[var(--pawly-text)]"
            type="button"
            onClick={onSignOut}
          >
            <IconLogout size={16} /> Sign out
          </button>
        </section>
        <div className="mb-[25px] grid grid-cols-3 rounded-[11px] border border-[var(--pawly-border)] bg-[var(--pawly-card)]">
          <div className="flex min-h-[65px] flex-col items-center justify-center gap-px"><strong className="text-base">{pets.length}</strong><span className="text-[14.5px] text-[var(--pawly-muted)]">Pets</span></div>
          <button className="flex min-h-[65px] cursor-pointer flex-col items-center justify-center gap-px border-0 border-l border-[var(--pawly-border)] bg-transparent text-[var(--pawly-text)]" type="button" onClick={() => onNavigate("my-posts")}><strong className="text-base">{posts.length}</strong><span className="text-[14.5px] text-[var(--pawly-muted)]">Posts</span></button>
          <button className="flex min-h-[65px] cursor-pointer flex-col items-center justify-center gap-px border-0 border-l border-[var(--pawly-border)] bg-transparent text-[var(--pawly-text)]" type="button" onClick={() => onNavigate("favorites")}><strong className="text-base">{favoriteCount}</strong><span className="text-[14.5px] text-[var(--pawly-muted)]">Saved care</span></button>
        </div>
        <section className="mb-[25px]">
          <div className="mb-[10px] flex items-end justify-between gap-[10px]">
            <div><span className="text-[14.5px] font-bold tracking-[0.11em] text-[var(--pawly-muted)]">YOUR FAMILY</span><h2 className="mt-0.5 text-[15px] font-semibold">My pets</h2></div>
            <button className="flex items-center gap-[3px] border-0 bg-transparent text-[14.5px] text-[var(--pawly-secondary-text)]" onClick={() => onNavigate("pets")}>See all <IconArrowRight size={15} /></button>
          </div>
          <div className="grid grid-cols-2 gap-[9px] max-[520px]:grid-cols-1">
            {pets.map((pet) => (
              <article className="flex min-w-0 items-center gap-[10px] rounded-[10px] border border-[var(--pawly-border)] bg-[var(--pawly-card)] p-[9px]" key={pet.id}>
                <img className="size-[45px] shrink-0 rounded-lg object-cover" src={pet.image} alt={pet.name} loading="lazy" decoding="async" />
                <span className="flex min-w-0 flex-1 flex-col"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px]">{pet.name}</strong><small className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] text-[var(--pawly-muted)]">{pet.breed} · {pet.age}</small></span>
              </article>
            ))}
            {!pets.length && <p className="m-0 text-[14.5px] text-[var(--pawly-muted)]">Add a pet to introduce your family.</p>}
          </div>
        </section>
        <section className="mb-[25px]">
          <div className="mb-[10px] flex items-end justify-between gap-[10px]">
            <div><span className="text-[14.5px] font-bold tracking-[0.11em] text-[var(--pawly-muted)]">CARE PLAN</span><h2 className="mt-0.5 text-[15px] font-semibold">Upcoming appointments</h2></div>
            <button className="flex items-center gap-[3px] border-0 bg-transparent text-[14.5px] text-[var(--pawly-secondary-text)]" onClick={() => onNavigate("appointments")}>See all <IconArrowRight size={15} /></button>
          </div>
          {upcomingAppointments.slice(0, 2).map((appointment) => (
            <article className="mb-[7px] flex min-w-0 items-center gap-[10px] rounded-[10px] border border-[var(--pawly-border)] bg-[var(--pawly-card)] p-[9px]" key={appointment.id}>
              <span className="grid size-[35px] shrink-0 place-items-center rounded-lg bg-[var(--pawly-card-deep)] text-[var(--pawly-accent)]"><IconCalendar size={18} /></span>
              <span className="flex min-w-0 flex-1 flex-col"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px]">{appointment.service} · {appointment.petName}</strong><small className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] text-[var(--pawly-muted)]">{appointment.providerName} · {appointment.date}, {appointment.time}</small></span>
              <span className="rounded-[5px] bg-[var(--pawly-card-deep)] px-[5px] py-[3px] text-[12px] text-[var(--pawly-muted)]">{appointment.status.replace(/_/g, " ")}</span>
            </article>
          ))}
          {!upcomingAppointments.length && <p className="m-0 text-[14.5px] text-[var(--pawly-muted)]">No upcoming visits. Book care when your pet needs it.</p>}
          <button className="mt-1 inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[var(--pawly-border-strong)] bg-transparent px-3.5 text-[14.5px] text-[var(--pawly-text)]" onClick={onFindCare}>
            <IconMapPin size={16} /> Find pet care
          </button>
        </section>
        <section className="mb-[25px]">
          <div className="mb-[10px] flex items-end justify-between gap-[10px]">
            <div><span className="text-[14.5px] font-bold tracking-[0.11em] text-[var(--pawly-muted)]">COMMUNITY</span><h2 className="mt-0.5 text-[15px] font-semibold">Recent posts</h2></div>
            <button className="flex items-center gap-[3px] border-0 bg-transparent text-[14.5px] text-[var(--pawly-secondary-text)]" onClick={() => onNavigate("home")}>Open feed <IconArrowRight size={15} /></button>
          </div>
          {posts.length ? posts.slice(0, 3).map((post) => (
            <article className="border-t border-[var(--pawly-border)] py-3" key={post.id}>
              <p className="mb-[7px] text-[14.5px]">{post.text}</p>
              <span className="flex items-center gap-[5px] text-[14.5px] text-[var(--pawly-muted)]"><IconHeart size={14} /> {post.likes} · {post.time}</span>
            </article>
          )) : <p className="m-0 text-[14.5px] text-[var(--pawly-muted)]">Your shared moments will appear here.</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-[780px] border-x border-white/[0.07] px-8 pt-5 pb-[60px] max-[980px]:border-0 max-[980px]:px-4 max-[980px]:pb-[45px] min-[1280px]:max-w-[820px] min-[1280px]:px-10">
      <section className="mt-9 flex min-h-[260px] flex-col items-center justify-center rounded-[13px] border border-[var(--pawly-border)] bg-[var(--pawly-card-deep)] p-6 text-center">
        <div className="mb-[14px] grid size-[47px] place-items-center rounded-[14px] border border-[var(--pawly-border)] bg-[var(--pawly-card)] text-[var(--pawly-accent)]"><IconPaw /></div>
        <h2 className="mb-[5px] text-[15px]">Your Pawly workspace</h2>
        <p className="mb-4 max-w-[300px] text-[14.5px] text-[var(--pawly-muted)]">
          Manage your pets, appointments, and care providers from one place.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="inline-flex min-h-[39px] cursor-pointer items-center justify-center rounded-lg border border-[var(--pawly-border-strong)] bg-[var(--pawly-card)] px-3.5 text-[14.5px] font-semibold text-[var(--pawly-text)]" onClick={() => onNavigate("pets")}>
            View pets
          </button>
          <button className="inline-flex min-h-[39px] cursor-pointer items-center justify-center rounded-lg border border-[var(--pawly-border-strong)] bg-[var(--pawly-card)] px-3.5 text-[14.5px] font-semibold text-[var(--pawly-text)]" onClick={() => onNavigate("appointments")}>
            Appointments
          </button>
          <button className="inline-flex min-h-[39px] cursor-pointer items-center justify-center rounded-lg bg-[var(--pawly-accent)] px-3.5 text-[14.5px] font-semibold text-[var(--pawly-bg)]" onClick={onFindCare}>
            Discover care
          </button>
        </div>
      </section>
    </div>
  );
}
