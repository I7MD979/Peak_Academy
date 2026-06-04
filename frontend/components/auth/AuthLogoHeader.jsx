import PeakLogo from "@/components/shared/PeakLogo";

export default function AuthLogoHeader() {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <PeakLogo theme="light" subtitle="وصّل للقمة" className="flex-col items-center gap-3 sm:flex-row" />
    </div>
  );
}
