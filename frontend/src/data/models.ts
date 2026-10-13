export type Pet = {
  id: string;
  name: string;
  breed: string;
  age: string;
  image: string;
};

export type Provider = {
  id: string;
  name: string;
  type: string;
  rating: string;
  location: string;
  countryCode: string;
  image: string;
  price: string;
  verified?: boolean;
  verificationStatus?: "not_started" | "pending" | "verified";
};

export type FeedPost = {
  id: string;
  userId?: string;
  name: string;
  handle: string;
  pet?: string;
  time: string;
  createdAt?: string;
  text: string;
  image?: string;
  imageAlt?: string;
  video?: string;
  mediaItems?: { url: string; type: string; name: string }[];
  likes: number;
  reshares?: number;
  comments: number;
  commentItems?: FeedComment[];
  liked?: boolean;
  reshared?: boolean;
  avatar: string;
  provider?: boolean;
  verified?: boolean;
};

export type FeedComment = {
  id: string;
  userId: string;
  name: string;
  handle: string;
  avatar: string;
  text: string;
  createdAt: string;
};

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "NO_SHOW";

export type Appointment = {
  id: string;
  petId: string;
  petName: string;
  petBreed: string;
  ownerName: string;
  ownerId?: string;
  ownerAvatar: string;
  providerId: string;
  providerName: string;
  service: string;
  professional: string;
  date: string;
  time: string;
  scheduledAt?: string;
  duration: string;
  price: number;
  status: AppointmentStatus;
  notes?: string;
};
