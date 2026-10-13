import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { adminDataResources, getAdminData, getAdminDashboard, getAdminReviews, getAdminSession, performAdminAction, uploadAdminAvatar, type AdminDataPage, type AdminDataResource, type AdminModerationReview } from "../../data/admin-api";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import {
	IconActivity,
	IconAlertTriangle,
	IconBuildingStore,
	IconCamera,
	IconCheck,
	IconDatabase,
	IconFolder,
	IconPlus,
	IconSearch,
	IconShieldLock,
	IconTrash,
	IconUsers,
} from "@tabler/icons-react";

export type AdminRole = "admin" | "superadmin";
export type AdminSection = "overview" | "projects" | "users" | "verifications" | "reviews" | "reports" | "data" | "team";

type Project = {
	id: string;
	name: string;
	category: string;
	description: string;
	region: string;
	members: number;
	status: "active" | "paused";
};

type ManagedUser = {
	id: string;
	name: string;
	email: string;
	location: string;
	avatar: string;
	type: "Pet owner" | "Provider";
	status: "active" | "suspended";
	verified: boolean;
};

type ProviderRequest = {
	id: string;
	name: string;
	email: string;
	category: string;
	location: string;
	countryCode: string;
	license: string;
	status: "pending" | "needs-info";
};

type Report = {
	id: string;
	postId: string;
	author: string;
	reason: string;
	excerpt: string;
	reportedBy: string;
	time: string;
};

type TeamMember = {
	id: string;
	name: string;
	email: string;
	avatar: string;
	role: AdminRole;
	status: "active" | "suspended";
};

const sections: { id: AdminSection; label: string; iconSrc: string }[] = [
	{ id: "overview", label: "Overview", iconSrc: "/admin/overviews.png" },
	{ id: "projects", label: "Projects", iconSrc: "/admin/projects.png" },
	{ id: "users", label: "Users", iconSrc: "/admin/user.png" },
	{ id: "verifications", label: "Verifications", iconSrc: "/admin/verif.png" },
	{ id: "reviews", label: "Reviews", iconSrc: "/admin/reviews.png" },
	{ id: "reports", label: "Reports", iconSrc: "/admin/report.png" },
	{ id: "data", label: "Database records", iconSrc: "" },
	{ id: "team", label: "Admin team", iconSrc: "/admin/admin.png" },
];

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" }) {
	const tones = {
		neutral: "bg-slate-100 text-slate-700",
		green: "bg-emerald-50 text-emerald-700",
		amber: "bg-amber-50 text-amber-800",
		red: "bg-rose-50 text-rose-700",
	};
	const indicators = {
		neutral: "bg-slate-400",
		green: "bg-emerald-600",
		amber: "bg-amber-500",
		red: "bg-rose-600",
	};

	return <span className={`inline-flex items-center gap-2 rounded-full border border-slate-200 px-2.5 py-1 text-xs capitalize ${tones[tone]}`}><span aria-hidden="true" className={`size-1.5 rounded-full ${indicators[tone]}`} />{children}</span>;
}

function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
	return (
		<div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
			<div>
				<p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Pawly platform operations</p>
				<h1 className="text-2xl tracking-tight text-[#1C1C1C] sm:text-3xl">{title}</h1>
				<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
			</div>
			{action}
		</div>
	);
}

const primaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 text-sm text-[#1C1C1C] transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1C1C]";
const secondaryButton = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#1C1C1C] transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1C1C]";
const fieldStyle = "min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#1C1C1C] outline-none placeholder:text-slate-400 transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100";
const adminThemeClasses = "[&_*]:!text-[#1C1C1C] [&_*]:!font-normal [&_*]:!text-[13.5px] [&_article]:!border-slate-200 [&_article]:!bg-[#FFFAF3] [&_section]:!border-slate-200 [&_section]:!bg-[#FFFAF3] [&_form]:!border-slate-200 [&_form]:!bg-[#FFFAF3] [&_aside]:!border-slate-200 [&_aside]:!bg-[#FFFAF3] [&_main]:!bg-[#FFFAF3] [&_nav]:!bg-[#FFFAF3] [&_.bg-white]:!bg-[#FFFAF3] [&_.bg-slate-50]:!bg-[#FFFAF3] [&_.bg-slate-100]:!bg-[#FFFAF3] [&_.bg-emerald-50]:!bg-[#FFFAF3] [&_.bg-amber-50]:!bg-[#FFFAF3] [&_.bg-rose-50]:!bg-[#FFFAF3] [&_.bg-slate-200]:!bg-[#FFFAF3] [&_select]:!border-slate-300 [&_select]:!bg-[#FFFAF3] [&_.border-black]:!border-slate-200 [&_.border-gray-700]:!border-slate-200 [&_.border-gray-600]:!border-slate-200 [&_.border-slate-100]:!border-slate-200 [&_.border-slate-200]:!border-slate-200 [&_.border-slate-300]:!border-slate-200 [&_.border-emerald-200]:!border-slate-200 [&_.border-amber-200]:!border-slate-200 [&_.border-rose-200]:!border-slate-200 [&_.overflow-x-auto]:!border-slate-200 [&_.overflow-x-auto]:!bg-[#FFFAF3] [&_span.rounded-full]:!border-slate-200";

export function AdminWorkspacePage({
	role = "admin",
	onSignOut,
}: {
	role?: AdminRole;
	onSignOut?: () => void;
}) {
	const navigate = useNavigate();
	const [section, setSection] = useState<AdminSection>("overview");
	const [currentRole] = useState<AdminRole>(role);
	const [adminProfile, setAdminProfile] = useState(() => getAdminSession()?.account ?? null);
	const [adminAvatar, setAdminAvatar] = useState(() => getAdminSession()?.account.avatar ?? "");
	const avatarInputRef = useRef<HTMLInputElement>(null);
	const visibleSections = currentRole === "superadmin" ? sections : sections.filter((item) => item.id !== "team");
	const [projects, setProjects] = useState<Project[]>([]);
	const [users, setUsers] = useState<ManagedUser[]>([]);
	const [requests, setRequests] = useState<ProviderRequest[]>([]);
	const [reports, setReports] = useState<Report[]>([]);
	const [pendingReviews, setPendingReviews] = useState<AdminModerationReview[]>([]);
	const [dataResource, setDataResource] = useState<AdminDataResource>("users");
	const [dataPage, setDataPage] = useState(1);
	const [dataResult, setDataResult] = useState<AdminDataPage | null>(null);
	const [dataLoading, setDataLoading] = useState(false);
	const [dataError, setDataError] = useState("");
	const [team, setTeam] = useState<TeamMember[]>([]);
	const [userQuery, setUserQuery] = useState("");
	const [projectFormOpen, setProjectFormOpen] = useState(false);
	const [notice, setNotice] = useState("");
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState("");

	useEffect(() => {
		if (section !== "data") return;
		const controller = new AbortController();
		void getAdminData(dataResource, dataPage, controller.signal)
			.then((result) => {
				if (!controller.signal.aborted) setDataResult(result);
			})
			.catch((error: unknown) => {
				if (!controller.signal.aborted) {
					setDataResult(null);
					setDataError(error instanceof Error ? error.message : "Unable to load admin records.");
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) setDataLoading(false);
			});
		return () => controller.abort();
	}, [dataPage, dataResource, section]);

	useEffect(() => {
		if (section !== "reviews") return;
		const controller = new AbortController();
		void getAdminReviews(controller.signal).then((reviews) => {
			if (!controller.signal.aborted) setPendingReviews(reviews);
		}).catch((error: unknown) => {
			if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : "Unable to load review queue.");
		});
		return () => controller.abort();
	}, [section]);

	const moderateReview = async (review: AdminModerationReview, decision: "approve" | "reject") => {
		await performAdminAction("admin/reviews", { reviewId: review.id, decision });
		setPendingReviews((current) => current.filter((item) => item.id !== review.id));
	};

	const refreshDashboard = useCallback(async () => {
		setLoading(true);
		try {
			const dashboard = await getAdminDashboard();
			setUsers(dashboard.users);
			setProjects(dashboard.projects);
			setRequests(dashboard.requests);
			setReports(dashboard.reports);
			setTeam(dashboard.team.map((member) => ({ ...member, avatar: member.avatar ?? "" })));
			setAdminProfile(dashboard.profile);
			setAdminAvatar(dashboard.profile.avatar ?? "");
			setLoadError("");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		let mounted = true;
		void getAdminDashboard()
			.then((dashboard) => {
				if (!mounted) return;
				setUsers(dashboard.users);
				setProjects(dashboard.projects);
				setRequests(dashboard.requests);
				setReports(dashboard.reports);
				setTeam(dashboard.team.map((member) => ({ ...member, avatar: member.avatar ?? "" })));
				setAdminProfile(dashboard.profile);
				setAdminAvatar(dashboard.profile.avatar ?? "");
				setLoadError("");
			})
			.catch((error: unknown) => {
				if (mounted) setLoadError(error instanceof Error ? error.message : "Unable to load admin data.");
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});
		return () => { mounted = false; };
	}, []);

	const runAction = useCallback(async (resource: string, body: unknown): Promise<boolean> => {
		setNotice("");
		try {
			await performAdminAction(resource, body);
			await refreshDashboard();
			return true;
		} catch (error) {
			setNotice(error instanceof Error ? error.message : "Unable to save this change.");
			return false;
		}
	}, [refreshDashboard]);

	const pendingCount = requests.length;
	const activeProjects = projects.filter((project) => project.status === "active").length;
	const activeUsers = users.filter((user) => user.status === "active").length;
	const activeUserProfiles = users.filter((user) => user.status === "active");
	const filteredUsers = useMemo(() => {
		const query = userQuery.trim().toLowerCase();
		return users.filter((user) => `${user.name} ${user.email} ${user.location}`.toLowerCase().includes(query));
	}, [userQuery, users]);

	const addProject = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const name = String(data.get("name") ?? "").trim();
		if (!name) return;
		const created = await runAction("admin/projects", {
			name,
			category: String(data.get("category") ?? "Community"),
			description: String(data.get("description") ?? ""),
			region: String(data.get("region") ?? "Global"),
		});
		if (created) setProjectFormOpen(false);
	};

	const toggleProject = (project: Project) => runAction("admin/projects/status", {
		id: project.id,
		status: project.status === "active" ? "paused" : "active",
	});

	const toggleUser = (user: ManagedUser) => runAction("admin/users/status", {
		id: user.id,
		status: user.status === "active" ? "suspended" : "active",
	});

	const toggleUserVerification = (user: ManagedUser) => runAction("admin/users/verification", {
		id: user.id,
		verified: !user.verified,
	});

	const acknowledgeReport = (report: Report, removePost: boolean) => runAction(
		"admin/reports/status",
		{ id: report.id, action: removePost ? "remove" : "dismiss" },
	);

	const approveRequest = (request: ProviderRequest) => runAction("admin/providers/status", {
		id: request.id,
		status: "active",
	});

	const updateAdminPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = "";
		if (!file) return;
		if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
			setNotice("Choose a PNG, JPEG, or WebP image.");
			return;
		}
		if (file.size > 4 * 1024 * 1024) {
			setNotice("Profile pictures must be smaller than 4 MB.");
			return;
		}

		try {
			const avatar = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => typeof reader.result === "string"
					? resolve(reader.result)
					: reject(new Error("Unable to read the selected image."));
				reader.onerror = () => reject(reader.error ?? new Error("Unable to read the selected image."));
				reader.readAsDataURL(file);
			});
			const savedAvatar = await uploadAdminAvatar(avatar);
			setAdminAvatar(savedAvatar);
			setAdminProfile((current) => current ? { ...current, avatar: savedAvatar } : current);
			setTeam((current) => current.map((member) => (
				member.email.toLowerCase() === (adminProfile?.email ?? "").toLowerCase()
					? { ...member, avatar: savedAvatar }
					: member
			)));
		} catch (error) {
			setNotice(error instanceof Error ? error.message : "Unable to update the profile picture.");
		}
	};

	return (
		<div className={`pawly-admin-workspace font-poppins flex min-h-screen bg-[#FFFAF3] text-[13.5px] text-[#1C1C1C] ${adminThemeClasses}`}>
			<input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { void updateAdminPhoto(event); }} />
			<aside className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col items-center border-r border-slate-200 bg-white py-5 text-[#1C1C1C]">
				<a href="/admin" aria-label="Pawly admin home" title="Pawly admin" className="mb-9 grid size-10 place-items-center overflow-hidden rounded-lg bg-white p-1">
					<img src="/admin/aadmin.png" alt="" className="size-full object-cover" />
				</a>
				<nav aria-label="Admin sections" className="flex w-full flex-col items-center gap-2 px-2">
					{visibleSections.map((item) => (
						<button
							key={item.id}
							type="button"
							title={item.label}
							aria-label={item.label}
							aria-current={section === item.id ? "page" : undefined}
							onClick={() => {
								setSection(item.id);
								setNotice("");
								if (item.id === "data" && section !== "data") {
									setDataLoading(true);
									setDataError("");
								}
							}}
							className={`relative grid size-11 place-items-center rounded-xl !text-[#1C1C1C] transition-colors ${section === item.id ? "border border-dashed border-[#E2E8F1] bg-slate-100 before:absolute before:left-0 before:h-5 before:w-1 before:rounded-r-full before:bg-[#1C1C1C]" : "border-0 bg-transparent hover:bg-slate-50"}`}
						>
							{item.id === "data"
								? <IconDatabase size={22} aria-hidden="true" />
								: <img src={item.iconSrc} alt="" aria-hidden="true" className="size-[22px] object-contain" />}
							{item.id === "verifications" && pendingCount > 0 && <span className="sr-only">{pendingCount} pending</span>}
						</button>
					))}
				</nav>
				<button
					type="button"
					title="Log out"
					aria-label="Log out"
					onClick={onSignOut ?? (() => window.location.assign("/admin/login"))}
					className="mt-auto grid size-10 place-items-center rounded-lg border border-slate-300 bg-white p-2 transition hover:bg-slate-100"
				>
					<img src="/off.png" alt="" className="size-full object-contain" />
				</button>
			</aside>

			<div className="ml-16 flex min-w-0 flex-1">
				<aside aria-label="Administrator profile" className="sticky top-0 hidden h-screen w-[360px] shrink-0 flex-col border-r border-slate-200 bg-white px-6 py-8 xl:flex">
					<p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Admin account</p>
					<p className="mb-6 text-sm text-slate-500">{currentRole === "superadmin" ? "Superadmin account" : "Admin account"}</p>
					<div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
						{adminAvatar
							? <img src={adminAvatar} alt="Admin profile" className="mx-auto size-20 rounded-2xl border border-slate-200 object-cover" />
							: <div className="mx-auto grid size-20 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600"><IconShieldLock size={34} /></div>}
						<h2 className="mt-5 text-lg text-[#1C1C1C]">{adminProfile?.name || "Administrator"}</h2>
						<p className="mt-1 break-all text-sm text-slate-500">{adminProfile?.email}</p>
						<p className="mt-1 text-sm text-slate-500">{currentRole === "superadmin" ? "Superadmin access" : "Admin access"}</p>
						<button type="button" className={`${secondaryButton} mt-4`} onClick={() => avatarInputRef.current?.click()}><IconCamera size={16} /> Upload picture</button>
					</div>
				</aside>

				<div className="flex min-w-0 flex-1 flex-col bg-white">
					<div className="flex min-w-0 flex-1 items-start">
						<main className="mx-auto w-full max-w-6xl min-w-0 flex-1 bg-white px-5 py-8 sm:px-7 lg:px-10">
					<div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 xl:hidden">
						{adminAvatar
							? <img src={adminAvatar} alt="Admin profile" className="size-12 rounded-full border border-slate-200 object-cover" />
							: <span className="grid size-12 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-600"><IconShieldLock size={22} /></span>}
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm">{adminProfile?.name || "Administrator"}</p>
							<p className="truncate text-xs text-slate-500">{adminProfile?.email}</p>
						</div>
						<button type="button" className={secondaryButton} onClick={() => avatarInputRef.current?.click()}><IconCamera size={16} /> Upload</button>
					</div>
					{notice && (
						<div role="status" className="mb-5 flex items-center justify-between gap-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
							<span>{notice}</span>
							<button type="button" onClick={() => setNotice("")} aria-label="Dismiss message" className="font-semibold">×</button>
						</div>
					)}
					{loadError && (
						<div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
							<span>{loadError}</span>
							<button type="button" className={secondaryButton} onClick={() => { void refreshDashboard().catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "Unable to load admin data.")); }}>Retry</button>
						</div>
					)}
					{loading && <p role="status" className="mb-4 text-sm text-slate-500">Refreshing dashboard data…</p>}

					{section === "overview" && (
						<>
							<PageHeading title="Overview" description="Monitor projects, community activity, and provider trust across Pawly." />
							{projects.some((project) => project.status === "paused") && (
								<div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
									<IconAlertTriangle size={18} className="shrink-0 text-amber-700" />
									<span className="flex-1">One project is paused and may need an operations review.</span>
									<button type="button" onClick={() => setSection("projects")} className="font-semibold underline decoration-amber-400 underline-offset-2">Review projects</button>
								</div>
							)}
							<section aria-label="Platform metrics" className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
								{[
									{ label: "Managed projects", value: projects.length, detail: `${activeProjects} active`, icon: <IconFolder size={19} /> },
									{ label: "Community users", value: users.length, detail: `${activeUsers} active`, icon: <IconUsers size={19} /> },
									{ label: "Pending verifications", value: pendingCount, detail: "Credentials to review", icon: <IconBuildingStore size={19} /> },
									{ label: "Open reports", value: reports.length, detail: "Moderation queue", icon: <IconAlertTriangle size={19} /> },
								].map((metric) => (
									<article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5">
										<div className="flex items-center justify-between text-slate-500"><span className="text-sm">{metric.label}</span><span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-[#1C1C1C]">{metric.icon}</span></div>
										<p className="mt-5 text-3xl tracking-tight text-[#1C1C1C]">{metric.value.toLocaleString()}</p>
										<p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
									</article>
								))}
							</section>

							<div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
								<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
									<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
										<div><h2 className="text-sm font-semibold text-slate-900">Projects & services</h2><p className="mt-1 text-xs text-slate-500">Current platform availability</p></div>
										<button type="button" onClick={() => setSection("projects")} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">View all</button>
									</div>
									<div className="divide-y divide-slate-100 px-5">
										{projects.slice(0, 4).map((project) => (
											<div key={project.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
												<div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{project.name}</p><p className="mt-1 text-xs text-slate-500">{project.description}</p></div>
												<StatusBadge tone={project.status === "active" ? "green" : "amber"}>{project.status}</StatusBadge>
											</div>
										))}
									</div>
								</section>
								<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
									<div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
										<div><h2 className="text-sm font-semibold text-slate-900">Verification queue</h2><p className="mt-1 text-xs text-slate-500">Provider applications awaiting review</p></div>
										<button type="button" onClick={() => setSection("verifications")} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">View all</button>
									</div>
									<div className="divide-y divide-slate-100 px-5">
										{requests.slice(0, 3).map((request) => (
											<div key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
												<div><p className="text-sm font-medium text-slate-900">{request.name}</p><p className="mt-1 text-xs text-slate-500">{request.category} · {request.location}</p></div>
												<StatusBadge tone={request.status === "pending" ? "amber" : "neutral"}>{request.status === "needs-info" ? "Needs info" : "Pending"}</StatusBadge>
											</div>
										))}
									</div>
								</section>
							</div>
						</>
					)}

					{section === "projects" && (
						<>
							<PageHeading title="Projects & services" description="Manage Pawly products, service areas, and operational status." action={<button type="button" className={primaryButton} onClick={() => setProjectFormOpen((open) => !open)}><IconPlus size={17} /> Add project</button>} />
							{projectFormOpen && (
								<form onSubmit={addProject} className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 xl:grid-cols-4">
									<label className="text-xs font-medium text-slate-600">Project name<input name="name" required className={`${fieldStyle} mt-1`} /></label>
									<label className="text-xs font-medium text-slate-600">Category<input name="category" className={`${fieldStyle} mt-1`} /></label>
									<label className="text-xs font-medium text-slate-600">Region<input name="region" className={`${fieldStyle} mt-1`} /></label>
									<label className="text-xs font-medium text-slate-600">Description<input name="description" className={`${fieldStyle} mt-1`} /></label>
									<button type="submit" className={`${primaryButton} sm:col-span-2 xl:col-span-4`}>Save project</button>
								</form>
							)}
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								{projects.map((project) => (
									<article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-6">
										<div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{project.category}</p><h2 className="mt-1 text-base font-semibold text-slate-900">{project.name}</h2></div><StatusBadge tone={project.status === "active" ? "green" : "amber"}>{project.status}</StatusBadge></div>
										<p className="mt-3 text-sm leading-6 text-slate-600">{project.description}</p>
										<div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><span>{project.members.toLocaleString()} members</span><span>{project.region}</span></div>
										<div className="mt-4 flex justify-end"><button type="button" className={secondaryButton} onClick={() => { void toggleProject(project); }}>{project.status === "active" ? "Pause project" : "Resume project"}</button></div>
									</article>
								))}
							</div>
						</>
					)}

					{section === "users" && (
						<>
							<PageHeading title="User directory" description="Search community members and manage account access." />
							<label className="mb-5 flex h-12 max-w-lg items-center gap-3 rounded-xl border border-[#E2E8F1] bg-white px-4">
								<IconSearch size={19} stroke={1.8} className="shrink-0 text-slate-500" />
								<input
									value={userQuery}
									onChange={(event) => setUserQuery(event.target.value)}
									placeholder="Search name, email, location"
									aria-label="Search users by name, email, or location"
									className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1C1C1C] outline-none ring-0 placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0"
								/>
							</label>
							<div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[900px] border-collapse text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Member", "Role", "Location", "Status", "Verification", "Action"].map((label) => <th key={label} className="px-5 py-4">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredUsers.map((user) => <tr key={user.id} className="transition-colors hover:bg-slate-50"><td className="px-5 py-4"><p className="text-[#1C1C1C]">{user.name}</p><p className="mt-1 text-xs text-slate-500">{user.email}</p></td><td className="px-5 py-4 text-slate-600">{user.type}</td><td className="px-5 py-4 text-slate-600">{user.location}</td><td className="px-5 py-4"><StatusBadge tone={user.status === "active" ? "green" : "red"}>{user.status}</StatusBadge></td><td className="px-5 py-4"><StatusBadge tone={user.verified ? "green" : "neutral"}>{user.verified ? "Verified" : "Unverified"}</StatusBadge></td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button type="button" className={secondaryButton} onClick={() => { void toggleUserVerification(user); }}>{user.verified ? "Unverify" : "Verify"}</button><button type="button" className={secondaryButton} onClick={() => { void toggleUser(user); }}>{user.status === "active" ? "Suspend" : "Restore"}</button></div></td></tr>)}</tbody></table>{filteredUsers.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No users match that search.</p>}</div>
						</>
					)}

					{section === "verifications" && (
						<>
							<PageHeading title="Provider verification" description="Review identity and licensing details before providers appear in search." />
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								{requests.map((request) => <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-[#1C1C1C]">{request.name}</h2><p className="mt-1 text-sm text-slate-500">{request.category} · {request.location}{request.countryCode ? ` · ${request.countryCode}` : ""}</p><p className="mt-1 text-sm text-slate-500">{request.email || "No email provided"}</p></div><StatusBadge tone={request.status === "pending" ? "amber" : "neutral"}>{request.status === "pending" ? "Pending" : "Needs info"}</StatusBadge></div>								<dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><div><dt className="text-xs text-slate-500">License</dt><dd className="mt-1 text-[#1C1C1C]">{request.license || "Not provided"}</dd></div><div><dt className="text-xs text-slate-500">Submission</dt><dd className="mt-1 flex items-center gap-1 text-[#1C1C1C]"><IconCheck size={15} /> {request.license ? "License submitted" : "License not provided"}</dd></div></dl><div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => { void runAction("admin/providers/status", { id: request.id, status: "needs-info" }); }}>Request info</button><button type="button" className={primaryButton} onClick={() => { void approveRequest(request); }}><IconCheck size={16} /> Approve</button></div></article>)}
								{requests.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">All provider applications have been reviewed.</div>}
							</div>
						</>
					)}

					{section === "reviews" && (
						<>
							<PageHeading title="Provider reviews" description="Approve reviews from clients with completed appointments before they appear publicly." />
							<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
								{pendingReviews.map((review) => (
									<article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-6">
										<div className="flex items-start justify-between gap-3">
											<div>
												<h2 className="text-[#1C1C1C]">{review.providerName}</h2>
												<p className="mt-1 text-sm text-slate-500">By {review.reviewerName} · {review.rating}/5 stars</p>
											</div>
											<StatusBadge tone="amber">Pending</StatusBadge>
										</div>
										<p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{review.text}</p>
										<div className="mt-5 flex justify-end gap-2">
											<button type="button" className={secondaryButton} onClick={() => { void moderateReview(review, "reject").catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Unable to reject review.")); }}>Reject</button>
											<button type="button" className={primaryButton} onClick={() => { void moderateReview(review, "approve").catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Unable to approve review.")); }}><IconCheck size={16} /> Approve</button>
										</div>
									</article>
								))}
								{pendingReviews.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">The review moderation queue is clear.</div>}
							</div>
						</>
					)}

					{section === "reports" && (
						<>
							<PageHeading title="Content reports" description="Review flagged posts and record moderation decisions." />
							<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
								{reports.map((report) => <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">Reported by {report.reportedBy} · {report.time}</p><h2 className="mt-2 text-[#1C1C1C]">{report.author}</h2></div><StatusBadge tone="amber">{report.reason}</StatusBadge></div><p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{report.excerpt}</p><div className="mt-5 flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => acknowledgeReport(report, false)}>Dismiss</button><button type="button" className={`${secondaryButton} border-rose-200`} onClick={() => acknowledgeReport(report, true)}><IconTrash size={15} /> Remove post</button></div></article>)}
								{reports.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">The moderation queue is clear.</div>}
							</div>
						</>
					)}

					{section === "data" && (
						<>
							<PageHeading title="Database records" description="Read-only view of application records. Access is recorded for auditing; credentials, tokens, and secrets are never shown." />
							<div className="mb-5 flex flex-wrap items-end gap-3">
								<label className="min-w-64 text-xs font-medium text-slate-600">
									Record type
									<select
										value={dataResource}
										onChange={(event) => {
											const selected = adminDataResources.find((resource) => resource.id === event.target.value);
											if (!selected) return;
											setDataResource(selected.id);
											setDataPage(1);
											setDataResult(null);
											setDataLoading(true);
											setDataError("");
										}}
										className={`${fieldStyle} mt-1`}
									>
										{adminDataResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.label}</option>)}
									</select>
								</label>
								<p className="text-sm text-slate-500">
									{dataResult ? `${dataResult.total.toLocaleString()} records` : "Records load when a type is selected."}
								</p>
							</div>
							{dataError && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{dataError}</div>}
							{dataLoading && <p role="status" className="mb-4 text-sm text-slate-500">Loading records…</p>}
							{dataResult && dataResult.records.length > 0 && (
								<div className="space-y-3">
									{dataResult.records.map((record) => {
										const title = ["name", "title", "petName", "applicantName", "providerName", "email", "id"]
											.map((key) => record[key])
											.find((value): value is string => typeof value === "string" && value.length > 0) ?? "Record";
										return (
											<details key={String(record.id ?? title)} className="rounded-xl border border-slate-200 bg-white p-4">
												<summary className="cursor-pointer break-all text-sm font-medium">{title}</summary>
												<pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5">
													{JSON.stringify(record, null, 2)}
												</pre>
											</details>
										);
									})}
								</div>
							)}
							{dataResult && dataResult.records.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No records in this collection.</p>}
							{dataResult && dataResult.total > dataResult.pageSize && (
								<div className="mt-5 flex items-center justify-between gap-3">
									<button type="button" className={secondaryButton} disabled={dataPage <= 1 || dataLoading} onClick={() => { setDataResult(null); setDataLoading(true); setDataPage((page) => page - 1); }}>Previous</button>
									<span className="text-sm text-slate-500">Page {dataResult.page} of {Math.max(1, Math.ceil(dataResult.total / dataResult.pageSize))}</span>
									<button type="button" className={secondaryButton} disabled={dataPage * dataResult.pageSize >= dataResult.total || dataLoading} onClick={() => { setDataResult(null); setDataLoading(true); setDataPage((page) => page + 1); }}>Next</button>
								</div>
							)}
						</>
					)}

					{section === "team" && (
						<>
							<PageHeading title="Admin team" description="Review staff access and permissions." action={<button type="button" className={primaryButton} onClick={() => navigate("/admin/create")}><IconPlus size={16} /> Create admin user</button>} />
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
								{team.map((member) => (
									<article key={member.id} className="flex min-h-[320px] flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-7 text-center">
										{member.avatar
											? <img src={member.avatar} alt={member.name} className="size-20 rounded-2xl border border-slate-200 object-cover" />
											: <div className="grid size-20 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600"><IconShieldLock size={34} /></div>}
										<div className="mt-4 w-full min-w-0">
											<h2 className="truncate text-base font-semibold text-slate-900">{member.name}</h2>
											<p className="mt-1 break-all text-sm text-slate-600">{member.email}</p>
										</div>
										<span className="mt-4 inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800">
											{member.role === "superadmin" ? "Superadmin" : "Admin"}
										</span>
										<div className="mt-4"><StatusBadge tone={member.status === "active" ? "green" : "red"}>{member.status}</StatusBadge></div>
										<button type="button" className={`${secondaryButton} mt-auto`} disabled={member.role === "superadmin"} title={member.role === "superadmin" ? "The configured superadmin cannot be suspended here." : undefined} onClick={() => { void runAction("admin/accounts/status", { email: member.email, status: member.status === "active" ? "suspended" : "active" }); }}>
												{member.role === "superadmin" ? "Protected" : member.status === "active" ? "Suspend" : "Restore"}
											</button>
									</article>
								))}
								{team.length === 0 && <p className="col-span-full rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No admin accounts are available.</p>}
							</div>
						</>
					)}

						</main>

						<aside aria-label="Active platform users" className="sticky top-0 hidden h-screen min-h-screen w-[400px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-slate-300 bg-white px-4 py-5 2xl:flex">
							<div className="grid grid-cols-2 gap-3 border-b border-slate-200 pb-5">
								<div className="flex min-h-[142px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm text-slate-600">Total users</p>
										<span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#1C1C1C]"><IconUsers size={18} stroke={1.7} /></span>
									</div>
									<div>
										<p className="text-3xl leading-none tracking-tight text-[#1C1C1C]">{users.length.toLocaleString()}</p>
										<p className="mt-2 text-xs text-slate-500">Registered accounts</p>
									</div>
								</div>
								<div className="flex min-h-[142px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm text-slate-600">Active users</p>
										<span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#1C1C1C]"><IconActivity size={18} stroke={1.7} /></span>
									</div>
									<div>
										<p className="text-3xl leading-none tracking-tight text-[#1C1C1C]">{activeUsers.toLocaleString()}</p>
										<p className="mt-2 text-xs text-slate-500">Currently active</p>
									</div>
								</div>
							</div>
							<div className="flex items-center justify-between py-2">
								<div>
									<h2 className="text-base font-semibold text-slate-900">Active accounts</h2>
									<p className="mt-1 text-[14px] text-slate-600">Registered users with active status</p>
								</div>
								<span className="rounded-full border border-slate-300 px-2.5 py-1 text-[14px] text-slate-900">{activeUserProfiles.length}</span>
							</div>
							{activeUserProfiles.map((user) => (
								<article key={user.id} className="shrink-0 rounded-2xl border border-slate-200 bg-white p-5 text-center">
									<div className="relative mx-auto w-fit">
										<img src={user.avatar} alt={user.name} className="size-16 rounded-full border border-slate-300 object-cover" />
										<span aria-label="Active account" className="absolute bottom-0 right-0 size-4 rounded-full border-2 border-white bg-emerald-500" />
									</div>
									<h3 className="mt-3 truncate text-sm font-semibold text-slate-900">{user.name}</h3>
									<p className="mt-1 break-all text-[14px] text-slate-600">{user.email}</p>
									<div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-[14px] text-slate-900">
										<span className="size-2 rounded-full bg-emerald-500" />
										Active
									</div>
								</article>
							))}
						</aside>
					</div>
				</div>
			</div>
		</div>
	);
}
