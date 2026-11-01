import { ProfileForm } from "@/components/account/profile-form";
import { getProfile } from "@/lib/supabase/server";

export const metadata = { title: "Account settings" };

export default async function SettingsPage() {
  const profile = await getProfile();
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
      <p className="text-sm text-muted-foreground">
        To change your email or delete your account, please contact us from the address on your account.
      </p>
    </div>
  );
}
