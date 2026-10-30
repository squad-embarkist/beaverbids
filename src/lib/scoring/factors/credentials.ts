import { certificationCodesFor, type CertificationCode, type Requirements } from "../requirements";
import { FACTOR_MAX, clampPoints, type FactorResult, type ScoringProfile } from "../types";

// Credentials, 10 points: certifications and past work asked for.
//   certificationPoints  7  the profile holds one of the certifications the
//                           text names (they are usually alternatives), or
//                           none are named
//   experiencePoints     3  no references asked for; 2 when they are and the
//                           profile describes its work; 0 when it does not

export const CREDENTIALS_SPLIT = { certification: 7, experience: 3 } as const;

export type CredentialsFacts = {
  requiredCertifications: CertificationCode[];
  heldCertifications: CertificationCode[];
  certificationStatus: "none-required" | "held" | "missing";
  referencesRequired: boolean;
  hasDescription: boolean;
  certificationPoints: number;
  experiencePoints: number;
};

export type CredentialsResult = FactorResult<CredentialsFacts>;

export function scoreCredentials(profile: ScoringProfile, requirements: Requirements): CredentialsResult {
  const requiredCertifications = requirements.certifications;
  const profileCodes = new Set(profile.certifications.flatMap(certificationCodesFor));
  const heldCertifications = requiredCertifications.filter((code) => profileCodes.has(code));

  const certificationStatus: CredentialsFacts["certificationStatus"] =
    requiredCertifications.length === 0 ? "none-required" : heldCertifications.length > 0 ? "held" : "missing";
  const certificationPoints = certificationStatus === "missing" ? 0 : CREDENTIALS_SPLIT.certification;

  const hasDescription = Boolean(profile.description?.trim());
  const experiencePoints = !requirements.referencesRequired ? CREDENTIALS_SPLIT.experience : hasDescription ? 2 : 0;

  return {
    points: clampPoints(certificationPoints + experiencePoints, FACTOR_MAX.credentials),
    max: FACTOR_MAX.credentials,
    facts: {
      requiredCertifications,
      heldCertifications,
      certificationStatus,
      referencesRequired: requirements.referencesRequired,
      hasDescription,
      certificationPoints,
      experiencePoints,
    },
  };
}
