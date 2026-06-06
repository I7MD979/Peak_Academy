import PeakLogo from "@/components/shared/PeakLogo";

export default function AuthLogoHeader() {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <PeakLogo variant="full" subtitle="وصّل للقمة" className="items-center" priority />
    </div>
  );
}
