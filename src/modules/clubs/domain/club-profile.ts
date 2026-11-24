import { InvalidColorError, InvalidSocialLinkError } from "./errors";

/** What players see of a club: everything editable in its profile except slug and logo. */
export interface ClubProfileProps {
  name: string;
  description: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/;

const SOCIAL_HOSTS = {
  instagram: ["instagram.com", "www.instagram.com"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
} as const;

type SocialNetwork = keyof typeof SOCIAL_HOSTS;

/** Validates colors and social links; returns the profile with them normalized. */
export function validateClubProfile(props: ClubProfileProps): ClubProfileProps {
  return {
    ...props,
    primaryColor: normalizeColor(props.primaryColor),
    secondaryColor: normalizeColor(props.secondaryColor),
    instagramUrl: normalizeSocialLink("instagram", props.instagramUrl),
    tiktokUrl: normalizeSocialLink("tiktok", props.tiktokUrl),
  };
}

function normalizeColor(raw: string | null): string | null {
  if (raw === null) return null;
  const color = raw.trim().toLowerCase();
  if (!HEX_COLOR.test(color)) throw new InvalidColorError(raw);
  return color;
}

/** Accepts "https://instagram.com/club" or "instagram.com/club"; it must point to a profile. */
function normalizeSocialLink(network: SocialNetwork, raw: string | null): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  const url = parseUrl(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  const hosts: readonly string[] = SOCIAL_HOSTS[network];
  if (!url || !hosts.includes(url.hostname) || url.pathname.length <= 1) {
    throw new InvalidSocialLinkError(network, raw);
  }
  url.protocol = "https:";
  return url.href;
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
