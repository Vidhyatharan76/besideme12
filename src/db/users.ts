import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to upsert user record:', error);
    throw new Error('Unable to save user profile.', { cause: error });
  }
}

export async function updateUserLanguages(
  uid: string,
  preferredLanguage?: string,
  localLanguage?: string,
) {
  try {
    const patch: {
      preferredLanguage?: string;
      localLanguage?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };
    if (preferredLanguage) {
      patch.preferredLanguage = preferredLanguage;
    }
    if (localLanguage) {
      patch.localLanguage = localLanguage;
    }

    await db.update(users).set(patch).where(eq(users.uid, uid));
  } catch (error) {
    console.error('Failed to update user languages:', error);
    throw new Error('Unable to save language preference.', { cause: error });
  }
}

export interface UserProfilePatch {
  displayName?: string | null;
  preferredLanguage?: string;
  localLanguage?: string;
  familyRole?: string;
  focusVisits?: string[];
  onboardingCompleted?: boolean;
}

export async function updateUserProfile(uid: string, patch: UserProfilePatch) {
  try {
    const updateSet: {
      displayName?: string | null;
      preferredLanguage?: string;
      localLanguage?: string;
      familyRole?: string;
      focusVisits?: string;
      onboardingCompleted?: boolean;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (patch.displayName !== undefined) {
      updateSet.displayName = patch.displayName;
    }
    if (patch.preferredLanguage) {
      updateSet.preferredLanguage = patch.preferredLanguage;
    }
    if (patch.localLanguage) {
      updateSet.localLanguage = patch.localLanguage;
    }
    if (patch.familyRole) {
      updateSet.familyRole = patch.familyRole;
    }
    if (patch.focusVisits !== undefined) {
      updateSet.focusVisits = JSON.stringify(patch.focusVisits);
    }
    if (typeof patch.onboardingCompleted === 'boolean') {
      updateSet.onboardingCompleted = patch.onboardingCompleted;
    }

    await db.update(users).set(updateSet).where(eq(users.uid, uid));
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw new Error('Unable to save profile settings.', { cause: error });
  }
}
