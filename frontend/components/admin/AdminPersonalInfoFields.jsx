import ProfilePersonalInfoFields from "@/components/profile/ProfilePersonalInfoFields";

export default function AdminPersonalInfoFields(props) {
  return <ProfilePersonalInfoFields {...props} variant="admin" showAvatarUrl={props.showAvatarUrl ?? true} />;
}
